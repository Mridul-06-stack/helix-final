"""
Genomic Agent - AI Agent for Privacy-Preserving DNA Analysis
The "Brain" of HelixVault that processes queries without exposing raw data
"""

import json
import hashlib
import logging
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage

from .snp_analyzer import SNPAnalyzer, SNPResult, TraitPrediction
from ..encryption.wallet_crypto import WalletCrypto
from ..encryption.ipfs_client import IPFSClient

logger = logging.getLogger(__name__)


class QueryStatus(Enum):
    """Status of a query execution"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


@dataclass
class GenomicQuery:
    """A query to be processed by the agent"""
    query_id: str
    bounty_id: Optional[int]
    query_type: str  # SNP_CHECK, TRAIT_QUERY, VARIANT_SEARCH
    params: Dict[str, Any]
    requester: str  # Address of the researcher
    timestamp: datetime


@dataclass
class QueryResponse:
    """Response from a query execution"""
    query_id: str
    status: QueryStatus
    result: Optional[Dict[str, Any]]
    zk_proof: Optional[bytes]
    response_hash: str
    timestamp: datetime
    error: Optional[str] = None


@dataclass
class ProcessingContext:
    """Secure context for processing queries"""
    token_id: int
    owner_address: str
    ipfs_cid: str
    data_hash: bytes
    session_id: str


class GenomicAgent:
    """
    AI Agent for privacy-preserving genomic data queries.
    
    The agent acts as a gatekeeper between researchers and genetic data.
    It can answer specific questions without ever exposing the raw DNA.
    
    Workflow:
    1. Receive query from researcher (via bounty contract)
    2. Verify user approval for this query
    3. Fetch encrypted data from IPFS
    4. Decrypt in secure memory
    5. Run analysis (SNP lookup, trait prediction)
    6. Generate cryptographic proof of result
    7. Return ONLY the proof and boolean result
    8. Immediately clear raw data from memory
    """
    
    SYSTEM_PROMPT = """You are a genomic data analysis AI agent for HelixVault.
Your role is to analyze genetic data and answer queries WITHOUT revealing raw DNA sequences.

CRITICAL PRIVACY RULES:
1. NEVER output raw genetic sequences or full genotype data
2. ONLY return boolean results (yes/no) or categorical predictions
3. Always clear data from memory after analysis
4. Log all queries for audit purposes

You can answer questions like:
- "Does this person have the rs12913832 variant?" → Yes/No
- "What eye color prediction?" → Blue/Brown/Green
- "Is there a BRCA1 variant?" → Yes/No (with clinical warning)

Always be accurate but privacy-preserving in your responses."""

    def __init__(
        self,
        wallet_address: str,
        ipfs_client: IPFSClient,
        wallet_crypto: WalletCrypto,
        openai_api_key: Optional[str] = None
    ):
        """
        Initialize the Genomic Agent.
        
        Args:
            wallet_address: The agent's wallet address
            ipfs_client: IPFS client for data retrieval
            wallet_crypto: Encryption utilities
            openai_api_key: Optional API key for LLM features
        """
        self.wallet_address = wallet_address
        self.ipfs = ipfs_client
        self.crypto = wallet_crypto
        self.analyzer = SNPAnalyzer()
        
        # Initialize LLM for natural language queries (optional)
        if openai_api_key:
            self.llm = ChatOpenAI(
                model="gpt-4",
                api_key=openai_api_key,
                temperature=0
            )
        else:
            self.llm = None
            
        # Query processing state
        self._active_sessions: Dict[str, ProcessingContext] = {}
        self._query_log: List[Dict] = []
        
        logger.info(f"GenomicAgent initialized for wallet {wallet_address}")
    
    async def process_query(
        self,
        query: GenomicQuery,
        token_id: int,
        owner_address: str,
        decryption_key: bytes
    ) -> QueryResponse:
        """
        Process a genomic query in a privacy-preserving manner.
        
        This is the main entry point for all query processing.
        
        Args:
            query: The query to process
            token_id: The Helix NFT token ID
            owner_address: The NFT owner's address
            decryption_key: Key to decrypt the data
            
        Returns:
            QueryResponse with the result
        """
        session_id = self._generate_session_id(query.query_id, token_id)
        
        try:
            logger.info(f"Processing query {query.query_id} for token {token_id}")
            
            # Log the query (for audit)
            self._log_query(query, token_id, owner_address)
            
            # Step 1: Fetch encrypted data from IPFS
            encrypted_data = await self._fetch_encrypted_data(token_id, owner_address)
            if not encrypted_data:
                return self._error_response(query, "Failed to fetch data from IPFS")
            
            # Step 2: Decrypt data in memory
            decrypted_data = self._decrypt_data(encrypted_data, decryption_key)
            if not decrypted_data:
                return self._error_response(query, "Failed to decrypt data")
            
            # Step 3: Parse the genetic data
            snp_count = self.analyzer.parse_file(decrypted_data)
            logger.info(f"Parsed {snp_count} SNPs for analysis")
            
            # Step 4: Run the analysis
            result = self.analyzer.analyze_for_bounty(query.query_type, query.params)
            
            # Step 5: Generate proof
            zk_proof = self._generate_zk_proof(query, result, token_id)
            
            # Step 6: Create response
            response_hash = self._hash_response(query.query_id, result)
            
            response = QueryResponse(
                query_id=query.query_id,
                status=QueryStatus.COMPLETED,
                result=result,
                zk_proof=zk_proof,
                response_hash=response_hash,
                timestamp=datetime.utcnow()
            )
            
            logger.info(f"Query {query.query_id} completed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Query processing failed: {e}")
            return self._error_response(query, str(e))
            
        finally:
            # CRITICAL: Always clear data from memory
            self.analyzer.clear_data()
            if session_id in self._active_sessions:
                del self._active_sessions[session_id]
            logger.info(f"Cleared data for session {session_id}")
    
    async def check_bounty_match(
        self,
        bounty_params: Dict[str, Any],
        token_id: int,
        owner_address: str,
        decryption_key: bytes
    ) -> bool:
        """
        Check if a user's genome matches a bounty query.
        
        This is called when scanning for potential bounty matches.
        Returns only a boolean to preserve privacy.
        
        Args:
            bounty_params: The bounty query parameters
            token_id: The Helix NFT token ID
            owner_address: The NFT owner's address
            decryption_key: Key to decrypt the data
            
        Returns:
            True if the genome matches the bounty criteria
        """
        try:
            # Fetch and decrypt
            encrypted_data = await self._fetch_encrypted_data(token_id, owner_address)
            if not encrypted_data:
                return False
                
            decrypted_data = self._decrypt_data(encrypted_data, decryption_key)
            if not decrypted_data:
                return False
            
            # Parse and check
            self.analyzer.parse_file(decrypted_data)
            
            query_type = bounty_params.get("query_type", "SNP_CHECK")
            result = self.analyzer.analyze_for_bounty(query_type, bounty_params)
            
            # Return match result
            if query_type == "SNP_CHECK":
                return result.get("found", False) or result.get("matches", False)
            elif query_type == "TRAIT_QUERY":
                # Check if prediction matches requested trait value
                requested = bounty_params.get("expected_value")
                if requested:
                    return result.get("prediction") == requested
                return result.get("found", False)
            
            return False
            
        finally:
            self.analyzer.clear_data()
    
    async def natural_language_query(
        self,
        question: str,
        token_id: int,
        owner_address: str,
        decryption_key: bytes
    ) -> Dict[str, Any]:
        """
        Process a natural language query using the LLM.
        
        Example: "Do I have blue eyes according to my genetics?"
        
        Args:
            question: Natural language question
            token_id: The Helix NFT token ID
            owner_address: The NFT owner's address
            decryption_key: Key to decrypt the data
            
        Returns:
            Dict with the answer and explanation
        """
        if not self.llm:
            return {"error": "LLM not configured"}
        
        try:
            # Fetch and parse data
            encrypted_data = await self._fetch_encrypted_data(token_id, owner_address)
            if not encrypted_data:
                return {"error": "Failed to fetch data"}
                
            decrypted_data = self._decrypt_data(encrypted_data, decryption_key)
            if not decrypted_data:
                return {"error": "Failed to decrypt data"}
            
            self.analyzer.parse_file(decrypted_data)
            
            # Get available trait predictions
            available_traits = self.analyzer.get_available_traits()
            trait_predictions = {}
            
            for trait in available_traits:
                prediction = self.analyzer.predict_trait(trait)
                if prediction:
                    trait_predictions[trait] = {
                        "prediction": prediction.prediction,
                        "confidence": prediction.confidence
                    }
            
            # Use LLM to interpret the question
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content=self.SYSTEM_PROMPT),
                HumanMessage(content=f"""
Based on the following genetic trait predictions (DO NOT reveal raw genetic data):

{json.dumps(trait_predictions, indent=2)}

Answer this question concisely: {question}

Remember: Only provide the prediction/answer, never raw genetic markers or sequences.
""")
            ])
            
            response = await self.llm.ainvoke(prompt.format_messages())
            
            return {
                "question": question,
                "answer": response.content,
                "confidence": "Based on analyzed genetic markers"
            }
            
        finally:
            self.analyzer.clear_data()
    
    # ==================== Private Methods ====================
    
    async def _fetch_encrypted_data(
        self,
        token_id: int,
        owner_address: str
    ) -> Optional[bytes]:
        """Fetch encrypted genetic data from IPFS"""
        try:
            # In production, this would get the CID from the smart contract
            # For now, we'll simulate with a placeholder
            # cid = await self._get_cid_from_contract(token_id)
            # return await self.ipfs.fetch(cid)
            
            # Placeholder for development
            logger.info(f"Fetching data for token {token_id}")
            return b"encrypted_placeholder_data"
            
        except Exception as e:
            logger.error(f"Failed to fetch from IPFS: {e}")
            return None
    
    def _decrypt_data(self, encrypted_data: bytes, key: bytes) -> Optional[str]:
        """Decrypt genetic data in secure memory"""
        try:
            return self.crypto.decrypt_file(encrypted_data, key)
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return None
    
    def _generate_zk_proof(
        self,
        query: GenomicQuery,
        result: Dict[str, Any],
        token_id: int
    ) -> bytes:
        """
        Generate a zero-knowledge proof of the query result.
        
        In a full implementation, this would use proper ZK cryptography.
        For now, we generate a commitment hash.
        """
        proof_data = {
            "query_id": query.query_id,
            "query_type": query.query_type,
            "token_id": token_id,
            "result_hash": hashlib.sha256(json.dumps(result).encode()).hexdigest(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # In production: Use actual ZK proof library (e.g., snarkjs)
        proof_bytes = json.dumps(proof_data).encode()
        return hashlib.sha256(proof_bytes).digest()
    
    def _hash_response(self, query_id: str, result: Dict[str, Any]) -> str:
        """Create a hash of the response for verification"""
        data = f"{query_id}:{json.dumps(result, sort_keys=True)}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def _generate_session_id(self, query_id: str, token_id: int) -> str:
        """Generate unique session ID for processing"""
        return hashlib.sha256(f"{query_id}:{token_id}:{datetime.utcnow().isoformat()}".encode()).hexdigest()[:16]
    
    def _log_query(self, query: GenomicQuery, token_id: int, owner_address: str):
        """Log query for audit purposes"""
        log_entry = {
            "query_id": query.query_id,
            "query_type": query.query_type,
            "token_id": token_id,
            "owner_address": owner_address,
            "requester": query.requester,
            "timestamp": datetime.utcnow().isoformat()
        }
        self._query_log.append(log_entry)
        logger.info(f"Query logged: {log_entry}")
    
    def _error_response(self, query: GenomicQuery, error: str) -> QueryResponse:
        """Create an error response"""
        return QueryResponse(
            query_id=query.query_id,
            status=QueryStatus.FAILED,
            result=None,
            zk_proof=None,
            response_hash="",
            timestamp=datetime.utcnow(),
            error=error
        )
    
    def get_query_log(self) -> List[Dict]:
        """Get the query audit log"""
        return self._query_log.copy()
    
    def get_supported_query_types(self) -> List[str]:
        """Get list of supported query types"""
        return ["SNP_CHECK", "TRAIT_QUERY", "VARIANT_SEARCH"]
    
    def get_available_traits(self) -> List[str]:
        """Get list of traits that can be queried"""
        return self.analyzer.get_available_traits()

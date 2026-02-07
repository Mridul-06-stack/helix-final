"""
ZK Responder - Zero-Knowledge Proof Generation for Query Responses
Generates cryptographic proofs of query results without revealing data
"""

import hashlib
import hmac
import json
import secrets
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ProofType(Enum):
    """Types of zero-knowledge proofs"""
    COMMITMENT = "commitment"       # Simple hash commitment
    RANGE = "range"                 # Prove value is in range without revealing
    MEMBERSHIP = "membership"       # Prove membership in a set
    BOOLEAN = "boolean"             # Prove boolean result


@dataclass
class ZKProof:
    """Zero-knowledge proof structure"""
    proof_type: str
    commitment: bytes          # Hash commitment to the result
    challenge: bytes           # Random challenge
    response: bytes            # Response to the challenge
    public_inputs: Dict[str, Any]  # Public parts (query type, token ID, etc.)
    timestamp: str
    version: int = 1
    
    def to_bytes(self) -> bytes:
        """Serialize proof to bytes"""
        data = {
            "proof_type": self.proof_type,
            "commitment": self.commitment.hex(),
            "challenge": self.challenge.hex(),
            "response": self.response.hex(),
            "public_inputs": self.public_inputs,
            "timestamp": self.timestamp,
            "version": self.version
        }
        return json.dumps(data).encode('utf-8')
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'ZKProof':
        """Deserialize proof from bytes"""
        parsed = json.loads(data.decode('utf-8'))
        return cls(
            proof_type=parsed["proof_type"],
            commitment=bytes.fromhex(parsed["commitment"]),
            challenge=bytes.fromhex(parsed["challenge"]),
            response=bytes.fromhex(parsed["response"]),
            public_inputs=parsed["public_inputs"],
            timestamp=parsed["timestamp"],
            version=parsed.get("version", 1)
        )
    
    def to_hex(self) -> str:
        """Convert proof to hex string for smart contract"""
        return self.to_bytes().hex()


@dataclass
class ProofVerification:
    """Result of proof verification"""
    valid: bool
    proof_type: str
    public_inputs: Dict[str, Any]
    verification_time: str
    error: Optional[str] = None


class ZKResponder:
    """
    Generates zero-knowledge proofs for genomic query responses.
    
    The goal is to prove that:
    1. We actually ran the query on real data
    2. The result is correct
    3. Without revealing the underlying genetic data
    
    Note: This is a simplified commitment scheme. For production,
    you would use proper ZK-SNARK libraries like snarkjs or circom.
    """
    
    # Secret key for HMAC (in production, this would be securely managed)
    # Each agent instance should have its own key
    _agent_secret: bytes = secrets.token_bytes(32)
    
    def __init__(self, agent_id: str):
        """
        Initialize the ZK responder.
        
        Args:
            agent_id: Unique identifier for this agent (wallet address)
        """
        self.agent_id = agent_id
        # Derive agent-specific secret
        self._secret = hashlib.sha256(
            self._agent_secret + agent_id.encode()
        ).digest()
        
    def generate_boolean_proof(
        self,
        result: bool,
        query_id: str,
        token_id: int,
        query_params: Dict[str, Any]
    ) -> ZKProof:
        """
        Generate a proof for a boolean query result.
        
        This proves that we computed a yes/no answer without
        revealing the genetic data that led to that answer.
        
        Args:
            result: The boolean result (True/False)
            query_id: Unique query identifier
            token_id: The NFT token ID
            query_params: The query parameters (public)
            
        Returns:
            ZKProof that can be verified
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Create commitment to the result
        # commitment = H(result || query_id || token_id || secret)
        commitment_data = self._create_commitment_data(
            str(result).lower(),
            query_id,
            token_id,
            timestamp
        )
        commitment = hashlib.sha256(commitment_data).digest()
        
        # Generate challenge (random)
        challenge = secrets.token_bytes(32)
        
        # Create response (proves we know the secret)
        # response = HMAC(secret, commitment || challenge)
        response = hmac.new(
            self._secret,
            commitment + challenge,
            hashlib.sha256
        ).digest()
        
        public_inputs = {
            "query_id": query_id,
            "token_id": token_id,
            "query_type": query_params.get("query_type", "unknown"),
            "result": result,  # The boolean result IS public
            "agent_id": self.agent_id
        }
        
        return ZKProof(
            proof_type=ProofType.BOOLEAN.value,
            commitment=commitment,
            challenge=challenge,
            response=response,
            public_inputs=public_inputs,
            timestamp=timestamp
        )
    
    def generate_trait_proof(
        self,
        trait: str,
        prediction: str,
        confidence: float,
        query_id: str,
        token_id: int
    ) -> ZKProof:
        """
        Generate a proof for a trait prediction.
        
        Args:
            trait: The trait queried
            prediction: The predicted value
            confidence: Confidence score
            query_id: Unique query identifier
            token_id: The NFT token ID
            
        Returns:
            ZKProof for the trait prediction
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Commitment includes the prediction
        commitment_data = self._create_commitment_data(
            f"{trait}:{prediction}:{confidence:.2f}",
            query_id,
            token_id,
            timestamp
        )
        commitment = hashlib.sha256(commitment_data).digest()
        
        challenge = secrets.token_bytes(32)
        
        response = hmac.new(
            self._secret,
            commitment + challenge,
            hashlib.sha256
        ).digest()
        
        public_inputs = {
            "query_id": query_id,
            "token_id": token_id,
            "query_type": "TRAIT_QUERY",
            "trait": trait,
            "prediction": prediction,
            "confidence": confidence,
            "agent_id": self.agent_id
        }
        
        return ZKProof(
            proof_type=ProofType.COMMITMENT.value,
            commitment=commitment,
            challenge=challenge,
            response=response,
            public_inputs=public_inputs,
            timestamp=timestamp
        )
    
    def generate_variant_count_proof(
        self,
        searched_variants: int,
        found_count: int,
        query_id: str,
        token_id: int
    ) -> ZKProof:
        """
        Generate a range proof for variant count.
        
        Proves that X out of Y variants were found, without
        revealing which specific variants.
        
        Args:
            searched_variants: Total variants searched
            found_count: Number found
            query_id: Query identifier
            token_id: Token ID
            
        Returns:
            ZKProof for the count
        """
        timestamp = datetime.utcnow().isoformat()
        
        commitment_data = self._create_commitment_data(
            f"count:{found_count}:{searched_variants}",
            query_id,
            token_id,
            timestamp
        )
        commitment = hashlib.sha256(commitment_data).digest()
        
        challenge = secrets.token_bytes(32)
        
        response = hmac.new(
            self._secret,
            commitment + challenge,
            hashlib.sha256
        ).digest()
        
        public_inputs = {
            "query_id": query_id,
            "token_id": token_id,
            "query_type": "VARIANT_SEARCH",
            "searched_count": searched_variants,
            "found_count": found_count,
            "agent_id": self.agent_id
        }
        
        return ZKProof(
            proof_type=ProofType.RANGE.value,
            commitment=commitment,
            challenge=challenge,
            response=response,
            public_inputs=public_inputs,
            timestamp=timestamp
        )
    
    def verify_proof(self, proof: ZKProof) -> ProofVerification:
        """
        Verify a ZK proof.
        
        Note: This verifies structural integrity and that the proof
        came from a valid agent. The commitment proves the agent
        computed a specific result.
        
        Args:
            proof: The proof to verify
            
        Returns:
            ProofVerification result
        """
        try:
            # Check timestamp is not too old (prevent replay)
            proof_time = datetime.fromisoformat(proof.timestamp)
            age = (datetime.utcnow() - proof_time).total_seconds()
            
            if age > 3600:  # 1 hour max
                return ProofVerification(
                    valid=False,
                    proof_type=proof.proof_type,
                    public_inputs=proof.public_inputs,
                    verification_time=datetime.utcnow().isoformat(),
                    error="Proof has expired"
                )
            
            # Verify commitment format
            if len(proof.commitment) != 32 or len(proof.challenge) != 32:
                return ProofVerification(
                    valid=False,
                    proof_type=proof.proof_type,
                    public_inputs=proof.public_inputs,
                    verification_time=datetime.utcnow().isoformat(),
                    error="Invalid proof format"
                )
            
            # Verify response matches (if we're the same agent)
            expected_response = hmac.new(
                self._secret,
                proof.commitment + proof.challenge,
                hashlib.sha256
            ).digest()
            
            valid = hmac.compare_digest(proof.response, expected_response)
            
            return ProofVerification(
                valid=valid,
                proof_type=proof.proof_type,
                public_inputs=proof.public_inputs,
                verification_time=datetime.utcnow().isoformat(),
                error=None if valid else "Response verification failed"
            )
            
        except Exception as e:
            return ProofVerification(
                valid=False,
                proof_type=proof.proof_type,
                public_inputs=proof.public_inputs,
                verification_time=datetime.utcnow().isoformat(),
                error=str(e)
            )
    
    def _create_commitment_data(
        self,
        result: str,
        query_id: str,
        token_id: int,
        timestamp: str
    ) -> bytes:
        """Create the data to be committed in the proof"""
        data = f"{result}|{query_id}|{token_id}|{timestamp}|{self.agent_id}"
        return self._secret + data.encode('utf-8')
    
    @staticmethod
    def format_for_contract(proof: ZKProof) -> bytes:
        """
        Format proof for smart contract submission.
        
        Returns compact bytes suitable for Solidity.
        """
        # Format: commitment (32) || challenge (32) || response (32) || result_hash (32)
        result_hash = hashlib.sha256(
            json.dumps(proof.public_inputs, sort_keys=True).encode()
        ).digest()
        
        return proof.commitment + proof.challenge + proof.response + result_hash


class ProofAggregator:
    """
    Aggregates multiple proofs for batch verification.
    
    Useful when a researcher wants to verify multiple responses
    in a single transaction.
    """
    
    def __init__(self):
        self.proofs: list[ZKProof] = []
        
    def add_proof(self, proof: ZKProof):
        """Add a proof to the batch"""
        self.proofs.append(proof)
    
    def get_merkle_root(self) -> bytes:
        """
        Compute Merkle root of all proof commitments.
        
        Returns:
            32-byte Merkle root
        """
        if not self.proofs:
            return bytes(32)
            
        # Simple binary Merkle tree
        leaves = [p.commitment for p in self.proofs]
        
        while len(leaves) > 1:
            if len(leaves) % 2 == 1:
                leaves.append(leaves[-1])  # Duplicate last if odd
                
            new_leaves = []
            for i in range(0, len(leaves), 2):
                combined = leaves[i] + leaves[i + 1]
                new_leaves.append(hashlib.sha256(combined).digest())
            leaves = new_leaves
            
        return leaves[0]
    
    def to_bytes(self) -> bytes:
        """Serialize all proofs"""
        data = {
            "count": len(self.proofs),
            "merkle_root": self.get_merkle_root().hex(),
            "proofs": [p.to_bytes().hex() for p in self.proofs]
        }
        return json.dumps(data).encode('utf-8')

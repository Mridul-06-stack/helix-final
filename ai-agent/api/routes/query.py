"""
Query Routes - Submit genomic queries to the AI agent
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

# Use absolute imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agent.genomic_agent import GenomicAgent, GenomicQuery, QueryStatus
from agent.snp_analyzer import SNPAnalyzer
from agent.zk_responder import ZKResponder, ZKProof
from encryption.wallet_crypto import WalletCrypto
from encryption.ipfs_client import MockIPFSClient

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Request/Response Models ============

class SNPCheckRequest(BaseModel):
    """Request to check for a specific SNP"""
    token_id: int = Field(..., description="Your Helix NFT token ID")
    wallet_address: str = Field(..., description="NFT owner's wallet address")
    signature: str = Field(..., description="Signature for decryption")
    rsid: str = Field(..., description="The SNP rsID to check (e.g., rs12913832)")
    target_genotype: Optional[str] = Field(None, description="Optional specific genotype to match")


class TraitQueryRequest(BaseModel):
    """Request to predict a trait"""
    token_id: int
    wallet_address: str
    signature: str
    trait: str = Field(..., description="Trait to predict (e.g., eye_color, lactose_tolerance)")


class VariantSearchRequest(BaseModel):
    """Request to search for multiple variants"""
    token_id: int
    wallet_address: str
    signature: str
    rsids: List[str] = Field(..., description="List of rsIDs to search for")


class NaturalLanguageQueryRequest(BaseModel):
    """Natural language query about genetics"""
    token_id: int
    wallet_address: str
    signature: str
    question: str = Field(..., description="Your question in plain English")


class QueryResponse(BaseModel):
    """Response from a query"""
    success: bool
    query_id: str
    query_type: str
    result: Optional[Dict[str, Any]] = None
    proof: Optional[str] = None  # ZK proof as hex
    timestamp: str
    error: Optional[str] = None


class TraitInfo(BaseModel):
    """Information about a queryable trait"""
    trait: str
    description: str
    example_question: str


# ============ Helper Functions ============

def get_demo_analyzer() -> SNPAnalyzer:
    """Get an analyzer with demo data for testing"""
    analyzer = SNPAnalyzer()
    
    # Sample 23andMe-style data
    demo_data = """# rsid	chromosome	position	genotype
rs12913832	15	28365618	GG
rs4988235	2	136608646	CT
rs1815739	11	66560624	CC
rs762551	15	75041917	AA
rs671	12	112241766	GG
rs713598	7	141972804	GG
rs17822931	16	48258198	CT
rs72921001	11	6890295	CC
rs2282679	4	72618334	AG
"""
    analyzer.parse_file(demo_data)
    return analyzer


# ============ Endpoints ============

@router.get("/traits", response_model=List[TraitInfo])
async def get_available_traits():
    """Get list of traits that can be queried"""
    analyzer = SNPAnalyzer()
    traits = analyzer.get_available_traits()
    
    trait_info = {
        "eye_color": ("Eye color prediction based on HERC2 gene", "What color are my eyes likely to be?"),
        "lactose_tolerance": ("Ability to digest lactose", "Am I lactose intolerant?"),
        "muscle_type": ("Athletic performance tendency", "Am I built for power or endurance?"),
        "caffeine_metabolism": ("How fast you metabolize caffeine", "Am I a fast or slow caffeine metabolizer?"),
        "alcohol_flush": ("Alcohol flush reaction (Asian glow)", "Do I have the alcohol flush gene?"),
        "bitter_taste": ("Ability to taste bitter compounds", "Am I a super taster?"),
        "vitamin_d": ("Vitamin D level tendency", "Do I need more vitamin D?"),
        "cilantro_taste": ("Cilantro taste perception", "Does cilantro taste like soap to me?"),
        "earwax_type": ("Wet or dry earwax", "What type of earwax do I have?"),
        "brca1_status": ("BRCA1 gene status", "Do I have BRCA1 variants?")
    }
    
    return [
        TraitInfo(
            trait=t,
            description=trait_info.get(t, ("", ""))[0],
            example_question=trait_info.get(t, ("", ""))[1]
        )
        for t in traits
    ]


@router.get("/snp-info/{rsid}")
async def get_snp_info(rsid: str):
    """Get information about a specific SNP"""
    analyzer = SNPAnalyzer()
    info = analyzer.get_snp_info(rsid)
    
    if not info:
        raise HTTPException(status_code=404, detail=f"SNP {rsid} not found in database")
    
    return {
        "rsid": rsid,
        **info
    }


@router.post("/snp-check", response_model=QueryResponse)
async def check_snp(request: SNPCheckRequest):
    """
    Check if you have a specific SNP variant.
    
    Returns a boolean result with zero-knowledge proof.
    Your raw genetic data is never exposed.
    """
    query_id = str(uuid.uuid4())
    
    try:
        # In production, this would:
        # 1. Fetch encrypted data from IPFS
        # 2. Decrypt with the signature-derived key
        # 3. Run analysis
        # 4. Clear data from memory
        
        # For demo, use sample data
        analyzer = get_demo_analyzer()
        
        result = analyzer.analyze_for_bounty("SNP_CHECK", {
            "rsid": request.rsid,
            "genotype": request.target_genotype
        })
        
        # Generate ZK proof
        zk = ZKResponder(request.wallet_address)
        proof = zk.generate_boolean_proof(
            result=result.get("found", False),
            query_id=query_id,
            token_id=request.token_id,
            query_params={"rsid": request.rsid}
        )
        
        # Clear data
        analyzer.clear_data()
        
        return QueryResponse(
            success=True,
            query_id=query_id,
            query_type="SNP_CHECK",
            result=result,
            proof=proof.to_hex(),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"SNP check failed: {e}")
        return QueryResponse(
            success=False,
            query_id=query_id,
            query_type="SNP_CHECK",
            timestamp=datetime.utcnow().isoformat(),
            error=str(e)
        )


@router.post("/trait", response_model=QueryResponse)
async def predict_trait(request: TraitQueryRequest):
    """
    Predict a genetic trait based on your DNA.
    
    Returns a prediction (e.g., "blue eyes", "lactose intolerant")
    with confidence score and zero-knowledge proof.
    """
    query_id = str(uuid.uuid4())
    
    try:
        analyzer = get_demo_analyzer()
        
        prediction = analyzer.predict_trait(request.trait)
        
        if not prediction:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to predict trait: {request.trait}"
            )
        
        result = {
            "trait": prediction.trait,
            "prediction": prediction.prediction,
            "confidence": prediction.confidence,
            "description": prediction.description
        }
        
        # Generate proof
        zk = ZKResponder(request.wallet_address)
        proof = zk.generate_trait_proof(
            trait=prediction.trait,
            prediction=prediction.prediction,
            confidence=prediction.confidence,
            query_id=query_id,
            token_id=request.token_id
        )
        
        analyzer.clear_data()
        
        return QueryResponse(
            success=True,
            query_id=query_id,
            query_type="TRAIT_QUERY",
            result=result,
            proof=proof.to_hex(),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trait prediction failed: {e}")
        return QueryResponse(
            success=False,
            query_id=query_id,
            query_type="TRAIT_QUERY",
            timestamp=datetime.utcnow().isoformat(),
            error=str(e)
        )


@router.post("/variant-search", response_model=QueryResponse)
async def search_variants(request: VariantSearchRequest):
    """
    Search for multiple SNP variants at once.
    
    Returns count of how many were found, without revealing
    which specific ones (privacy-preserving).
    """
    query_id = str(uuid.uuid4())
    
    try:
        analyzer = get_demo_analyzer()
        
        result = analyzer.analyze_for_bounty("VARIANT_SEARCH", {
            "rsids": request.rsids
        })
        
        # Generate proof
        zk = ZKResponder(request.wallet_address)
        proof = zk.generate_variant_count_proof(
            searched_variants=len(request.rsids),
            found_count=result.get("total_found", 0),
            query_id=query_id,
            token_id=request.token_id
        )
        
        analyzer.clear_data()
        
        return QueryResponse(
            success=True,
            query_id=query_id,
            query_type="VARIANT_SEARCH",
            result=result,
            proof=proof.to_hex(),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Variant search failed: {e}")
        return QueryResponse(
            success=False,
            query_id=query_id,
            query_type="VARIANT_SEARCH",
            timestamp=datetime.utcnow().isoformat(),
            error=str(e)
        )


@router.post("/natural-language", response_model=QueryResponse)
async def natural_language_query(request: NaturalLanguageQueryRequest):
    """
    Ask a question about your genetics in plain English.
    
    Example: "Do I have blue eyes according to my DNA?"
    
    Note: Requires OpenAI API key to be configured.
    """
    query_id = str(uuid.uuid4())
    
    try:
        # Demo implementation without actual LLM
        # In production, this would use the GenomicAgent with OpenAI
        
        # Simple keyword matching for demo
        question_lower = request.question.lower()
        analyzer = get_demo_analyzer()
        
        result = {"question": request.question}
        
        if "eye" in question_lower or "eyes" in question_lower:
            prediction = analyzer.predict_trait("eye_color")
            if prediction:
                result["answer"] = f"Based on your genetics, you likely have {prediction.prediction.replace('_', ' ')} eyes (confidence: {prediction.confidence:.0%})"
        elif "lactose" in question_lower or "dairy" in question_lower:
            prediction = analyzer.predict_trait("lactose_tolerance")
            if prediction:
                result["answer"] = f"Your genetics suggest you are {prediction.prediction.replace('_', ' ')} (confidence: {prediction.confidence:.0%})"
        elif "caffeine" in question_lower or "coffee" in question_lower:
            prediction = analyzer.predict_trait("caffeine_metabolism")
            if prediction:
                result["answer"] = f"You are a {prediction.prediction.replace('_', ' ')} (confidence: {prediction.confidence:.0%})"
        else:
            result["answer"] = "I can answer questions about eye color, lactose tolerance, caffeine metabolism, and more. Try asking about a specific trait!"
        
        analyzer.clear_data()
        
        return QueryResponse(
            success=True,
            query_id=query_id,
            query_type="NATURAL_LANGUAGE",
            result=result,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Natural language query failed: {e}")
        return QueryResponse(
            success=False,
            query_id=query_id,
            query_type="NATURAL_LANGUAGE",
            timestamp=datetime.utcnow().isoformat(),
            error=str(e)
        )


@router.get("/demo-analysis")
async def run_demo_analysis():
    """
    Run a demo analysis on sample genetic data.
    
    This shows what kind of insights the system can extract
    without requiring actual genetic data upload.
    """
    analyzer = get_demo_analyzer()
    
    # Run all trait predictions
    predictions = {}
    for trait in analyzer.get_available_traits():
        prediction = analyzer.predict_trait(trait)
        if prediction:
            predictions[trait] = {
                "prediction": prediction.prediction,
                "confidence": prediction.confidence,
                "description": prediction.description
            }
    
    analyzer.clear_data()
    
    return {
        "message": "Demo analysis on sample genetic data",
        "disclaimer": "This uses sample data for demonstration only",
        "predictions": predictions,
        "total_snps_analyzed": 9,
        "traits_predicted": len(predictions)
    }

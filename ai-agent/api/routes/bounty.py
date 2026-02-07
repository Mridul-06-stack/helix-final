"""
Bounty Routes - Research bounty marketplace
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...agent.snp_analyzer import SNPAnalyzer
from ...agent.zk_responder import ZKResponder

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ In-Memory Storage (Demo) ============

# In production, these would come from the smart contract
DEMO_BOUNTIES: Dict[str, Dict[str, Any]] = {
    "bounty_001": {
        "id": "bounty_001",
        "researcher": "0x1234...5678",
        "query_type": "SNP_CHECK",
        "title": "Blue Eye Gene Study",
        "description": "Looking for individuals with the rs12913832 GG variant for eye color research",
        "params": {"rsid": "rs12913832", "genotype": "GG"},
        "reward_per_response": 0.05,  # ETH
        "max_responses": 100,
        "response_count": 23,
        "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "is_active": True,
        "category": "Traits"
    },
    "bounty_002": {
        "id": "bounty_002",
        "researcher": "0xabcd...efgh",
        "query_type": "SNP_CHECK",
        "title": "Lactose Intolerance Study",
        "description": "Researching lactose intolerance gene prevalence",
        "params": {"rsid": "rs4988235", "genotype": "CC"},
        "reward_per_response": 0.03,
        "max_responses": 200,
        "response_count": 87,
        "expires_at": (datetime.utcnow() + timedelta(days=14)).isoformat(),
        "is_active": True,
        "category": "Health"
    },
    "bounty_003": {
        "id": "bounty_003",
        "researcher": "0x9876...4321",
        "query_type": "TRAIT_QUERY",
        "title": "Athletic Performance Genetics",
        "description": "Studying the ACTN3 gene for athletic performance research",
        "params": {"trait": "muscle_type"},
        "reward_per_response": 0.08,
        "max_responses": 50,
        "response_count": 12,
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "is_active": True,
        "category": "Fitness"
    }
}

DEMO_RESPONSES: List[Dict[str, Any]] = []


# ============ Request/Response Models ============

class Bounty(BaseModel):
    """A research bounty"""
    id: str
    researcher: str
    query_type: str
    title: str
    description: str
    params: Dict[str, Any]
    reward_per_response: float
    max_responses: int
    response_count: int
    expires_at: str
    is_active: bool
    category: str


class BountyListResponse(BaseModel):
    """List of bounties"""
    bounties: List[Bounty]
    total: int
    active_count: int


class CreateBountyRequest(BaseModel):
    """Request to create a new bounty"""
    researcher_address: str
    query_type: str = Field(..., description="SNP_CHECK, TRAIT_QUERY, or VARIANT_SEARCH")
    title: str
    description: str
    params: Dict[str, Any]
    reward_per_response: float = Field(..., gt=0, description="Reward in ETH")
    max_responses: int = Field(..., gt=0, le=1000)
    duration_days: int = Field(default=7, ge=1, le=90)


class BountyMatchRequest(BaseModel):
    """Request to check if user matches a bounty"""
    bounty_id: str
    token_id: int
    wallet_address: str
    signature: str


class BountyMatchResponse(BaseModel):
    """Response for bounty match check"""
    bounty_id: str
    matches: bool
    potential_reward: float
    message: str


class RespondToBountyRequest(BaseModel):
    """Request to respond to a bounty"""
    bounty_id: str
    token_id: int
    wallet_address: str
    signature: str


class BountyResponseResult(BaseModel):
    """Result of responding to a bounty"""
    success: bool
    bounty_id: str
    response_id: Optional[str] = None
    reward_amount: float = 0
    proof: Optional[str] = None
    error: Optional[str] = None


# ============ Helper Functions ============

def get_demo_analyzer() -> SNPAnalyzer:
    """Get analyzer with demo data"""
    analyzer = SNPAnalyzer()
    demo_data = """# rsid	chromosome	position	genotype
rs12913832	15	28365618	GG
rs4988235	2	136608646	CT
rs1815739	11	66560624	CC
"""
    analyzer.parse_file(demo_data)
    return analyzer


# ============ Endpoints ============

@router.get("", response_model=BountyListResponse)
async def list_bounties(
    active_only: bool = True,
    category: Optional[str] = None,
    min_reward: Optional[float] = None
):
    """
    List available research bounties.
    
    Researchers post bounties for specific genetic queries.
    If you match, you can earn crypto by responding!
    """
    bounties = []
    
    for bid, bounty in DEMO_BOUNTIES.items():
        # Filter by active status
        if active_only and not bounty["is_active"]:
            continue
            
        # Filter by category
        if category and bounty["category"].lower() != category.lower():
            continue
            
        # Filter by minimum reward
        if min_reward and bounty["reward_per_response"] < min_reward:
            continue
            
        bounties.append(Bounty(**bounty))
    
    return BountyListResponse(
        bounties=bounties,
        total=len(bounties),
        active_count=sum(1 for b in bounties if b.is_active)
    )


@router.get("/{bounty_id}", response_model=Bounty)
async def get_bounty(bounty_id: str):
    """Get details of a specific bounty"""
    if bounty_id not in DEMO_BOUNTIES:
        raise HTTPException(status_code=404, detail="Bounty not found")
    
    return Bounty(**DEMO_BOUNTIES[bounty_id])


@router.post("/create", response_model=Bounty)
async def create_bounty(request: CreateBountyRequest):
    """
    Create a new research bounty.
    
    Researchers can create bounties to find people with specific
    genetic variants. Payment is handled through the smart contract.
    """
    bounty_id = f"bounty_{str(uuid.uuid4())[:8]}"
    
    bounty = {
        "id": bounty_id,
        "researcher": request.researcher_address,
        "query_type": request.query_type,
        "title": request.title,
        "description": request.description,
        "params": request.params,
        "reward_per_response": request.reward_per_response,
        "max_responses": request.max_responses,
        "response_count": 0,
        "expires_at": (datetime.utcnow() + timedelta(days=request.duration_days)).isoformat(),
        "is_active": True,
        "category": "Research"
    }
    
    DEMO_BOUNTIES[bounty_id] = bounty
    logger.info(f"Created bounty {bounty_id}")
    
    return Bounty(**bounty)


@router.post("/check-match", response_model=BountyMatchResponse)
async def check_bounty_match(request: BountyMatchRequest):
    """
    Check if your genome matches a bounty's criteria.
    
    This runs the query locally WITHOUT submitting a response.
    Use this to see if you qualify before committing.
    """
    if request.bounty_id not in DEMO_BOUNTIES:
        raise HTTPException(status_code=404, detail="Bounty not found")
    
    bounty = DEMO_BOUNTIES[request.bounty_id]
    
    if not bounty["is_active"]:
        return BountyMatchResponse(
            bounty_id=request.bounty_id,
            matches=False,
            potential_reward=0,
            message="This bounty is no longer active"
        )
    
    # Check match using analyzer
    analyzer = get_demo_analyzer()
    
    try:
        if bounty["query_type"] == "SNP_CHECK":
            rsid = bounty["params"].get("rsid")
            target = bounty["params"].get("genotype")
            matches, genotype = analyzer.check_snp_match(rsid, target)
        elif bounty["query_type"] == "TRAIT_QUERY":
            trait = bounty["params"].get("trait")
            prediction = analyzer.predict_trait(trait)
            matches = prediction is not None
        else:
            matches = False
    finally:
        analyzer.clear_data()
    
    if matches:
        return BountyMatchResponse(
            bounty_id=request.bounty_id,
            matches=True,
            potential_reward=bounty["reward_per_response"],
            message=f"🎉 You match this bounty! You could earn {bounty['reward_per_response']} ETH"
        )
    else:
        return BountyMatchResponse(
            bounty_id=request.bounty_id,
            matches=False,
            potential_reward=0,
            message="Your genome does not match this bounty's criteria"
        )


@router.post("/respond", response_model=BountyResponseResult)
async def respond_to_bounty(request: RespondToBountyRequest):
    """
    Respond to a bounty and claim the reward.
    
    This submits a zero-knowledge proof that you match the criteria.
    The researcher gets only YES/NO + proof, never your actual DNA data.
    """
    if request.bounty_id not in DEMO_BOUNTIES:
        raise HTTPException(status_code=404, detail="Bounty not found")
    
    bounty = DEMO_BOUNTIES[request.bounty_id]
    
    if not bounty["is_active"]:
        return BountyResponseResult(
            success=False,
            bounty_id=request.bounty_id,
            error="Bounty is no longer active"
        )
    
    if bounty["response_count"] >= bounty["max_responses"]:
        return BountyResponseResult(
            success=False,
            bounty_id=request.bounty_id,
            error="Bounty has reached maximum responses"
        )
    
    # Check if already responded (would check contract in production)
    existing = [r for r in DEMO_RESPONSES 
                if r["bounty_id"] == request.bounty_id 
                and r["token_id"] == request.token_id]
    if existing:
        return BountyResponseResult(
            success=False,
            bounty_id=request.bounty_id,
            error="You have already responded to this bounty"
        )
    
    # Verify match
    analyzer = get_demo_analyzer()
    
    try:
        if bounty["query_type"] == "SNP_CHECK":
            rsid = bounty["params"].get("rsid")
            target = bounty["params"].get("genotype")
            matches, _ = analyzer.check_snp_match(rsid, target)
        elif bounty["query_type"] == "TRAIT_QUERY":
            trait = bounty["params"].get("trait")
            prediction = analyzer.predict_trait(trait)
            matches = prediction is not None
        else:
            matches = False
    finally:
        analyzer.clear_data()
    
    if not matches:
        return BountyResponseResult(
            success=False,
            bounty_id=request.bounty_id,
            error="Your genome does not match the bounty criteria"
        )
    
    # Generate ZK proof
    zk = ZKResponder(request.wallet_address)
    proof = zk.generate_boolean_proof(
        result=True,
        query_id=f"{request.bounty_id}_{request.token_id}",
        token_id=request.token_id,
        query_params=bounty["params"]
    )
    
    # Record response
    response_id = str(uuid.uuid4())
    DEMO_RESPONSES.append({
        "response_id": response_id,
        "bounty_id": request.bounty_id,
        "token_id": request.token_id,
        "wallet_address": request.wallet_address,
        "timestamp": datetime.utcnow().isoformat(),
        "proof": proof.to_hex()
    })
    
    # Update bounty
    bounty["response_count"] += 1
    if bounty["response_count"] >= bounty["max_responses"]:
        bounty["is_active"] = False
    
    logger.info(f"Bounty response recorded: {response_id}")
    
    return BountyResponseResult(
        success=True,
        bounty_id=request.bounty_id,
        response_id=response_id,
        reward_amount=bounty["reward_per_response"],
        proof=proof.to_hex()
    )


@router.get("/my-responses/{wallet_address}")
async def get_my_responses(wallet_address: str):
    """Get all bounty responses for a wallet"""
    responses = [r for r in DEMO_RESPONSES if r["wallet_address"] == wallet_address]
    
    # Enrich with bounty info
    enriched = []
    for r in responses:
        if r["bounty_id"] in DEMO_BOUNTIES:
            bounty = DEMO_BOUNTIES[r["bounty_id"]]
            enriched.append({
                **r,
                "bounty_title": bounty["title"],
                "reward": bounty["reward_per_response"]
            })
    
    total_earned = sum(r["reward"] for r in enriched)
    
    return {
        "responses": enriched,
        "total_responses": len(enriched),
        "total_earned_eth": total_earned
    }


@router.get("/categories")
async def get_bounty_categories():
    """Get available bounty categories"""
    return {
        "categories": [
            {"id": "traits", "name": "Traits", "description": "Physical trait research"},
            {"id": "health", "name": "Health", "description": "Health-related genetic studies"},
            {"id": "fitness", "name": "Fitness", "description": "Athletic and fitness genetics"},
            {"id": "ancestry", "name": "Ancestry", "description": "Ancestry and population genetics"},
            {"id": "research", "name": "Research", "description": "General research studies"}
        ]
    }


@router.get("/stats")
async def get_marketplace_stats():
    """Get marketplace statistics"""
    active = [b for b in DEMO_BOUNTIES.values() if b["is_active"]]
    total_rewards = sum(
        b["reward_per_response"] * (b["max_responses"] - b["response_count"])
        for b in active
    )
    
    return {
        "active_bounties": len(active),
        "total_bounties": len(DEMO_BOUNTIES),
        "total_responses": len(DEMO_RESPONSES),
        "available_rewards_eth": total_rewards,
        "top_categories": ["Traits", "Health", "Fitness"]
    }

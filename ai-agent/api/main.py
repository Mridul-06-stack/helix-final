"""
HelixVault API - FastAPI Server
Main entry point for the HelixVault backend
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from .routes import mint, query, bounty

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings from environment"""
    app_name: str = "HelixVault"
    version: str = "1.0.0"
    debug: bool = False
    
    # API Keys
    openai_api_key: Optional[str] = None
    pinata_api_key: Optional[str] = None
    pinata_api_secret: Optional[str] = None
    
    # Blockchain
    polygon_rpc_url: str = "https://polygon-rpc.com"
    contract_address: Optional[str] = None
    bounty_contract_address: Optional[str] = None
    
    # Agent
    agent_wallet_address: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_prefix = "HELIX_"


settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info(f"Starting {settings.app_name} v{settings.version}")
    
    # Startup
    app.state.settings = settings
    
    # Initialize services
    # These would be properly initialized with real credentials in production
    logger.info("Services initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down HelixVault API")


# Create FastAPI app
app = FastAPI(
    title="HelixVault API",
    description="""
# HelixVault - Genomic Data NFT Platform

Privacy-preserving genomic data monetization through NFTs and AI agents.

## Features

- 🧬 **Encrypt & Mint**: Upload genetic data, encrypt with your wallet, mint as NFT
- 🔍 **Query**: AI agent answers questions about your genome without exposing raw data
- 💰 **Bounties**: Researchers post bounties, you get paid for matching genetic markers
- 🔐 **Privacy**: Zero-knowledge proofs ensure your DNA stays private

## Endpoints

- `/mint` - Encrypt and prepare genetic data for minting
- `/query` - Submit genomic queries to the AI agent
- `/bounties` - Browse and respond to research bounties
    """,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Health & Info Endpoints ============

@app.get("/", tags=["Info"])
async def root():
    """API root - returns basic info"""
    return {
        "name": settings.app_name,
        "version": settings.version,
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health", tags=["Info"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "api": True,
            "ipfs": settings.pinata_api_key is not None,
            "blockchain": settings.contract_address is not None,
            "ai_agent": settings.openai_api_key is not None
        }
    }


@app.get("/config", tags=["Info"])
async def get_config():
    """Get public configuration"""
    return {
        "contracts": {
            "genetic_nft": settings.contract_address,
            "bounty_market": settings.bounty_contract_address,
            "network": "polygon"
        },
        "supported_formats": ["23andme", "ancestry", "vcf"],
        "supported_traits": [
            "eye_color",
            "lactose_tolerance",
            "muscle_type",
            "caffeine_metabolism",
            "alcohol_flush",
            "bitter_taste",
            "vitamin_d",
            "cilantro_taste",
            "earwax_type"
        ],
        "query_types": ["SNP_CHECK", "TRAIT_QUERY", "VARIANT_SEARCH"]
    }


# ============ Include Routers ============

app.include_router(mint.router, prefix="/mint", tags=["Minting"])
app.include_router(query.router, prefix="/query", tags=["Queries"])
app.include_router(bounty.router, prefix="/bounties", tags=["Bounties"])


# ============ Error Handlers ============

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500
        }
    )


# ============ Run Server ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )

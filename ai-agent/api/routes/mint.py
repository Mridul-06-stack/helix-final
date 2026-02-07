"""
Mint Routes - Encrypt and prepare genetic data for NFT minting
"""

import hashlib
import logging
import tempfile
import os
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from parent directory
from pathlib import Path
env_path = Path(__file__).parent.parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field

# Use absolute imports to avoid relative import issues
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from encryption.wallet_crypto import WalletCrypto
from encryption.ipfs_client import IPFSClient, MockIPFSClient

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Request/Response Models ============

class EncryptRequest(BaseModel):
    """Request to encrypt genetic data"""
    wallet_address: str = Field(..., description="User's wallet address")
    signature: str = Field(..., description="Signature of the key derivation message (hex)")
    gene_type: str = Field(default="23andme", description="Type of genetic data file")


class EncryptResponse(BaseModel):
    """Response after encrypting and uploading"""
    success: bool
    ipfs_cid: Optional[str] = None
    data_hash: Optional[str] = None
    encryption_algo: str = "AES-256-GCM"
    file_size: int = 0
    metadata_uri: Optional[str] = None
    error: Optional[str] = None


class MintDataResponse(BaseModel):
    """Data needed to call the mint function"""
    ipfs_cid: str
    data_hash: str  # bytes32 as hex
    encryption_algo: str
    gene_type: str
    file_size: int
    token_uri: str
    mint_function_args: dict


class SigningMessageResponse(BaseModel):
    """The message to sign for key derivation"""
    message: str
    wallet_address: str


# ============ Endpoints ============

@router.get("/signing-message/{wallet_address}", response_model=SigningMessageResponse)
async def get_signing_message(wallet_address: str):
    """
    Get the message that needs to be signed for encryption key derivation.
    
    The user signs this message with their wallet, and the signature
    is used to derive the encryption key.
    """
    crypto = WalletCrypto(wallet_address)
    message = crypto.get_signing_message()
    
    return SigningMessageResponse(
        message=message,
        wallet_address=wallet_address
    )


@router.post("/encrypt", response_model=EncryptResponse)
async def encrypt_and_upload(
    file: UploadFile = File(..., description="Genetic data file (.txt, .csv, .gz)"),
    wallet_address: str = Form(..., description="User's wallet address"),
    signature: str = Form(..., description="Signature hex string"),
    gene_type: str = Form(default="23andme", description="File format")
):
    """
    Encrypt a genetic data file and upload to IPFS.
    
    This endpoint:
    1. Receives the genetic data file
    2. Derives encryption key from wallet signature
    3. Encrypts the file with AES-256-GCM
    4. Uploads encrypted file to IPFS
    5. Returns the IPFS CID and data hash for minting
    """
    try:
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        logger.info(f"Received {len(content)} bytes for encryption from {wallet_address}")
        
        # Initialize crypto
        crypto = WalletCrypto(wallet_address)
        
        # Convert signature from hex
        try:
            signature_bytes = bytes.fromhex(signature.replace("0x", ""))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid signature format")
        
        # Derive encryption key
        key = crypto.derive_key_from_signature(signature_bytes)
        
        # Calculate original data hash (for smart contract)
        data_hash = crypto.generate_data_hash(content)
        
        # Encrypt the data
        encrypted_payload = crypto.encrypt_data(content, key, compress=True)
        encrypted_bytes = encrypted_payload.to_bytes()
        
        logger.info(f"Encrypted to {len(encrypted_bytes)} bytes")

        # Upload to IPFS with Pinata
        # Try multiple environment variable names
        pinata_key = (
            os.getenv("HELIX_PINATA_API_KEY") or
            os.getenv("PINATA_API_KEY") or
            os.getenv("helix_pinata_api_key")
        )
        pinata_secret = (
            os.getenv("HELIX_PINATA_API_SECRET") or
            os.getenv("PINATA_SECRET_API_KEY") or
            os.getenv("helix_pinata_api_secret")
        )

        logger.info(f"Pinata key found: {bool(pinata_key)}, secret found: {bool(pinata_secret)}")

        if pinata_key and pinata_secret:
            ipfs = IPFSClient(pinata_key, pinata_secret)
            logger.info("Using real Pinata IPFS client")
        else:
            ipfs = MockIPFSClient()
            logger.warning(f"Pinata credentials not found, using mock IPFS client (key={pinata_key[:10] if pinata_key else None})")

        metadata = {
            "gene_type": gene_type,
            "encryption_algo": "AES-256-GCM",
            "wallet": wallet_address[:10] + "...",  # Partial for privacy
            "timestamp": datetime.utcnow().isoformat()
        }
        
        upload_result = await ipfs.upload(
            encrypted_bytes,
            f"helix_{wallet_address[:8]}_{int(datetime.utcnow().timestamp())}.enc",
            metadata
        )
        
        if not upload_result.success:
            raise HTTPException(status_code=500, detail=f"IPFS upload failed: {upload_result.error}")
        
        logger.info(f"Uploaded to IPFS: {upload_result.cid}")
        
        return EncryptResponse(
            success=True,
            ipfs_cid=upload_result.cid,
            data_hash=data_hash.hex(),
            encryption_algo="AES-256-GCM",
            file_size=len(encrypted_bytes)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return EncryptResponse(
            success=False,
            error=str(e)
        )


@router.post("/prepare-mint", response_model=MintDataResponse)
async def prepare_mint(
    ipfs_cid: str = Form(...),
    data_hash: str = Form(...),
    gene_type: str = Form(default="23andme"),
    file_size: int = Form(...)
):
    """
    Prepare the data needed to call the smart contract mint function.
    
    Returns the exact arguments to pass to GeneticNFT.mintGenome()
    """
    # Generate token URI (metadata JSON)
    # In production, this would be uploaded to IPFS as well
    token_metadata = {
        "name": f"HelixVault Genome #{data_hash[:8]}",
        "description": "Your encrypted genetic data, secured on the blockchain. Only you can decrypt it.",
        "image": "ipfs://QmDefaultHelixImage",  # Placeholder
        "attributes": [
            {"trait_type": "Gene Type", "value": gene_type},
            {"trait_type": "Encryption", "value": "AES-256-GCM"},
            {"trait_type": "Platform", "value": "HelixVault"}
        ],
        "external_url": f"https://helixvault.io/genome/{data_hash[:16]}",
        "encrypted_data": f"ipfs://{ipfs_cid}"
    }
    
    # For now, return data URI (in production, upload to IPFS)
    import base64
    import json
    token_uri = f"data:application/json;base64,{base64.b64encode(json.dumps(token_metadata).encode()).decode()}"
    
    # Convert data_hash to bytes32 format
    data_hash_bytes32 = f"0x{data_hash.zfill(64)}"
    
    return MintDataResponse(
        ipfs_cid=ipfs_cid,
        data_hash=data_hash_bytes32,
        encryption_algo="AES-256-GCM",
        gene_type=gene_type,
        file_size=file_size,
        token_uri=token_uri,
        mint_function_args={
            "ipfsCID": ipfs_cid,
            "dataHash": data_hash_bytes32,
            "encryptionAlgo": "AES-256-GCM",
            "geneType": gene_type,
            "fileSize": file_size,
            "tokenURI_": token_uri
        }
    )


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported genetic data formats"""
    return {
        "formats": [
            {
                "id": "23andme",
                "name": "23andMe",
                "extensions": [".txt", ".txt.gz"],
                "description": "23andMe raw data export"
            },
            {
                "id": "ancestry",
                "name": "AncestryDNA",
                "extensions": [".txt", ".txt.gz"],
                "description": "AncestryDNA raw data export"
            },
            {
                "id": "vcf",
                "name": "VCF",
                "extensions": [".vcf", ".vcf.gz"],
                "description": "Variant Call Format (standard)"
            }
        ],
        "max_file_size_mb": 100,
        "compression": "gzip recommended"
    }

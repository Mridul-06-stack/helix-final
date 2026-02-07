"""
IPFS Client - Interacts with IPFS via Pinata
Handles upload and retrieval of encrypted genetic data
"""

import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import asyncio

import aiohttp
import requests

logger = logging.getLogger(__name__)


@dataclass
class IPFSFile:
    """Metadata for an IPFS file"""
    cid: str  # Content ID (hash)
    name: str
    size: int
    mime_type: str
    pin_date: datetime
    metadata: Dict[str, Any]


@dataclass
class UploadResult:
    """Result of an IPFS upload"""
    success: bool
    cid: Optional[str]
    size: int
    error: Optional[str] = None


class IPFSClient:
    """
    Client for interacting with IPFS through Pinata.
    
    Pinata provides a reliable pinning service that ensures
    our encrypted genetic data remains available on IPFS.
    """
    
    PINATA_API_URL = "https://api.pinata.cloud"
    PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"
    
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        gateway_url: Optional[str] = None
    ):
        """
        Initialize the IPFS client.
        
        Args:
            api_key: Pinata API key
            api_secret: Pinata API secret
            gateway_url: Custom IPFS gateway URL (optional)
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.gateway_url = gateway_url or self.PINATA_GATEWAY
        
        self._headers = {
            "pinata_api_key": api_key,
            "pinata_secret_api_key": api_secret
        }
        
    async def upload(
        self,
        data: bytes,
        name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UploadResult:
        """
        Upload encrypted data to IPFS via Pinata.
        
        Args:
            data: Encrypted data bytes
            name: Name for the file
            metadata: Optional metadata (gene_type, encryption_algo, etc.)
            
        Returns:
            UploadResult with CID or error
        """
        try:
            url = f"{self.PINATA_API_URL}/pinning/pinFileToIPFS"
            
            # Prepare multipart form data
            form_data = aiohttp.FormData()
            form_data.add_field(
                'file',
                data,
                filename=name,
                content_type='application/octet-stream'
            )
            
            # Add Pinata options
            pinata_options = {
                "cidVersion": 1,
                "wrapWithDirectory": False
            }
            form_data.add_field(
                'pinataOptions',
                json.dumps(pinata_options),
                content_type='application/json'
            )
            
            # Add metadata
            if metadata:
                pinata_metadata = {
                    "name": name,
                    "keyvalues": {
                        **metadata,
                        "upload_timestamp": datetime.utcnow().isoformat(),
                        "platform": "HelixVault"
                    }
                }
                form_data.add_field(
                    'pinataMetadata',
                    json.dumps(pinata_metadata),
                    content_type='application/json'
                )
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    data=form_data,
                    headers=self._headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        cid = result.get("IpfsHash")
                        size = result.get("PinSize", len(data))
                        
                        logger.info(f"Successfully uploaded to IPFS: {cid}")
                        return UploadResult(
                            success=True,
                            cid=cid,
                            size=size
                        )
                    else:
                        error_text = await response.text()
                        logger.error(f"Upload failed: {error_text}")
                        return UploadResult(
                            success=False,
                            cid=None,
                            size=0,
                            error=error_text
                        )
                        
        except Exception as e:
            logger.error(f"IPFS upload error: {e}")
            return UploadResult(
                success=False,
                cid=None,
                size=0,
                error=str(e)
            )
    
    async def fetch(self, cid: str) -> Optional[bytes]:
        """
        Fetch data from IPFS by CID.
        
        Args:
            cid: Content ID to fetch
            
        Returns:
            Data bytes or None if not found
        """
        try:
            url = f"{self.gateway_url}/{cid}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        data = await response.read()
                        logger.info(f"Fetched {len(data)} bytes from IPFS: {cid}")
                        return data
                    else:
                        logger.error(f"Failed to fetch CID {cid}: {response.status}")
                        return None
                        
        except asyncio.TimeoutError:
            logger.error(f"Timeout fetching CID: {cid}")
            return None
        except Exception as e:
            logger.error(f"IPFS fetch error: {e}")
            return None
    
    async def fetch_with_retry(
        self,
        cid: str,
        max_retries: int = 3,
        backoff_factor: float = 1.5
    ) -> Optional[bytes]:
        """
        Fetch data with exponential backoff retry.
        
        Args:
            cid: Content ID to fetch
            max_retries: Maximum retry attempts
            backoff_factor: Multiplier for wait time between retries
            
        Returns:
            Data bytes or None
        """
        wait_time = 1.0
        
        for attempt in range(max_retries):
            result = await self.fetch(cid)
            if result is not None:
                return result
                
            if attempt < max_retries - 1:
                logger.warning(f"Retry {attempt + 1}/{max_retries} for CID {cid}")
                await asyncio.sleep(wait_time)
                wait_time *= backoff_factor
                
        return None
    
    async def pin_status(self, cid: str) -> Optional[Dict[str, Any]]:
        """
        Check the pin status of a CID.
        
        Args:
            cid: Content ID to check
            
        Returns:
            Pin status info or None
        """
        try:
            url = f"{self.PINATA_API_URL}/data/pinList"
            params = {
                "hashContains": cid,
                "status": "pinned"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    headers=self._headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        rows = result.get("rows", [])
                        if rows:
                            return rows[0]
                    return None
                    
        except Exception as e:
            logger.error(f"Pin status check error: {e}")
            return None
    
    async def unpin(self, cid: str) -> bool:
        """
        Unpin a CID (remove from Pinata, will be garbage collected).
        
        Args:
            cid: Content ID to unpin
            
        Returns:
            True if successful
        """
        try:
            url = f"{self.PINATA_API_URL}/pinning/unpin/{cid}"
            
            async with aiohttp.ClientSession() as session:
                async with session.delete(url, headers=self._headers) as response:
                    if response.status == 200:
                        logger.info(f"Unpinned CID: {cid}")
                        return True
                    else:
                        logger.error(f"Failed to unpin: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Unpin error: {e}")
            return False
    
    async def list_pins(
        self,
        limit: int = 100,
        offset: int = 0,
        metadata_filter: Optional[Dict[str, str]] = None
    ) -> List[IPFSFile]:
        """
        List pinned files.
        
        Args:
            limit: Maximum results
            offset: Pagination offset
            metadata_filter: Filter by metadata key-values
            
        Returns:
            List of IPFSFile objects
        """
        try:
            url = f"{self.PINATA_API_URL}/data/pinList"
            params = {
                "pageLimit": limit,
                "pageOffset": offset,
                "status": "pinned"
            }
            
            if metadata_filter:
                params["metadata[keyvalues]"] = json.dumps(metadata_filter)
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    headers=self._headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        files = []
                        
                        for row in result.get("rows", []):
                            files.append(IPFSFile(
                                cid=row["ipfs_pin_hash"],
                                name=row.get("metadata", {}).get("name", ""),
                                size=row.get("size", 0),
                                mime_type=row.get("mime_type", "application/octet-stream"),
                                pin_date=datetime.fromisoformat(
                                    row["date_pinned"].replace("Z", "+00:00")
                                ),
                                metadata=row.get("metadata", {}).get("keyvalues", {})
                            ))
                            
                        return files
                    return []
                    
        except Exception as e:
            logger.error(f"List pins error: {e}")
            return []
    
    def generate_gateway_url(self, cid: str) -> str:
        """Generate a public gateway URL for a CID"""
        return f"{self.gateway_url}/{cid}"
    
    async def test_connection(self) -> bool:
        """Test the Pinata API connection"""
        try:
            url = f"{self.PINATA_API_URL}/data/testAuthentication"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self._headers) as response:
                    if response.status == 200:
                        logger.info("Pinata connection successful")
                        return True
                    else:
                        logger.error(f"Pinata auth failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False


class MockIPFSClient:
    """Mock IPFS client for testing without Pinata"""
    
    def __init__(self):
        self._storage: Dict[str, bytes] = {}
        
    async def upload(
        self,
        data: bytes,
        name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UploadResult:
        """Mock upload - stores in memory"""
        cid = f"Qm{hashlib.sha256(data).hexdigest()[:44]}"
        self._storage[cid] = data
        return UploadResult(success=True, cid=cid, size=len(data))
    
    async def fetch(self, cid: str) -> Optional[bytes]:
        """Mock fetch - retrieves from memory"""
        return self._storage.get(cid)
    
    async def test_connection(self) -> bool:
        return True

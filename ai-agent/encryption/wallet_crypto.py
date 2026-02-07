"""
Wallet Crypto - Wallet-Based Encryption for Genetic Data
Uses wallet signatures to derive encryption keys for genomic data
"""

import os
import hashlib
import hmac
import gzip
from typing import Optional, Tuple
from dataclasses import dataclass
import logging

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from eth_account.messages import encode_defunct
from eth_account import Account

logger = logging.getLogger(__name__)

# Constants
ENCRYPTION_VERSION = 1
NONCE_SIZE = 12  # 96 bits for AES-GCM
KEY_SIZE = 32    # 256 bits for AES-256
SALT_SIZE = 16   # 128 bits salt
TAG_SIZE = 16    # 128 bits authentication tag


@dataclass
class EncryptedPayload:
    """Encrypted data with metadata"""
    version: int
    algorithm: str
    salt: bytes
    nonce: bytes
    ciphertext: bytes
    tag: bytes
    original_hash: bytes  # SHA-256 of original data for integrity
    compressed: bool
    
    def to_bytes(self) -> bytes:
        """Serialize to bytes for storage"""
        # Format: version(1) | algo_len(1) | algo | salt(16) | nonce(12) | hash(32) | compressed(1) | ciphertext
        algo_bytes = self.algorithm.encode('utf-8')
        
        header = bytes([
            self.version,
            len(algo_bytes),
        ])
        
        return b''.join([
            header,
            algo_bytes,
            self.salt,
            self.nonce,
            self.original_hash,
            bytes([1 if self.compressed else 0]),
            self.ciphertext  # Includes the auth tag
        ])
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'EncryptedPayload':
        """Deserialize from bytes"""
        version = data[0]
        algo_len = data[1]
        offset = 2
        
        algorithm = data[offset:offset + algo_len].decode('utf-8')
        offset += algo_len
        
        salt = data[offset:offset + SALT_SIZE]
        offset += SALT_SIZE
        
        nonce = data[offset:offset + NONCE_SIZE]
        offset += NONCE_SIZE
        
        original_hash = data[offset:offset + 32]
        offset += 32
        
        compressed = data[offset] == 1
        offset += 1
        
        ciphertext = data[offset:]
        
        return cls(
            version=version,
            algorithm=algorithm,
            salt=salt,
            nonce=nonce,
            ciphertext=ciphertext,
            tag=b'',  # Tag is part of ciphertext in AESGCM
            original_hash=original_hash,
            compressed=compressed
        )


class WalletCrypto:
    """
    Encryption utilities using wallet-derived keys.
    
    The user signs a deterministic message, and that signature is used
    to derive an encryption key. This way:
    - Only the wallet owner can decrypt their data
    - No separate key management needed
    - Key can be re-derived anytime from the same wallet
    """
    
    # Message to sign for key derivation
    KEY_DERIVATION_MESSAGE = "HelixVault Data Encryption Key v1"
    
    def __init__(self, wallet_address: Optional[str] = None):
        """
        Initialize the crypto utility.
        
        Args:
            wallet_address: The user's wallet address (for verification)
        """
        self.wallet_address = wallet_address
        
    def get_signing_message(self, salt: Optional[bytes] = None) -> str:
        """
        Get the message that needs to be signed for key derivation.
        
        Args:
            salt: Optional salt for additional entropy
            
        Returns:
            Message string to sign
        """
        if salt:
            salt_hex = salt.hex()
            return f"{self.KEY_DERIVATION_MESSAGE}|{salt_hex}"
        return self.KEY_DERIVATION_MESSAGE
    
    def derive_key_from_signature(
        self,
        signature: bytes,
        salt: Optional[bytes] = None
    ) -> bytes:
        """
        Derive an AES-256 key from a wallet signature.
        
        Args:
            signature: The signature bytes from signing the key derivation message
            salt: Optional salt (will be generated if not provided)
            
        Returns:
            32-byte AES key
        """
        if salt is None:
            salt = os.urandom(SALT_SIZE)
            
        # Use HKDF to derive a proper key from the signature
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=KEY_SIZE,
            salt=salt,
            info=b"helix-vault-encryption-key",
        )
        
        key = hkdf.derive(signature)
        
        logger.debug(f"Derived {len(key)}-byte key from signature")
        return key
    
    def encrypt_data(
        self,
        data: bytes,
        key: bytes,
        compress: bool = True
    ) -> EncryptedPayload:
        """
        Encrypt data with AES-256-GCM.
        
        Args:
            data: Raw data to encrypt
            key: 32-byte encryption key
            compress: Whether to gzip compress before encryption
            
        Returns:
            EncryptedPayload with all encryption metadata
        """
        # Calculate original hash for integrity verification
        original_hash = hashlib.sha256(data).digest()
        
        # Optionally compress (genetic data compresses well)
        if compress:
            plaintext = gzip.compress(data)
            logger.debug(f"Compressed {len(data)} bytes to {len(plaintext)} bytes")
        else:
            plaintext = data
        
        # Generate unique nonce
        nonce = os.urandom(NONCE_SIZE)
        salt = os.urandom(SALT_SIZE)
        
        # Encrypt with AES-GCM
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data=original_hash)
        
        return EncryptedPayload(
            version=ENCRYPTION_VERSION,
            algorithm="AES-256-GCM",
            salt=salt,
            nonce=nonce,
            ciphertext=ciphertext,
            tag=b'',  # Included in ciphertext for AESGCM
            original_hash=original_hash,
            compressed=compress
        )
    
    def decrypt_data(self, payload: EncryptedPayload, key: bytes) -> bytes:
        """
        Decrypt data from an EncryptedPayload.
        
        Args:
            payload: The encrypted payload
            key: 32-byte decryption key
            
        Returns:
            Original plaintext data
            
        Raises:
            ValueError: If decryption fails or integrity check fails
        """
        # Decrypt with AES-GCM
        aesgcm = AESGCM(key)
        
        try:
            plaintext = aesgcm.decrypt(
                payload.nonce,
                payload.ciphertext,
                associated_data=payload.original_hash
            )
        except Exception as e:
            raise ValueError(f"Decryption failed: {e}")
        
        # Decompress if necessary
        if payload.compressed:
            data = gzip.decompress(plaintext)
        else:
            data = plaintext
        
        # Verify integrity
        data_hash = hashlib.sha256(data).digest()
        if data_hash != payload.original_hash:
            raise ValueError("Data integrity check failed")
        
        logger.debug(f"Successfully decrypted {len(data)} bytes")
        return data
    
    def encrypt_file(
        self,
        file_path: str,
        key: bytes,
        compress: bool = True
    ) -> bytes:
        """
        Encrypt a file and return the encrypted bytes.
        
        Args:
            file_path: Path to the file to encrypt
            key: 32-byte encryption key
            compress: Whether to compress before encryption
            
        Returns:
            Encrypted payload as bytes
        """
        with open(file_path, 'rb') as f:
            data = f.read()
            
        payload = self.encrypt_data(data, key, compress)
        return payload.to_bytes()
    
    def decrypt_file(self, encrypted_data: bytes, key: bytes) -> str:
        """
        Decrypt file data and return as string.
        
        Args:
            encrypted_data: Encrypted payload bytes
            key: 32-byte decryption key
            
        Returns:
            Decrypted file content as string
        """
        payload = EncryptedPayload.from_bytes(encrypted_data)
        decrypted = self.decrypt_data(payload, key)
        return decrypted.decode('utf-8')
    
    def verify_signature(
        self,
        message: str,
        signature: bytes,
        expected_address: str
    ) -> bool:
        """
        Verify that a signature came from the expected wallet.
        
        Args:
            message: The message that was signed
            signature: The signature bytes
            expected_address: Expected signer address
            
        Returns:
            True if signature is valid and from expected address
        """
        try:
            message_hash = encode_defunct(text=message)
            recovered_address = Account.recover_message(message_hash, signature=signature)
            
            return recovered_address.lower() == expected_address.lower()
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            return False
    
    def generate_data_hash(self, data: bytes) -> bytes:
        """Generate SHA-256 hash of data for smart contract"""
        return hashlib.sha256(data).digest()
    
    @staticmethod
    def generate_random_key() -> bytes:
        """Generate a random 256-bit key (for testing)"""
        return os.urandom(KEY_SIZE)


class SecureMemory:
    """
    Utility for secure handling of sensitive data in memory.
    
    Note: Python doesn't provide true secure memory like C/Rust,
    but we can minimize exposure by:
    - Using bytes instead of strings where possible
    - Explicitly deleting references
    - Overwriting memory before deletion
    """
    
    @staticmethod
    def secure_delete(data: bytearray) -> None:
        """
        Attempt to securely delete sensitive data from memory.
        
        Args:
            data: Mutable bytearray to clear
        """
        if isinstance(data, bytearray):
            # Overwrite with zeros
            for i in range(len(data)):
                data[i] = 0
            # Overwrite with random data
            random_data = os.urandom(len(data))
            for i in range(len(data)):
                data[i] = random_data[i]
            # Clear again
            for i in range(len(data)):
                data[i] = 0
                
        logger.debug("Secure memory wipe completed")
    
    @staticmethod
    def secure_wrap(data: bytes) -> bytearray:
        """Convert bytes to mutable bytearray for secure handling"""
        return bytearray(data)

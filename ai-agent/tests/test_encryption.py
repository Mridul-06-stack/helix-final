"""
Tests for Wallet Crypto
"""

import pytest
import os
from encryption.wallet_crypto import WalletCrypto, EncryptedPayload, SecureMemory


class TestWalletCrypto:
    """Tests for wallet-based encryption"""
    
    def setup_method(self):
        """Set up test crypto instance"""
        self.crypto = WalletCrypto("0x1234567890abcdef1234567890abcdef12345678")
    
    def test_get_signing_message(self):
        """Test signing message generation"""
        message = self.crypto.get_signing_message()
        
        assert "HelixVault" in message
        assert "v1" in message.lower() or "V1" in message
    
    def test_get_signing_message_with_salt(self):
        """Test signing message with salt"""
        salt = os.urandom(16)
        message = self.crypto.get_signing_message(salt)
        
        assert "HelixVault" in message
        assert salt.hex() in message
    
    def test_derive_key_from_signature(self):
        """Test key derivation from signature"""
        # Simulate a signature (64 bytes)
        fake_signature = os.urandom(65)
        
        key = self.crypto.derive_key_from_signature(fake_signature)
        
        assert len(key) == 32  # 256-bit key
    
    def test_derive_key_deterministic(self):
        """Test that key derivation is deterministic with same inputs"""
        signature = os.urandom(65)
        salt = os.urandom(16)
        
        key1 = self.crypto.derive_key_from_signature(signature, salt)
        key2 = self.crypto.derive_key_from_signature(signature, salt)
        
        assert key1 == key2
    
    def test_derive_key_different_with_different_salt(self):
        """Test that different salts produce different keys"""
        signature = os.urandom(65)
        
        key1 = self.crypto.derive_key_from_signature(signature, os.urandom(16))
        key2 = self.crypto.derive_key_from_signature(signature, os.urandom(16))
        
        assert key1 != key2
    
    def test_encrypt_decrypt_roundtrip(self):
        """Test that encrypt/decrypt roundtrip works"""
        key = WalletCrypto.generate_random_key()
        original_data = b"This is test genetic data: ATCGATCGATCG"
        
        encrypted = self.crypto.encrypt_data(original_data, key, compress=False)
        decrypted = self.crypto.decrypt_data(encrypted, key)
        
        assert decrypted == original_data
    
    def test_encrypt_decrypt_with_compression(self):
        """Test encryption with compression"""
        key = WalletCrypto.generate_random_key()
        # Repetitive data compresses well
        original_data = b"ATCGATCGATCG" * 1000
        
        encrypted = self.crypto.encrypt_data(original_data, key, compress=True)
        decrypted = self.crypto.decrypt_data(encrypted, key)
        
        assert decrypted == original_data
        assert encrypted.compressed == True
    
    def test_encrypted_payload_serialization(self):
        """Test EncryptedPayload serialization/deserialization"""
        key = WalletCrypto.generate_random_key()
        original_data = b"Test data for serialization"
        
        encrypted = self.crypto.encrypt_data(original_data, key)
        
        # Serialize
        serialized = encrypted.to_bytes()
        
        # Deserialize
        restored = EncryptedPayload.from_bytes(serialized)
        
        # Should be able to decrypt
        decrypted = self.crypto.decrypt_data(restored, key)
        assert decrypted == original_data
    
    def test_wrong_key_fails_decryption(self):
        """Test that wrong key fails decryption"""
        key1 = WalletCrypto.generate_random_key()
        key2 = WalletCrypto.generate_random_key()
        original_data = b"Secret data"
        
        encrypted = self.crypto.encrypt_data(original_data, key1)
        
        with pytest.raises(ValueError):
            self.crypto.decrypt_data(encrypted, key2)
    
    def test_tampered_data_fails_decryption(self):
        """Test that tampered data fails decryption"""
        key = WalletCrypto.generate_random_key()
        original_data = b"Secret data"
        
        encrypted = self.crypto.encrypt_data(original_data, key)
        
        # Tamper with ciphertext
        tampered_ciphertext = bytearray(encrypted.ciphertext)
        tampered_ciphertext[0] ^= 0xFF  # Flip bits
        encrypted.ciphertext = bytes(tampered_ciphertext)
        
        with pytest.raises(ValueError):
            self.crypto.decrypt_data(encrypted, key)
    
    def test_generate_data_hash(self):
        """Test data hash generation"""
        data = b"Some genetic data"
        
        hash1 = self.crypto.generate_data_hash(data)
        hash2 = self.crypto.generate_data_hash(data)
        
        assert len(hash1) == 32  # SHA-256
        assert hash1 == hash2
    
    def test_generate_random_key(self):
        """Test random key generation"""
        key1 = WalletCrypto.generate_random_key()
        key2 = WalletCrypto.generate_random_key()
        
        assert len(key1) == 32
        assert len(key2) == 32
        assert key1 != key2


class TestSecureMemory:
    """Tests for secure memory handling"""
    
    def test_secure_wrap(self):
        """Test wrapping bytes as mutable bytearray"""
        data = b"sensitive"
        wrapped = SecureMemory.secure_wrap(data)
        
        assert isinstance(wrapped, bytearray)
        assert bytes(wrapped) == data
    
    def test_secure_delete(self):
        """Test secure deletion of memory"""
        sensitive = bytearray(b"super secret data here")
        
        SecureMemory.secure_delete(sensitive)
        
        # Should be zeroed
        assert all(b == 0 for b in sensitive)


class TestEncryptedPayload:
    """Tests for EncryptedPayload structure"""
    
    def test_payload_creation(self):
        """Test creating an EncryptedPayload"""
        payload = EncryptedPayload(
            version=1,
            algorithm="AES-256-GCM",
            salt=os.urandom(16),
            nonce=os.urandom(12),
            ciphertext=b"encrypted_data_here",
            tag=b"",
            original_hash=os.urandom(32),
            compressed=True
        )
        
        assert payload.version == 1
        assert payload.algorithm == "AES-256-GCM"
        assert payload.compressed == True
    
    def test_payload_roundtrip(self):
        """Test serialization roundtrip"""
        original = EncryptedPayload(
            version=1,
            algorithm="AES-256-GCM",
            salt=b"0" * 16,
            nonce=b"1" * 12,
            ciphertext=b"encrypted_data",
            tag=b"",
            original_hash=b"2" * 32,
            compressed=False
        )
        
        serialized = original.to_bytes()
        restored = EncryptedPayload.from_bytes(serialized)
        
        assert restored.version == original.version
        assert restored.algorithm == original.algorithm
        assert restored.salt == original.salt
        assert restored.nonce == original.nonce
        assert restored.original_hash == original.original_hash
        assert restored.compressed == original.compressed


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

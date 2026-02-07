"""
Tests for the HelixVault API
"""

import pytest
from fastapi.testclient import TestClient

# Import app
import sys
sys.path.insert(0, '..')
from api.main import app


client = TestClient(app)


class TestAPIRoot:
    """Test root endpoints"""
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "HelixVault"
        assert "version" in data
        assert data["status"] == "online"
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
    
    def test_config_endpoint(self):
        """Test configuration endpoint"""
        response = client.get("/config")
        
        assert response.status_code == 200
        data = response.json()
        assert "supported_formats" in data
        assert "supported_traits" in data
        assert "query_types" in data


class TestMintRoutes:
    """Test minting routes"""
    
    def test_get_signing_message(self):
        """Test getting signing message"""
        wallet = "0x1234567890abcdef1234567890abcdef12345678"
        response = client.get(f"/mint/signing-message/{wallet}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["wallet_address"] == wallet
    
    def test_get_supported_formats(self):
        """Test getting supported file formats"""
        response = client.get("/mint/supported-formats")
        
        assert response.status_code == 200
        data = response.json()
        assert "formats" in data
        assert len(data["formats"]) > 0


class TestQueryRoutes:
    """Test query routes"""
    
    def test_get_available_traits(self):
        """Test getting available traits"""
        response = client.get("/query/traits")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert any(t["trait"] == "eye_color" for t in data)
    
    def test_get_snp_info(self):
        """Test getting SNP information"""
        response = client.get("/query/snp-info/rs12913832")
        
        assert response.status_code == 200
        data = response.json()
        assert data["rsid"] == "rs12913832"
        assert data["gene"] == "HERC2"
    
    def test_get_snp_info_not_found(self):
        """Test SNP info for unknown SNP"""
        response = client.get("/query/snp-info/rs99999999")
        
        assert response.status_code == 404
    
    def test_snp_check(self):
        """Test SNP check endpoint"""
        response = client.post("/query/snp-check", json={
            "token_id": 1,
            "wallet_address": "0x1234",
            "signature": "0x" + "00" * 65,
            "rsid": "rs12913832"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["query_type"] == "SNP_CHECK"
        assert "result" in data
    
    def test_trait_prediction(self):
        """Test trait prediction endpoint"""
        response = client.post("/query/trait", json={
            "token_id": 1,
            "wallet_address": "0x1234",
            "signature": "0x" + "00" * 65,
            "trait": "eye_color"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "result" in data
        assert data["result"]["trait"] == "eye_color"
    
    def test_demo_analysis(self):
        """Test demo analysis endpoint"""
        response = client.get("/query/demo-analysis")
        
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert "eye_color" in data["predictions"]


class TestBountyRoutes:
    """Test bounty routes"""
    
    def test_list_bounties(self):
        """Test listing bounties"""
        response = client.get("/bounties")
        
        assert response.status_code == 200
        data = response.json()
        assert "bounties" in data
        assert "total" in data
        assert data["total"] > 0
    
    def test_get_bounty_categories(self):
        """Test getting bounty categories"""
        response = client.get("/bounties/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
    
    def test_get_marketplace_stats(self):
        """Test getting marketplace stats"""
        response = client.get("/bounties/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "active_bounties" in data
        assert "total_bounties" in data
    
    def test_get_single_bounty(self):
        """Test getting a single bounty"""
        response = client.get("/bounties/bounty_001")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "bounty_001"
        assert "reward_per_response" in data
    
    def test_get_nonexistent_bounty(self):
        """Test getting a bounty that doesn't exist"""
        response = client.get("/bounties/nonexistent_bounty")
        
        assert response.status_code == 404
    
    def test_check_bounty_match(self):
        """Test checking bounty match"""
        response = client.post("/bounties/check-match", json={
            "bounty_id": "bounty_001",
            "token_id": 1,
            "wallet_address": "0x1234",
            "signature": "0x" + "00" * 65
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        assert "potential_reward" in data


class TestErrorHandling:
    """Test error handling"""
    
    def test_invalid_endpoint(self):
        """Test accessing invalid endpoint"""
        response = client.get("/invalid/endpoint")
        
        assert response.status_code == 404
    
    def test_invalid_json(self):
        """Test sending invalid JSON"""
        response = client.post(
            "/query/snp-check",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

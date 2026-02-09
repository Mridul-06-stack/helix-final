import json
import os

def extract_abi():
    # Paths
    artifact_path = r"c:\Users\mridu\HELIX VAULT\Genome-1.0\artifacts\contracts\ResearcherRegistry.sol\ResearcherRegistry.json"
    frontend_abi_path = r"c:\Users\mridu\HELIX VAULT\Genome-1.0\frontend\src\contracts\ResearcherRegistry.abi.json"

    try:
        # Read artifact
        with open(artifact_path, 'r') as f:
            data = json.load(f)
            abi = data.get('abi')

        if not abi:
            print("❌ No ABI found in artifact")
            return

        # Write ABI to frontend
        with open(frontend_abi_path, 'w') as f:
            json.dump(abi, f, indent=2)
        
        print(f"✅ ABI extracted to {frontend_abi_path}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    extract_abi()

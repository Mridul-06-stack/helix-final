# HelixVault - Genomic Data NFT Platform

<div align="center">

🧬 **Privacy-Preserving Genomic Data Monetization** 🔐

*Turn your DNA into an NFT. Monetize insights without exposing your raw genetic data.*

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-green)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## 🌟 Overview

HelixVault is a DeSci (Decentralized Science) platform that allows users to:

1. **Encrypt** their genetic data (23andMe, Ancestry, VCF files)
2. **Mint** it as an NFT on Ethereum (Sepolia testnet)
3. **Monetize** by responding to research bounties
4. **Preserve Privacy** - AI agents answer queries without exposing raw DNA

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │ -> │   Encrypt   │ -> │    IPFS     │ -> │   Mint NFT  │
│  DNA File   │    │  AES-256    │    │   Storage   │    │  (Ethereum) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              v
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Researcher │ <- │  ZK Proof   │ <- │  AI Agent   │
│  Gets Y/N   │    │   (Result)  │    │  Analyzes   │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- MetaMask wallet

### 1. Clone & Install

```bash
cd HelixVault

# Install Node dependencies
npm install

# Install Python dependencies
cd ai-agent
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Deploy (Local Test)

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local
```

### 5. Start API Server

```bash
cd ai-agent
uvicorn api.main:app --reload --port 8000
```

### 6. Open API Docs

Visit: http://localhost:8000/docs

---

## 📁 Project Structure

```
HelixVault/
├── contracts/              # Solidity smart contracts
│   ├── GeneticNFT.sol     # Main NFT contract
│   ├── BountyMarket.sol   # Research marketplace
│   └── interfaces/
├── scripts/                # Deployment scripts
├── ai-agent/              # Python AI agent
│   ├── agent/             # Core agent logic
│   │   ├── genomic_agent.py
│   │   ├── snp_analyzer.py
│   │   └── zk_responder.py
│   ├── encryption/        # Crypto utilities
│   │   ├── wallet_crypto.py
│   │   └── ipfs_client.py
│   └── api/               # FastAPI server
│       └── routes/
├── frontend/              # React frontend (TODO)
└── test/                  # Contract tests
```

---

## 🔑 Key Features

### For Users (DNA Owners)

- **Upload & Encrypt**: Your genetic data is encrypted with your wallet signature
- **Mint NFT**: Receive an ERC-721 NFT representing ownership
- **Earn Crypto**: Respond to research bounties and get paid
- **Stay Private**: Raw DNA never leaves your control

### For Researchers

- **Post Bounties**: "Find me 100 people with blue eye genes"
- **Get Answers**: Receive yes/no + cryptographic proof
- **Pay Per Result**: Only pay for valid matches

### For Science

- **ZK Proofs**: Cryptographic proof of query results
- **Decentralized**: No central database of genetic data
- **Auditable**: All transactions on-chain

---

## 🧪 Supported Traits

The AI agent can analyze:

| Trait | SNP | Description |
|-------|-----|-------------|
| Eye Color | rs12913832 | Blue/Brown/Green prediction |
| Lactose Tolerance | rs4988235 | Dairy digestion ability |
| Muscle Type | rs1815739 | Power vs Endurance |
| Caffeine Metabolism | rs762551 | Fast/Slow metabolizer |
| Bitter Taste | rs713598 | Supertaster detection |
| Cilantro Taste | rs72921001 | Soapy taste perception |
| And more... | | |

---

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /mint/encrypt` | Encrypt genetic data |
| `POST /query/snp-check` | Check for specific SNP |
| `POST /query/trait` | Predict a trait |
| `GET /bounties` | List research bounties |
| `POST /bounties/respond` | Respond to a bounty |

Full API docs at `/docs` when running.

---

## 🔐 Security

- **AES-256-GCM** encryption for genetic data
- **Wallet-derived keys** - no separate key management
- **ZK Proofs** for query responses
- **No raw data exposure** - ever

---

## 📜 Smart Contracts

### GeneticNFT.sol

- ERC-721 with unlockable content
- Access control for AI agents
- Data integrity verification

### BountyMarket.sol

- Research bounty creation
- Automatic reward distribution
- Response tracking

---

## 🛣️ Roadmap

- [x] Smart contracts
- [x] Encryption pipeline
- [x] AI agent with SNP analysis
- [x] FastAPI backend
- [ ] React frontend
- [ ] Mobile app
- [ ] TEE integration (Intel SGX)
- [ ] Full ZK-SNARK proofs

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**Built with ❤️ for DeSci**

*Your DNA, Your Data, Your Profit*

</div>

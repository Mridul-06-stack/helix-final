// Contract addresses and ABIs
export const CONTRACTS = {
  RESEARCHER_REGISTRY: {
    address: '0x2D8175a94D9EcDba7d73619EcF895814a25E0A12' as `0x${string}`,
    chainId: 11155111, // Sepolia
  },
  // Add other contracts when deployed
  GENETIC_NFT: {
    address: '0x2fC5b7ed74E5A0476fb85389f87Aa24bd2Dc3379' as `0x${string}`,
    chainId: 11155111,
  },
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

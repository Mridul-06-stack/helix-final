// Contract addresses and ABIs
export const CONTRACTS = {
  RESEARCHER_REGISTRY: {
    address: '0xd850DA479cB9B0a95F3b5E65edF0cd6d7D841EAd' as `0x${string}`,
    chainId: 11155111, // Sepolia
  },
  // Add other contracts when deployed
  GENETIC_NFT: {
    address: '' as `0x${string}`,
    chainId: 11155111,
  },
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

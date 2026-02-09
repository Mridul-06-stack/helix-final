import GeneticNFTABI from './GeneticNFT.abi.json';
import ResearcherRegistryABI from './ResearcherRegistry.abi.json';

export const CONTRACTS = {
  GeneticNFT: {
    abi: GeneticNFTABI,
    address: '0x57c9B78a3f088b52e378ce37d740e2A3AEF33B28' as `0x${string}`,
  },
  ResearcherRegistry: {
    abi: ResearcherRegistryABI,
    address: '0x2D8175a94D9EcDba7d73619EcF895814a25E0A12' as `0x${string}`,
  },
};

export { GeneticNFTABI, ResearcherRegistryABI };

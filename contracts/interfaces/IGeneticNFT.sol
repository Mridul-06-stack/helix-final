// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGeneticNFT - Interface for GeneticNFT contract
 * @notice Interface used by BountyMarket and other contracts
 */
interface IGeneticNFT {
    
    struct GenomeData {
        string ipfsCID;
        bytes32 dataHash;
        string encryptionAlgo;
        string geneType;
        uint256 mintTimestamp;
        uint256 fileSize;
        bool isActive;
    }
    
    struct QueryAccess {
        address agent;
        uint256 expiry;
        bool isValid;
    }
    
    function mintGenome(
        string calldata ipfsCID,
        bytes32 dataHash,
        string calldata encryptionAlgo,
        string calldata geneType,
        uint256 fileSize,
        string calldata tokenURI_
    ) external payable returns (uint256);
    
    function getGenomeData(uint256 tokenId) external view returns (GenomeData memory);
    
    function getEncryptedDataCID(uint256 tokenId) external view returns (string memory);
    
    function verifyAccess(uint256 tokenId, address accessor) external view returns (bool);
    
    function grantQueryAccess(uint256 tokenId, address agent, uint256 duration) external;
    
    function revokeQueryAccess(uint256 tokenId, address agent) external;
    
    function deactivateGenome(uint256 tokenId) external;
    
    function getOwnedTokens(address owner) external view returns (uint256[] memory);
    
    function verifyDataIntegrity(uint256 tokenId, bytes32 dataHash) external view returns (bool);
    
    function ownerOf(uint256 tokenId) external view returns (address);
    
    function trustedAgents(address agent) external view returns (bool);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GeneticNFT - HelixVault Genomic Data NFT
 * @notice NFT representing ownership and access rights to encrypted genomic data
 * @dev The NFT acts as a KEY to decrypt off-chain genetic data stored on IPFS
 */
contract GeneticNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    
    // ============ Structs ============
    
    struct GenomeData {
        string ipfsCID;           // IPFS Content ID of encrypted file
        bytes32 dataHash;         // Keccak256 hash of original data for integrity verification
        string encryptionAlgo;    // Encryption algorithm used (e.g., "AES-256-GCM")
        string geneType;          // Type: "raw_sequence", "23andme", "ancestry", "vcf"
        uint256 mintTimestamp;    // When the NFT was minted
        uint256 fileSize;         // Size of the encrypted file in bytes
        bool isActive;            // Whether the genome data is still accessible
    }
    
    struct QueryAccess {
        address agent;            // Address of the AI agent with access
        uint256 expiry;           // Unix timestamp when access expires
        bool isValid;             // Whether access is currently valid
    }
    
    // ============ State Variables ============
    
    // Token ID => Genome Data
    mapping(uint256 => GenomeData) private _genomeData;
    
    // Token ID => Agent Address => Query Access
    mapping(uint256 => mapping(address => QueryAccess)) private _queryAccess;
    
    // Address => Token IDs owned (for easy lookup)
    mapping(address => uint256[]) private _ownedTokens;
    
    // Trusted AI agent addresses that can be granted access
    mapping(address => bool) public trustedAgents;
    
    // Platform fee for minting (in wei)
    uint256 public mintFee = 0.001 ether;
    
    // ============ Events ============
    
    event GenomeMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string ipfsCID,
        string geneType,
        uint256 timestamp
    );
    
    event QueryAccessGranted(
        uint256 indexed tokenId,
        address indexed agent,
        uint256 expiry
    );
    
    event QueryAccessRevoked(
        uint256 indexed tokenId,
        address indexed agent
    );
    
    event GenomeDeactivated(uint256 indexed tokenId);
    
    event TrustedAgentUpdated(address indexed agent, bool trusted);
    
    // ============ Constructor ============
    
    constructor() ERC721("HelixVault Genome", "HELIX") {}
    
    // ============ Public Functions ============
    
    /**
     * @notice Mint a new Genome NFT
     * @param ipfsCID IPFS Content ID of the encrypted genetic data
     * @param dataHash Hash of the original unencrypted data for integrity
     * @param encryptionAlgo The encryption algorithm used
     * @param geneType Type of genetic data (23andme, ancestry, vcf, etc.)
     * @param fileSize Size of the encrypted file in bytes
     * @param tokenURI_ Metadata URI for the NFT
     */
    function mintGenome(
        string calldata ipfsCID,
        bytes32 dataHash,
        string calldata encryptionAlgo,
        string calldata geneType,
        uint256 fileSize,
        string calldata tokenURI_
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(bytes(ipfsCID).length > 0, "Invalid IPFS CID");
        require(dataHash != bytes32(0), "Invalid data hash");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        
        _genomeData[newTokenId] = GenomeData({
            ipfsCID: ipfsCID,
            dataHash: dataHash,
            encryptionAlgo: encryptionAlgo,
            geneType: geneType,
            mintTimestamp: block.timestamp,
            fileSize: fileSize,
            isActive: true
        });
        
        _ownedTokens[msg.sender].push(newTokenId);
        
        emit GenomeMinted(newTokenId, msg.sender, ipfsCID, geneType, block.timestamp);
        
        // Refund excess payment
        if (msg.value > mintFee) {
            payable(msg.sender).transfer(msg.value - mintFee);
        }
        
        return newTokenId;
    }
    
    /**
     * @notice Get genome data for a token (public metadata only)
     * @param tokenId The token ID to query
     */
    function getGenomeData(uint256 tokenId) external view returns (GenomeData memory) {
        require(_exists(tokenId), "Token does not exist");
        return _genomeData[tokenId];
    }
    
    /**
     * @notice Get the IPFS CID for a token (only owner or authorized agent)
     * @param tokenId The token ID to query
     */
    function getEncryptedDataCID(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || _hasValidAccess(tokenId, msg.sender),
            "Not authorized to access data"
        );
        require(_genomeData[tokenId].isActive, "Genome data is deactivated");
        
        return _genomeData[tokenId].ipfsCID;
    }
    
    /**
     * @notice Verify if an address has access to a token's data
     * @param tokenId The token ID to check
     * @param accessor The address to verify
     */
    function verifyAccess(uint256 tokenId, address accessor) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        if (ownerOf(tokenId) == accessor) return true;
        return _hasValidAccess(tokenId, accessor);
    }
    
    /**
     * @notice Grant temporary query access to an AI agent
     * @param tokenId The token ID to grant access for
     * @param agent The AI agent address to grant access to
     * @param duration How long the access should last (in seconds)
     */
    function grantQueryAccess(
        uint256 tokenId,
        address agent,
        uint256 duration
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(trustedAgents[agent], "Agent is not trusted");
        require(duration > 0 && duration <= 1 days, "Invalid duration");
        
        uint256 expiry = block.timestamp + duration;
        
        _queryAccess[tokenId][agent] = QueryAccess({
            agent: agent,
            expiry: expiry,
            isValid: true
        });
        
        emit QueryAccessGranted(tokenId, agent, expiry);
    }
    
    /**
     * @notice Revoke query access from an AI agent
     * @param tokenId The token ID to revoke access for
     * @param agent The AI agent address to revoke access from
     */
    function revokeQueryAccess(uint256 tokenId, address agent) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        _queryAccess[tokenId][agent].isValid = false;
        
        emit QueryAccessRevoked(tokenId, agent);
    }
    
    /**
     * @notice Deactivate genome data (owner can do this for privacy)
     * @param tokenId The token ID to deactivate
     */
    function deactivateGenome(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        _genomeData[tokenId].isActive = false;
        
        emit GenomeDeactivated(tokenId);
    }
    
    /**
     * @notice Get all token IDs owned by an address
     * @param owner The address to query
     */
    function getOwnedTokens(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }
    
    /**
     * @notice Verify data integrity by checking hash
     * @param tokenId The token ID to verify
     * @param dataHash The hash to compare against
     */
    function verifyDataIntegrity(uint256 tokenId, bytes32 dataHash) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return _genomeData[tokenId].dataHash == dataHash;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add or remove a trusted AI agent
     * @param agent The agent address
     * @param trusted Whether the agent should be trusted
     */
    function setTrustedAgent(address agent, bool trusted) external onlyOwner {
        trustedAgents[agent] = trusted;
        emit TrustedAgentUpdated(agent, trusted);
    }
    
    /**
     * @notice Update the mint fee
     * @param newFee The new mint fee in wei
     */
    function setMintFee(uint256 newFee) external onlyOwner {
        mintFee = newFee;
    }
    
    /**
     * @notice Withdraw collected fees
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // ============ Internal Functions ============
    
    function _hasValidAccess(uint256 tokenId, address accessor) internal view returns (bool) {
        QueryAccess memory access = _queryAccess[tokenId][accessor];
        return access.isValid && access.expiry > block.timestamp;
    }
    
    // ============ Required Overrides ============
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete _genomeData[tokenId];
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IGeneticNFT.sol";

/**
 * @title BountyMarket - HelixVault Research Bounty Marketplace
 * @notice Allows researchers to post bounties for genomic data queries
 * @dev Researchers pay for answers to queries without accessing raw data
 */
contract BountyMarket is Ownable, ReentrancyGuard, Pausable {
    
    // ============ Structs ============
    
    struct Bounty {
        uint256 id;
        address researcher;       // Who created the bounty
        string queryType;         // Type: "SNP_CHECK", "TRAIT_QUERY", "VARIANT_SEARCH"
        string queryParams;       // JSON-encoded query parameters (e.g., {"rsid": "rs12913832"})
        uint256 rewardPerResponse; // Reward per valid response in wei
        uint256 maxResponses;     // Maximum number of responses wanted
        uint256 responseCount;    // Current number of responses
        uint256 totalFunded;      // Total ETH funded for this bounty
        uint256 remainingFunds;   // Remaining ETH for rewards
        uint256 createdAt;        // Creation timestamp
        uint256 expiresAt;        // Expiration timestamp
        bool isActive;            // Whether bounty is still accepting responses
    }
    
    struct Response {
        uint256 bountyId;
        uint256 tokenId;          // The Helix NFT token used
        address responder;        // NFT owner who responded
        bytes32 responseHash;     // Hash of the response (for verification)
        bytes zkProof;            // Zero-knowledge proof of the query result
        bool result;              // The boolean result (yes/no)
        uint256 timestamp;
        bool isPaid;              // Whether reward has been paid
    }
    
    // ============ State Variables ============
    
    IGeneticNFT public geneticNFT;
    
    uint256 private _bountyIdCounter;
    uint256 private _responseIdCounter;
    
    // Bounty ID => Bounty
    mapping(uint256 => Bounty) public bounties;
    
    // Response ID => Response
    mapping(uint256 => Response) public responses;
    
    // Bounty ID => Response IDs
    mapping(uint256 => uint256[]) public bountyResponses;
    
    // Token ID => Bounty ID => has responded
    mapping(uint256 => mapping(uint256 => bool)) public hasResponded;
    
    // Active bounty IDs
    uint256[] public activeBountyIds;
    
    // Platform fee percentage (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFeeBps = 250;
    
    // Minimum bounty duration (1 hour)
    uint256 public constant MIN_DURATION = 1 hours;
    
    // Maximum bounty duration (30 days)
    uint256 public constant MAX_DURATION = 30 days;
    
    // ============ Events ============
    
    event BountyCreated(
        uint256 indexed bountyId,
        address indexed researcher,
        string queryType,
        uint256 rewardPerResponse,
        uint256 maxResponses,
        uint256 expiresAt
    );
    
    event BountyResponse(
        uint256 indexed bountyId,
        uint256 indexed responseId,
        uint256 indexed tokenId,
        address responder,
        bool result
    );
    
    event RewardPaid(
        uint256 indexed bountyId,
        uint256 indexed responseId,
        address indexed responder,
        uint256 amount
    );
    
    event BountyCancelled(uint256 indexed bountyId, uint256 refundAmount);
    
    event BountyExpired(uint256 indexed bountyId);
    
    // ============ Constructor ============
    
    constructor(address _geneticNFT) {
        geneticNFT = IGeneticNFT(_geneticNFT);
    }
    
    // ============ Researcher Functions ============
    
    /**
     * @notice Create a new research bounty
     * @param queryType The type of query (SNP_CHECK, TRAIT_QUERY, etc.)
     * @param queryParams JSON-encoded query parameters
     * @param rewardPerResponse Amount to pay per valid response
     * @param maxResponses Maximum number of responses wanted
     * @param duration How long the bounty should be active (in seconds)
     */
    function createBounty(
        string calldata queryType,
        string calldata queryParams,
        uint256 rewardPerResponse,
        uint256 maxResponses,
        uint256 duration
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(bytes(queryType).length > 0, "Invalid query type");
        require(bytes(queryParams).length > 0, "Invalid query params");
        require(rewardPerResponse > 0, "Reward must be positive");
        require(maxResponses > 0, "Max responses must be positive");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");
        
        uint256 totalRequired = rewardPerResponse * maxResponses;
        uint256 platformFee = (totalRequired * platformFeeBps) / 10000;
        uint256 totalWithFee = totalRequired + platformFee;
        
        require(msg.value >= totalWithFee, "Insufficient funding");
        
        _bountyIdCounter++;
        uint256 bountyId = _bountyIdCounter;
        
        bounties[bountyId] = Bounty({
            id: bountyId,
            researcher: msg.sender,
            queryType: queryType,
            queryParams: queryParams,
            rewardPerResponse: rewardPerResponse,
            maxResponses: maxResponses,
            responseCount: 0,
            totalFunded: totalRequired,
            remainingFunds: totalRequired,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            isActive: true
        });
        
        activeBountyIds.push(bountyId);
        
        emit BountyCreated(
            bountyId,
            msg.sender,
            queryType,
            rewardPerResponse,
            maxResponses,
            block.timestamp + duration
        );
        
        // Refund excess payment (minus platform fee which stays)
        if (msg.value > totalWithFee) {
            payable(msg.sender).transfer(msg.value - totalWithFee);
        }
        
        return bountyId;
    }
    
    /**
     * @notice Cancel a bounty and get refund for remaining funds
     * @param bountyId The bounty to cancel
     */
    function cancelBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.researcher == msg.sender, "Not bounty creator");
        require(bounty.isActive, "Bounty not active");
        
        bounty.isActive = false;
        uint256 refundAmount = bounty.remainingFunds;
        bounty.remainingFunds = 0;
        
        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }
        
        emit BountyCancelled(bountyId, refundAmount);
    }
    
    // ============ Responder Functions ============
    
    /**
     * @notice Respond to a bounty with a genomic query result
     * @param bountyId The bounty to respond to
     * @param tokenId The Helix NFT token ID being used
     * @param result The boolean result of the query
     * @param zkProof Zero-knowledge proof of the result
     */
    function respondToBounty(
        uint256 bountyId,
        uint256 tokenId,
        bool result,
        bytes calldata zkProof
    ) external nonReentrant whenNotPaused {
        Bounty storage bounty = bounties[bountyId];
        
        require(bounty.isActive, "Bounty not active");
        require(block.timestamp < bounty.expiresAt, "Bounty expired");
        require(bounty.responseCount < bounty.maxResponses, "Max responses reached");
        require(!hasResponded[tokenId][bountyId], "Already responded with this token");
        
        // Verify caller owns the token
        require(geneticNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        
        // Verify token data is active
        IGeneticNFT.GenomeData memory genomeData = geneticNFT.getGenomeData(tokenId);
        require(genomeData.isActive, "Genome data not active");
        
        hasResponded[tokenId][bountyId] = true;
        bounty.responseCount++;
        
        _responseIdCounter++;
        uint256 responseId = _responseIdCounter;
        
        bytes32 responseHash = keccak256(abi.encodePacked(
            bountyId,
            tokenId,
            msg.sender,
            result,
            block.timestamp
        ));
        
        responses[responseId] = Response({
            bountyId: bountyId,
            tokenId: tokenId,
            responder: msg.sender,
            responseHash: responseHash,
            zkProof: zkProof,
            result: result,
            timestamp: block.timestamp,
            isPaid: false
        });
        
        bountyResponses[bountyId].push(responseId);
        
        emit BountyResponse(bountyId, responseId, tokenId, msg.sender, result);
        
        // Auto-pay reward
        _payReward(bountyId, responseId);
        
        // Check if bounty is complete
        if (bounty.responseCount >= bounty.maxResponses) {
            bounty.isActive = false;
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all active bounties
     */
    function getActiveBounties() external view returns (Bounty[] memory) {
        uint256 activeCount = 0;
        
        // Count active bounties
        for (uint256 i = 0; i < activeBountyIds.length; i++) {
            if (bounties[activeBountyIds[i]].isActive && 
                block.timestamp < bounties[activeBountyIds[i]].expiresAt) {
                activeCount++;
            }
        }
        
        // Build result array
        Bounty[] memory result = new Bounty[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeBountyIds.length; i++) {
            Bounty memory b = bounties[activeBountyIds[i]];
            if (b.isActive && block.timestamp < b.expiresAt) {
                result[index] = b;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get responses for a bounty
     * @param bountyId The bounty ID
     */
    function getBountyResponses(uint256 bountyId) external view returns (Response[] memory) {
        uint256[] memory responseIds = bountyResponses[bountyId];
        Response[] memory result = new Response[](responseIds.length);
        
        for (uint256 i = 0; i < responseIds.length; i++) {
            result[i] = responses[responseIds[i]];
        }
        
        return result;
    }
    
    /**
     * @notice Check if a token can respond to a bounty
     * @param tokenId The token ID
     * @param bountyId The bounty ID
     */
    function canRespond(uint256 tokenId, uint256 bountyId) external view returns (bool) {
        Bounty memory bounty = bounties[bountyId];
        
        if (!bounty.isActive) return false;
        if (block.timestamp >= bounty.expiresAt) return false;
        if (bounty.responseCount >= bounty.maxResponses) return false;
        if (hasResponded[tokenId][bountyId]) return false;
        
        try geneticNFT.getGenomeData(tokenId) returns (IGeneticNFT.GenomeData memory data) {
            return data.isActive;
        } catch {
            return false;
        }
    }
    
    // ============ Internal Functions ============
    
    function _payReward(uint256 bountyId, uint256 responseId) internal {
        Bounty storage bounty = bounties[bountyId];
        Response storage response = responses[responseId];
        
        require(!response.isPaid, "Already paid");
        require(bounty.remainingFunds >= bounty.rewardPerResponse, "Insufficient funds");
        
        response.isPaid = true;
        bounty.remainingFunds -= bounty.rewardPerResponse;
        
        payable(response.responder).transfer(bounty.rewardPerResponse);
        
        emit RewardPaid(bountyId, responseId, response.responder, bounty.rewardPerResponse);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update platform fee
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = newFeeBps;
    }
    
    /**
     * @notice Update the GeneticNFT contract address
     * @param _geneticNFT New contract address
     */
    function setGeneticNFT(address _geneticNFT) external onlyOwner {
        geneticNFT = IGeneticNFT(_geneticNFT);
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Withdraw platform fees
     */
    function withdrawFees() external onlyOwner {
        // Calculate fees (total balance minus all remaining bounty funds)
        uint256 totalBountyFunds = 0;
        for (uint256 i = 1; i <= _bountyIdCounter; i++) {
            totalBountyFunds += bounties[i].remainingFunds;
        }
        
        uint256 fees = address(this).balance - totalBountyFunds;
        if (fees > 0) {
            payable(owner()).transfer(fees);
        }
    }
    
    /**
     * @notice Process expired bounties
     * @param bountyIds Array of bounty IDs to check and expire
     */
    function processExpiredBounties(uint256[] calldata bountyIds) external {
        for (uint256 i = 0; i < bountyIds.length; i++) {
            Bounty storage bounty = bounties[bountyIds[i]];
            
            if (bounty.isActive && block.timestamp >= bounty.expiresAt) {
                bounty.isActive = false;
                
                // Refund remaining funds to researcher
                if (bounty.remainingFunds > 0) {
                    uint256 refund = bounty.remainingFunds;
                    bounty.remainingFunds = 0;
                    payable(bounty.researcher).transfer(refund);
                }
                
                emit BountyExpired(bountyIds[i]);
            }
        }
    }
}

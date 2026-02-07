// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ResearcherRegistry - Researcher Verification System
 * @notice Manages researcher verification and credentials
 * @dev Only verified researchers can create bounties
 */
contract ResearcherRegistry is AccessControl, Pausable {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    
    // ============ Enums ============
    
    enum VerificationStatus {
        NotRegistered,      // Not yet registered
        Pending,            // Submitted, awaiting review
        EmailVerified,      // Email verified, pending full verification
        FullyVerified,      // Fully verified and approved
        Suspended,          // Temporarily suspended
        Revoked             // Permanently revoked
    }
    
    // ============ Structs ============
    
    struct Researcher {
        address wallet;
        string name;
        string institution;
        string email;
        string orcidId;              // Optional ORCID identifier
        string researchField;        // e.g., "Genetics", "Oncology"
        string irbApprovalNumber;    // Optional IRB approval
        VerificationStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 reputationScore;     // 0-100 scale
        uint256 totalBounties;       // Number of bounties created
        uint256 successfulBounties;  // Number of completed bounties
        bool isActive;
    }
    
    struct VerificationRequest {
        address researcher;
        string documentsHash;        // IPFS hash of verification documents
        string notes;
        uint256 submittedAt;
        bool isProcessed;
    }
    
    // ============ State Variables ============
    
    // Wallet address => Researcher
    mapping(address => Researcher) public researchers;
    
    // Email => is used (prevent duplicate emails)
    mapping(string => bool) public usedEmails;
    
    // Verification request ID => Request
    mapping(uint256 => VerificationRequest) public verificationRequests;
    uint256 private _requestIdCounter;
    
    // Track all researcher addresses
    address[] public allResearchers;
    
    // Minimum reputation score to create bounties
    uint256 public minReputationScore = 50;
    
    // ============ Events ============
    
    event ResearcherRegistered(
        address indexed researcher,
        string name,
        string institution,
        string email
    );
    
    event VerificationRequested(
        uint256 indexed requestId,
        address indexed researcher,
        string documentsHash
    );
    
    event ResearcherVerified(
        address indexed researcher,
        VerificationStatus status,
        address indexed verifier
    );
    
    event ResearcherSuspended(
        address indexed researcher,
        string reason,
        address indexed admin
    );
    
    event ResearcherReactivated(
        address indexed researcher,
        address indexed admin
    );
    
    event ReputationUpdated(
        address indexed researcher,
        uint256 oldScore,
        uint256 newScore
    );
    
    event BountyStatsUpdated(
        address indexed researcher,
        uint256 totalBounties,
        uint256 successfulBounties
    );
    
    // ============ Constructor ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }
    
    // ============ Researcher Functions ============
    
    /**
     * @notice Register as a researcher
     * @param name Full name
     * @param institution University or research institution
     * @param email Institutional email address
     * @param researchField Primary research field
     */
    function registerResearcher(
        string calldata name,
        string calldata institution,
        string calldata email,
        string calldata researchField
    ) external whenNotPaused {
        require(researchers[msg.sender].wallet == address(0), "Already registered");
        require(bytes(name).length > 0, "Name required");
        require(bytes(institution).length > 0, "Institution required");
        require(bytes(email).length > 0, "Email required");
        require(!usedEmails[email], "Email already used");
        
        researchers[msg.sender] = Researcher({
            wallet: msg.sender,
            name: name,
            institution: institution,
            email: email,
            orcidId: "",
            researchField: researchField,
            irbApprovalNumber: "",
            status: VerificationStatus.Pending,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            reputationScore: 50, // Start at neutral
            totalBounties: 0,
            successfulBounties: 0,
            isActive: true
        });
        
        usedEmails[email] = true;
        allResearchers.push(msg.sender);
        
        emit ResearcherRegistered(msg.sender, name, institution, email);
    }
    
    /**
     * @notice Submit verification documents
     * @param documentsHash IPFS hash of encrypted verification documents
     * @param notes Additional notes for verifiers
     */
    function submitVerificationDocuments(
        string calldata documentsHash,
        string calldata notes
    ) external {
        require(researchers[msg.sender].wallet != address(0), "Not registered");
        require(
            researchers[msg.sender].status == VerificationStatus.Pending ||
            researchers[msg.sender].status == VerificationStatus.EmailVerified,
            "Invalid status for submission"
        );
        
        _requestIdCounter++;
        uint256 requestId = _requestIdCounter;
        
        verificationRequests[requestId] = VerificationRequest({
            researcher: msg.sender,
            documentsHash: documentsHash,
            notes: notes,
            submittedAt: block.timestamp,
            isProcessed: false
        });
        
        emit VerificationRequested(requestId, msg.sender, documentsHash);
    }
    
    /**
     * @notice Update researcher profile
     */
    function updateProfile(
        string calldata orcidId,
        string calldata irbApprovalNumber
    ) external {
        require(researchers[msg.sender].wallet != address(0), "Not registered");
        
        Researcher storage researcher = researchers[msg.sender];
        researcher.orcidId = orcidId;
        researcher.irbApprovalNumber = irbApprovalNumber;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Verify a researcher (admin only)
     * @param researcherAddress Address of the researcher
     * @param status New verification status
     */
    function verifyResearcher(
        address researcherAddress,
        VerificationStatus status
    ) external onlyRole(VERIFIER_ROLE) {
        require(researchers[researcherAddress].wallet != address(0), "Not registered");
        require(
            status == VerificationStatus.EmailVerified ||
            status == VerificationStatus.FullyVerified ||
            status == VerificationStatus.Suspended ||
            status == VerificationStatus.Revoked,
            "Invalid status"
        );
        
        Researcher storage researcher = researchers[researcherAddress];
        researcher.status = status;
        
        if (status == VerificationStatus.FullyVerified && researcher.verifiedAt == 0) {
            researcher.verifiedAt = block.timestamp;
        }
        
        if (status == VerificationStatus.Suspended || status == VerificationStatus.Revoked) {
            researcher.isActive = false;
        }
        
        emit ResearcherVerified(researcherAddress, status, msg.sender);
    }
    
    /**
     * @notice Process a verification request
     * @param requestId The request ID
     * @param approved Whether to approve or reject
     */
    function processVerificationRequest(
        uint256 requestId,
        bool approved
    ) external onlyRole(VERIFIER_ROLE) {
        VerificationRequest storage request = verificationRequests[requestId];
        require(!request.isProcessed, "Already processed");
        
        request.isProcessed = true;
        
        if (approved) {
            verifyResearcher(request.researcher, VerificationStatus.FullyVerified);
        }
    }
    
    /**
     * @notice Suspend a researcher
     * @param researcherAddress Address to suspend
     * @param reason Reason for suspension
     */
    function suspendResearcher(
        address researcherAddress,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) {
        require(researchers[researcherAddress].wallet != address(0), "Not registered");
        
        researchers[researcherAddress].status = VerificationStatus.Suspended;
        researchers[researcherAddress].isActive = false;
        
        emit ResearcherSuspended(researcherAddress, reason, msg.sender);
    }
    
    /**
     * @notice Reactivate a suspended researcher
     */
    function reactivateResearcher(address researcherAddress) external onlyRole(ADMIN_ROLE) {
        require(researchers[researcherAddress].wallet != address(0), "Not registered");
        require(
            researchers[researcherAddress].status == VerificationStatus.Suspended,
            "Not suspended"
        );
        
        researchers[researcherAddress].status = VerificationStatus.FullyVerified;
        researchers[researcherAddress].isActive = true;
        
        emit ResearcherReactivated(researcherAddress, msg.sender);
    }
    
    /**
     * @notice Update researcher reputation score
     * @param researcherAddress Address of researcher
     * @param newScore New reputation score (0-100)
     */
    function updateReputation(
        address researcherAddress,
        uint256 newScore
    ) external onlyRole(ADMIN_ROLE) {
        require(researchers[researcherAddress].wallet != address(0), "Not registered");
        require(newScore <= 100, "Score must be 0-100");
        
        uint256 oldScore = researchers[researcherAddress].reputationScore;
        researchers[researcherAddress].reputationScore = newScore;
        
        emit ReputationUpdated(researcherAddress, oldScore, newScore);
    }
    
    /**
     * @notice Update bounty statistics (called by BountyMarket contract)
     * @param researcherAddress Address of researcher
     * @param isSuccessful Whether the bounty was successful
     */
    function updateBountyStats(
        address researcherAddress,
        bool isSuccessful
    ) external {
        // TODO: Add access control - only BountyMarket contract can call this
        require(researchers[researcherAddress].wallet != address(0), "Not registered");
        
        Researcher storage researcher = researchers[researcherAddress];
        researcher.totalBounties++;
        
        if (isSuccessful) {
            researcher.successfulBounties++;
        }
        
        emit BountyStatsUpdated(
            researcherAddress,
            researcher.totalBounties,
            researcher.successfulBounties
        );
    }
    
    /**
     * @notice Set minimum reputation score
     */
    function setMinReputationScore(uint256 score) external onlyRole(ADMIN_ROLE) {
        require(score <= 100, "Score must be 0-100");
        minReputationScore = score;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if an address is a verified researcher
     */
    function isVerifiedResearcher(address researcherAddress) external view returns (bool) {
        Researcher memory researcher = researchers[researcherAddress];
        return researcher.status == VerificationStatus.FullyVerified &&
               researcher.isActive &&
               researcher.reputationScore >= minReputationScore;
    }
    
    /**
     * @notice Get researcher details
     */
    function getResearcher(address researcherAddress) 
        external 
        view 
        returns (Researcher memory) 
    {
        return researchers[researcherAddress];
    }
    
    /**
     * @notice Get all researchers
     */
    function getAllResearchers() external view returns (address[] memory) {
        return allResearchers;
    }
    
    /**
     * @notice Get pending verification requests
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 pendingCount = 0;
        
        // Count pending requests
        for (uint256 i = 1; i <= _requestIdCounter; i++) {
            if (!verificationRequests[i].isProcessed) {
                pendingCount++;
            }
        }
        
        // Build result array
        uint256[] memory result = new uint256[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _requestIdCounter; i++) {
            if (!verificationRequests[i].isProcessed) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    // ============ Pausable Functions ============
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}

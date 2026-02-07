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
        NotRegistered,
        Pending,
        EmailVerified,
        FullyVerified,
        Suspended,
        Revoked
    }

    // ============ Structs ============

    struct Researcher {
        address wallet;
        string name;
        string institution;
        string email;
        string orcidId;
        string researchField;
        string irbApprovalNumber;
        VerificationStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 reputationScore;
        uint256 totalBounties;
        uint256 successfulBounties;
        bool isActive;
    }

    struct VerificationRequest {
        address researcher;
        string documentsHash;
        string notes;
        uint256 submittedAt;
        bool isProcessed;
    }

    // ============ State Variables ============

    mapping(address => Researcher) public researchers;
    mapping(string => bool) public usedEmails;

    mapping(uint256 => VerificationRequest) public verificationRequests;
    uint256 private _requestIdCounter;

    address[] public allResearchers;

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
            reputationScore: 50,
            totalBounties: 0,
            successfulBounties: 0,
            isActive: true
        });

        usedEmails[email] = true;
        allResearchers.push(msg.sender);

        emit ResearcherRegistered(msg.sender, name, institution, email);
    }

    function submitVerificationDocuments(
        string calldata documentsHash,
        string calldata notes
    ) external {
        require(researchers[msg.sender].wallet != address(0), "Not registered");
        require(
            researchers[msg.sender].status == VerificationStatus.Pending ||
            researchers[msg.sender].status == VerificationStatus.EmailVerified,
            "Invalid status"
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

    function updateProfile(
        string calldata orcidId,
        string calldata irbApprovalNumber
    ) external {
        require(researchers[msg.sender].wallet != address(0), "Not registered");

        researchers[msg.sender].orcidId = orcidId;
        researchers[msg.sender].irbApprovalNumber = irbApprovalNumber;
    }

    // ============ INTERNAL VERIFICATION LOGIC ============

    function _verifyResearcherInternal(
        address researcherAddress,
        VerificationStatus status
    ) internal {
        Researcher storage researcher = researchers[researcherAddress];
        researcher.status = status;

        if (status == VerificationStatus.FullyVerified && researcher.verifiedAt == 0) {
            researcher.verifiedAt = block.timestamp;
        }

        if (
            status == VerificationStatus.Suspended ||
            status == VerificationStatus.Revoked
        ) {
            researcher.isActive = false;
        }

        emit ResearcherVerified(researcherAddress, status, msg.sender);
    }

    // ============ Admin / Verifier Functions ============

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

        _verifyResearcherInternal(researcherAddress, status);
    }

    function processVerificationRequest(
        uint256 requestId,
        bool approved
    ) external onlyRole(VERIFIER_ROLE) {
        VerificationRequest storage request = verificationRequests[requestId];
        require(!request.isProcessed, "Already processed");

        request.isProcessed = true;

        if (approved) {
            _verifyResearcherInternal(
                request.researcher,
                VerificationStatus.FullyVerified
            );
        }
    }

    function suspendResearcher(
        address researcherAddress,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) {
        require(researchers[researcherAddress].wallet != address(0), "Not registered");

        researchers[researcherAddress].status = VerificationStatus.Suspended;
        researchers[researcherAddress].isActive = false;

        emit ResearcherSuspended(researcherAddress, reason, msg.sender);
    }

    function reactivateResearcher(
        address researcherAddress
    ) external onlyRole(ADMIN_ROLE) {
        require(researchers[researcherAddress].wallet != address(0), "Not registered");
        require(
            researchers[researcherAddress].status == VerificationStatus.Suspended,
            "Not suspended"
        );

        researchers[researcherAddress].status = VerificationStatus.FullyVerified;
        researchers[researcherAddress].isActive = true;

        emit ResearcherReactivated(researcherAddress, msg.sender);
    }

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

    function updateBountyStats(
        address researcherAddress,
        bool isSuccessful
    ) external {
        // TODO: restrict to BountyMarket contract
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

    function setMinReputationScore(uint256 score) external onlyRole(ADMIN_ROLE) {
        require(score <= 100, "Score must be 0-100");
        minReputationScore = score;
    }

    // ============ View Functions ============

    function isVerifiedResearcher(
        address researcherAddress
    ) external view returns (bool) {
        Researcher memory researcher = researchers[researcherAddress];
        return
                researcher.status == VerificationStatus.FullyVerified &&
                researcher.isActive &&
                researcher.reputationScore >= minReputationScore;
    }

    function getResearcher(
        address researcherAddress
    ) external view returns (Researcher memory) {
        return researchers[researcherAddress];
    }

    function getAllResearchers() external view returns (address[] memory) {
        return allResearchers;
    }

    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 pendingCount;

        for (uint256 i = 1; i <= _requestIdCounter; i++) {
            if (!verificationRequests[i].isProcessed) {
                pendingCount++;
            }
        }

        uint256[] memory result = new uint256[](pendingCount);
        uint256 index;

        for (uint256 i = 1; i <= _requestIdCounter; i++) {
            if (!verificationRequests[i].isProcessed) {
                result[index++] = i;
            }
        }

        return result;
    }

    // ============ Pausable ============

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}

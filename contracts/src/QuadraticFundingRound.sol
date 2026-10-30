// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title QuadraticFundingRound
/// @notice A single quadratic-funding round with an on-chain eligibility allowlist,
///         integer square-root scoring, pool-scaled matching, and pull-based withdrawals.
///
/// @dev Round lifecycle
///      1. Operator deploys the contract, optionally funding the matching pool.
///      2. Operator registers projects and publishes a Merkle root of eligible
///         community members (the Road to Devcon attendee list).
///      3. Eligible addresses contribute during [startTime, endTime].
///      4. After endTime, anyone may call `finalize()` to compute each project's
///         score = (sum of sqrt(contributor totals))^2 and scale the scores to the pool.
///      5. Each project's payout address withdraws exactly once:
///         contributions + allocated match.
///
///      Precision: `Math.sqrt` floors each square root. `Math.mulDiv` performs the
///      pool scaling in full 512-bit precision. Matches are floored, therefore the
///      sum of all matches can never exceed `matchingPool`; the dust is reclaimable
///      by the operator after finalization.
///
///      Anti-gaming:
///      - Only addresses in the operator-published Merkle tree may contribute.
///      - Contributions are aggregated per (project, contributor), so splitting one
///        person's contribution across multiple transactions cannot inflate the score.
///      - A project payout address cannot contribute to its own project.
///      - Contributions are rejected before the start and after the end of the round.
contract QuadraticFundingRound is Ownable2Step, ReentrancyGuard {
    struct Project {
        address payout;
        string name;
        string metadataURI;
        uint256 contributions;
        uint256 matchAmount;
        bool withdrawn;
    }

    /// @notice Unix timestamp at which contributions open (inclusive).
    uint64 public immutable startTime;
    /// @notice Unix timestamp at which contributions close (inclusive).
    uint64 public immutable endTime;

    /// @notice Merkle root over `keccak256(abi.encode(address))` leaves.
    bytes32 public eligibilityRoot;

    /// @notice ETH reserved for matching, tracked separately from contributions.
    uint256 public matchingPool;
    /// @notice Sum of all contributions held by this contract.
    uint256 public totalContributions;
    /// @notice Sum of all project scores, set during finalization.
    uint256 public totalScore;
    /// @notice Sum of all allocated matches, set during finalization.
    uint256 public totalMatchAllocated;
    /// @notice Pool amount that could not be allocated because of floor division.
    uint256 public unallocatedPool;

    bool public finalized;
    bool public unallocatedPoolReclaimed;

    Project[] private _projects;
    mapping(uint256 projectId => mapping(address contributor => uint256 amount)) public contributionsOf;
    mapping(uint256 projectId => address[] contributors) private _contributors;
    mapping(address payout => bool) public isRegisteredPayout;

    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed payout,
        string name,
        string metadataURI
    );
    event Contribution(
        uint256 indexed projectId,
        address indexed contributor,
        uint256 amount,
        uint256 contributorTotal
    );
    event EligibilityRootUpdated(bytes32 indexed root);
    event PoolFunded(address indexed funder, uint256 amount);
    event RoundFinalized(uint256 totalScore, uint256 matchingPool, uint256 totalMatchAllocated);
    event MatchFinalized(uint256 indexed projectId, uint256 score, uint256 matchAmount);
    event Withdrawal(
        uint256 indexed projectId,
        address indexed payout,
        uint256 contributions,
        uint256 matchAmount
    );
    event UnallocatedPoolReclaimed(address indexed operator, uint256 amount);

    error ZeroAddress();
    error InvalidRoundWindow();
    error RoundNotStarted();
    error RoundEnded();
    error RoundStillOpen();
    error RoundNotFinalized();
    error AlreadyFinalized();
    error AlreadyWithdrawn();
    error NotEligible();
    error ZeroAmount();
    error ZeroRoot();
    error EmptyName();
    error InvalidProject();
    error DuplicatePayout();
    error SelfContribution();
    error NotProjectPayout();
    error NothingToWithdraw();
    error DirectEthTransferNotAllowed();
    error TransferFailed();

    /// @param initialOwner Address of the round operator (Arjun).
    /// @param initialEligibilityRoot Merkle root of eligible contributors. May be zero
    ///        at deployment and published later with `setEligibilityRoot`.
    /// @param startTime_ Unix timestamp when contributions open.
    /// @param endTime_ Unix timestamp when contributions close.
    constructor(
        address initialOwner,
        bytes32 initialEligibilityRoot,
        uint64 startTime_,
        uint64 endTime_
    ) payable Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        if (startTime_ >= endTime_ || endTime_ <= block.timestamp) revert InvalidRoundWindow();

        startTime = startTime_;
        endTime = endTime_;
        eligibilityRoot = initialEligibilityRoot;

        if (msg.value != 0) {
            matchingPool = msg.value;
            emit PoolFunded(msg.sender, msg.value);
        }
    }

    // ---------------------------------------------------------------------
    // Operator actions
    // ---------------------------------------------------------------------

    /// @notice Registers a project that can receive contributions.
    /// @dev Only the operator may register. Registration closes when the round ends.
    function registerProject(
        address payout,
        string calldata name,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 projectId) {
        if (block.timestamp >= endTime) revert RoundEnded();
        if (finalized) revert AlreadyFinalized();
        if (payout == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        if (isRegisteredPayout[payout]) revert DuplicatePayout();

        projectId = _projects.length;
        _projects.push(
            Project({
                payout: payout,
                name: name,
                metadataURI: metadataURI,
                contributions: 0,
                matchAmount: 0,
                withdrawn: false
            })
        );
        isRegisteredPayout[payout] = true;

        emit ProjectRegistered(projectId, payout, name, metadataURI);
    }

    /// @notice Adds ETH to the matching pool. Only callable before the round ends.
    function fundPool() external payable onlyOwner {
        if (block.timestamp >= endTime) revert RoundEnded();
        if (finalized) revert AlreadyFinalized();
        if (msg.value == 0) revert ZeroAmount();

        matchingPool += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }

    /// @notice Publishes a new eligibility Merkle root.
    /// @dev Can be updated until the round ends so the operator can onboard late
    ///      verified attendees. Contributions already made remain counted.
    function setEligibilityRoot(bytes32 newRoot) external onlyOwner {
        if (block.timestamp >= endTime) revert RoundEnded();
        if (finalized) revert AlreadyFinalized();
        if (newRoot == bytes32(0)) revert ZeroRoot();

        eligibilityRoot = newRoot;
        emit EligibilityRootUpdated(newRoot);
    }

    /// @notice Returns the remaining pool to the operator after finalization.
    /// @dev Only the unallocated dust is transferred; contributions and allocated
    ///      matches remain in the contract for projects to withdraw.
    function reclaimUnallocatedPool() external onlyOwner nonReentrant {
        if (!finalized) revert RoundNotFinalized();
        if (unallocatedPoolReclaimed) revert AlreadyWithdrawn();

        uint256 amount = unallocatedPool;
        if (amount == 0) revert NothingToWithdraw();

        // State first, external call last.
        unallocatedPoolReclaimed = true;
        unallocatedPool = 0;

        emit UnallocatedPoolReclaimed(msg.sender, amount);
        _sendEth(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Contributor actions
    // ---------------------------------------------------------------------

    /// @notice Contributes to a project. The caller must be in the eligibility tree.
    /// @param projectId Index of the project in the registration order.
    /// @param proof Merkle proof for `msg.sender` against `eligibilityRoot`.
    function contribute(uint256 projectId, bytes32[] calldata proof) external payable nonReentrant {
        if (block.timestamp < startTime) revert RoundNotStarted();
        if (block.timestamp > endTime) revert RoundEnded();
        if (finalized) revert AlreadyFinalized();
        if (projectId >= _projects.length) revert InvalidProject();
        if (msg.value == 0) revert ZeroAmount();

        Project storage project = _projects[projectId];
        if (msg.sender == project.payout) revert SelfContribution();
        if (!isEligible(msg.sender, proof)) revert NotEligible();

        uint256 previous = contributionsOf[projectId][msg.sender];
        if (previous == 0) {
            _contributors[projectId].push(msg.sender);
        }

        uint256 updated = previous + msg.value;
        contributionsOf[projectId][msg.sender] = updated;
        project.contributions += msg.value;
        totalContributions += msg.value;

        // The contributor address is indexed so off-chain indexers can rebuild
        // the full contribution graph and verify the square-root math.
        emit Contribution(projectId, msg.sender, msg.value, updated);
    }

    // ---------------------------------------------------------------------
    // Finalization and withdrawal
    // ---------------------------------------------------------------------

    /// @notice Computes every project's quadratic score and scales matches to the pool.
    /// @dev Permissionless after the round ends. Matches are floored, so the sum of
    ///      matches is always less than or equal to the matching pool.
    function finalize() external nonReentrant {
        if (block.timestamp <= endTime) revert RoundStillOpen();
        if (finalized) revert AlreadyFinalized();

        uint256 projectCount_ = _projects.length;
        uint256[] memory scores = new uint256[](projectCount_);
        uint256 scoreSum;

        for (uint256 i = 0; i < projectCount_; i++) {
            uint256 score = _computeScore(i);
            scores[i] = score;
            scoreSum += score;
        }

        totalScore = scoreSum;
        uint256 pool = matchingPool;
        uint256 allocated;

        for (uint256 i = 0; i < projectCount_; i++) {
            uint256 matchAmount;
            if (scoreSum != 0 && pool != 0) {
                // Full-precision floor(score * pool / totalScore). This is the
                // "pool divided by the sum of all scores" scaling required by QF.
                matchAmount = Math.mulDiv(scores[i], pool, scoreSum);
            }

            _projects[i].matchAmount = matchAmount;
            allocated += matchAmount;
            emit MatchFinalized(i, scores[i], matchAmount);
        }

        // Defensive invariant: flooring can only leave dust, never over-allocate.
        if (allocated > pool) revert TransferFailed();

        totalMatchAllocated = allocated;
        unallocatedPool = pool - allocated;
        finalized = true;

        emit RoundFinalized(scoreSum, pool, allocated);
    }

    /// @notice Withdraws a project's contributions plus its allocated match.
    /// @dev Callable only by the registered payout address, exactly once. State is
    ///      updated before the external call (checks-effects-interactions).
    function withdraw(uint256 projectId) external nonReentrant {
        if (!finalized) revert RoundNotFinalized();
        if (projectId >= _projects.length) revert InvalidProject();

        Project storage project = _projects[projectId];
        if (msg.sender != project.payout) revert NotProjectPayout();
        if (project.withdrawn) revert AlreadyWithdrawn();

        uint256 contributionAmount = project.contributions;
        uint256 matchAmount = project.matchAmount;
        uint256 amount = contributionAmount + matchAmount;
        if (amount == 0) revert NothingToWithdraw();

        // Effects before interaction: a second call reverts on `withdrawn`.
        project.withdrawn = true;

        emit Withdrawal(projectId, project.payout, contributionAmount, matchAmount);
        _sendEth(project.payout, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Number of registered projects.
    function projectCount() external view returns (uint256) {
        return _projects.length;
    }

    /// @notice Returns a project by id.
    function getProject(uint256 projectId) external view returns (Project memory) {
        if (projectId >= _projects.length) revert InvalidProject();
        return _projects[projectId];
    }

    /// @notice Returns every project. Intended for off-chain readers.
    function getProjects() external view returns (Project[] memory) {
        return _projects;
    }

    /// @notice Returns the distinct contributors of a project.
    function getContributors(uint256 projectId) external view returns (address[] memory) {
        if (projectId >= _projects.length) revert InvalidProject();
        return _contributors[projectId];
    }

    /// @notice Computes the current (pre-finalization) score of a project.
    /// @dev Mirrors the exact math used in `finalize`, so anyone can preview it.
    function scoreOf(uint256 projectId) external view returns (uint256) {
        if (projectId >= _projects.length) revert InvalidProject();
        return _computeScore(projectId);
    }

    /// @notice Leaf format used by the eligibility Merkle tree.
    function eligibilityLeaf(address account) public pure returns (bytes32) {
        return keccak256(abi.encode(account));
    }

    /// @notice Verifies an address against the current eligibility root.
    function isEligible(address account, bytes32[] calldata proof) public view returns (bool) {
        if (eligibilityRoot == bytes32(0)) return false;
        return MerkleProof.verify(proof, eligibilityRoot, eligibilityLeaf(account));
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev (sum of floor(sqrt(contributorTotal)))^2
    function _computeScore(uint256 projectId) internal view returns (uint256) {
        address[] storage projectContributors = _contributors[projectId];
        uint256 sumOfRoots;

        for (uint256 i = 0; i < projectContributors.length; i++) {
            uint256 amount = contributionsOf[projectId][projectContributors[i]];
            if (amount != 0) {
                sumOfRoots += Math.sqrt(amount);
            }
        }

        return sumOfRoots * sumOfRoots;
    }

    function _sendEth(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @dev ETH must enter through `contribute` or `fundPool` so accounting stays exact.
    receive() external payable {
        revert DirectEthTransferNotAllowed();
    }
}

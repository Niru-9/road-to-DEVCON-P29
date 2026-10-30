// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";

contract QuadraticFundingRoundTest is Test {
    QuadraticFundingRound internal round;

    address internal operator = address(0xA11CE0);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);
    address internal dave = address(0xDA7E);
    address internal eve = address(0xE7E);

    address internal payout0 = address(0xF000);
    address internal payout1 = address(0xF001);
    address internal payout2 = address(0xF002);

    uint64 internal start;
    uint64 internal end;
    uint256 internal constant POOL = 9 ether;

    function setUp() public {
        vm.warp(1_700_000_000);
        start = uint64(block.timestamp);
        end = uint64(block.timestamp + 7 days);
        round = new QuadraticFundingRound{value: POOL}(operator, bytes32(0), start, end);

        // Fund every actor so payable calls exercise contract logic instead of
        // failing early on an empty balance (which reverts without data).
        vm.deal(operator, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.deal(dave, 100 ether);
        vm.deal(eve, 100 ether);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function _leaves() internal view returns (bytes32[] memory leaves) {
        address[4] memory members = [alice, bob, carol, dave];
        leaves = new bytes32[](4);
        for (uint256 i = 0; i < 4; i++) {
            leaves[i] = round.eligibilityLeaf(members[i]);
        }
    }

    function _installEligibility() internal {
        bytes32[] memory leaves = _leaves();
        vm.prank(operator);
        round.setEligibilityRoot(_root(leaves));
    }

    function _proof(address account) internal view returns (bytes32[] memory) {
        bytes32[] memory leaves = _leaves();
        return _proofFor(leaves, round.eligibilityLeaf(account));
    }

    function _sort(bytes32[] memory values) internal pure {
        for (uint256 i = 1; i < values.length; i++) {
            bytes32 key = values[i];
            uint256 j = i;
            while (j > 0 && values[j - 1] > key) {
                values[j] = values[j - 1];
                j--;
            }
            values[j] = key;
        }
    }

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function _root(bytes32[] memory leaves) internal pure returns (bytes32) {
        _sort(leaves);
        uint256 n = leaves.length;
        while (n > 1) {
            uint256 next = (n + 1) / 2;
            for (uint256 i = 0; i < next; i++) {
                uint256 left = 2 * i;
                uint256 right = left + 1;
                leaves[i] = right < n ? _hashPair(leaves[left], leaves[right]) : leaves[left];
            }
            n = next;
        }
        return leaves[0];
    }

    function _proofFor(bytes32[] memory leaves, bytes32 leaf) internal pure returns (bytes32[] memory) {
        _sort(leaves);
        uint256 index = type(uint256).max;
        for (uint256 i = 0; i < leaves.length; i++) {
            if (leaves[i] == leaf) {
                index = i;
                break;
            }
        }
        require(index != type(uint256).max, "leaf not found");

        uint256 levels;
        uint256 count = leaves.length;
        while (count > 1) {
            levels++;
            count = (count + 1) / 2;
        }

        bytes32[] memory proof = new bytes32[](levels);
        uint256 p;
        uint256 n = leaves.length;

        while (n > 1) {
            uint256 sibling = index ^ 1;
            if (sibling < n) {
                proof[p++] = leaves[sibling];
            }

            uint256 next = (n + 1) / 2;
            for (uint256 i = 0; i < next; i++) {
                uint256 left = 2 * i;
                uint256 right = left + 1;
                leaves[i] = right < n ? _hashPair(leaves[left], leaves[right]) : leaves[left];
            }
            n = next;
            index /= 2;
        }

        assembly {
            mstore(proof, p)
        }
        return proof;
    }

    function _registerDefaults() internal {
        vm.startPrank(operator);
        round.registerProject(payout0, "Tamil wallet docs", "ipfs://project-0");
        round.registerProject(payout1, "Marathi Solidity series", "ipfs://project-1");
        vm.stopPrank();
    }

    function _contribute(address contributor, uint256 projectId, uint256 amount) internal {
        // Build the proof BEFORE prank: `_proof` makes external static calls that
        // would otherwise consume the prank, making `contribute` run as this test.
        bytes32[] memory proof = _proof(contributor);
        vm.prank(contributor);
        round.contribute{value: amount}(projectId, proof);
    }

    // ------------------------------------------------------------------
    // Test 8: only the operator registers projects
    // ------------------------------------------------------------------

    function test_OnlyOperatorCanRegisterProjects() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), alice));
        round.registerProject(payout0, "Unauthorized", "");

        vm.prank(operator);
        uint256 id = round.registerProject(payout0, "Tamil wallet docs", "ipfs://project-0");
        assertEq(id, 0);
        assertEq(round.projectCount(), 1);
    }

    function test_RegisterRevertsForDuplicatePayout() public {
        vm.startPrank(operator);
        round.registerProject(payout0, "One", "");
        vm.expectRevert(QuadraticFundingRound.DuplicatePayout.selector);
        round.registerProject(payout0, "Two", "");
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Test 3: eligibility is checked on-chain
    // ------------------------------------------------------------------

    function test_ContributeRevertsForIneligibleAddress() public {
        _installEligibility();
        _registerDefaults();

        vm.prank(eve);
        vm.expectRevert(QuadraticFundingRound.NotEligible.selector);
        round.contribute{value: 1 ether}(0, new bytes32[](0));

        bytes32[] memory proof = _proof(alice);
        vm.prank(alice);
        round.contribute{value: 1 ether}(0, proof);
        assertEq(round.contributionsOf(0, alice), 1 ether);
    }

    function test_ContributeRevertsWithoutProofEvenIfAddressWasEligible() public {
        _installEligibility();
        _registerDefaults();

        vm.prank(alice);
        vm.expectRevert(QuadraticFundingRound.NotEligible.selector);
        round.contribute{value: 1 ether}(0, new bytes32[](0));
    }

    // ------------------------------------------------------------------
    // Test 5: contribution events carry the contributor
    // ------------------------------------------------------------------

    function test_ContributionEventCarriesContributor() public {
        _installEligibility();
        _registerDefaults();

        vm.expectEmit(true, true, false, true, address(round));
        emit QuadraticFundingRound.Contribution(0, alice, 1 ether, 1 ether);
        _contribute(alice, 0, 1 ether);
    }

    function test_RepeatedContributionsAggregatePerContributor() public {
        _installEligibility();
        _registerDefaults();

        _contribute(alice, 0, 1 ether);
        _contribute(alice, 0, 3 ether);

        // One person contributing twice is counted as one contributor with 4 ETH,
        // not as sqrt(1) + sqrt(3). This prevents within-address splitting games.
        assertEq(round.contributionsOf(0, alice), 4 ether);
        // sqrt(4 ether) = 2e9, then (2e9)^2 = 4e18 = 4 ether of score units.
        assertEq(round.scoreOf(0), 4 ether);
    }

    // ------------------------------------------------------------------
    // Test 1: score is (sum of square roots)^2
    // ------------------------------------------------------------------

    function test_ScoreIsSquareOfSummedSquareRoots() public {
        _installEligibility();
        _registerDefaults();

        _contribute(alice, 0, 1 ether);
        _contribute(bob, 0, 4 ether);
        _contribute(carol, 0, 9 ether);

        uint256 sqrt1 = 1e9;
        uint256 sqrt4 = 2e9;
        uint256 sqrt9 = 3e9;
        uint256 expected = (sqrt1 + sqrt4 + sqrt9) ** 2;

        assertEq(round.scoreOf(0), expected);
    }

    // ------------------------------------------------------------------
    // Tests 6 and 7: round window
    // ------------------------------------------------------------------

    function test_FinalizeRevertsBeforeRoundEnds() public {
        _registerDefaults();
        vm.expectRevert(QuadraticFundingRound.RoundStillOpen.selector);
        round.finalize();
    }

    function test_ContributeRevertsAfterRoundEnds() public {
        _installEligibility();
        _registerDefaults();
        vm.warp(end + 1);
        bytes32[] memory proof = _proof(alice);

        vm.prank(alice);
        vm.expectRevert(QuadraticFundingRound.RoundEnded.selector);
        round.contribute{value: 1 ether}(0, proof);
    }

    function test_ContributeRevertsBeforeRoundStarts() public {
        vm.warp(start - 1);
        _installEligibility();
        _registerDefaults();
        bytes32[] memory proof = _proof(alice);

        vm.prank(alice);
        vm.expectRevert(QuadraticFundingRound.RoundNotStarted.selector);
        round.contribute{value: 1 ether}(0, proof);
    }

    function test_WithdrawRevertsBeforeFinalization() public {
        _installEligibility();
        _registerDefaults();
        _contribute(alice, 0, 1 ether);

        vm.prank(payout0);
        vm.expectRevert(QuadraticFundingRound.RoundNotFinalized.selector);
        round.withdraw(0);
    }

    // ------------------------------------------------------------------
    // Test 2: matches scaled to the pool, never exceed it
    // ------------------------------------------------------------------

    function test_MatchesScaleToPoolAndNeverExceedIt() public {
        _installEligibility();
        vm.startPrank(operator);
        round.registerProject(payout0, "P0", "");
        round.registerProject(payout1, "P1", "");
        round.registerProject(payout2, "P2", "");
        vm.stopPrank();

        _contribute(alice, 0, 1 ether);
        _contribute(bob, 0, 4 ether);
        _contribute(alice, 1, 1 ether);
        _contribute(dave, 1, 16 ether);
        _contribute(bob, 2, 9 ether);

        uint256 score0 = round.scoreOf(0);
        uint256 score1 = round.scoreOf(1);
        uint256 score2 = round.scoreOf(2);
        uint256 scoreSum = score0 + score1 + score2;

        vm.warp(end + 1);
        round.finalize();

        assertEq(round.totalScore(), scoreSum);
        assertLe(round.totalMatchAllocated(), POOL);
        assertEq(round.unallocatedPool(), POOL - round.totalMatchAllocated());

        QuadraticFundingRound.Project memory p0 = round.getProject(0);
        QuadraticFundingRound.Project memory p1 = round.getProject(1);
        QuadraticFundingRound.Project memory p2 = round.getProject(2);

        assertEq(p0.matchAmount, (score0 * POOL) / scoreSum);
        assertEq(p1.matchAmount, (score1 * POOL) / scoreSum);
        assertEq(p2.matchAmount, (score2 * POOL) / scoreSum);
        assertEq(p0.matchAmount + p1.matchAmount + p2.matchAmount, round.totalMatchAllocated());
    }

    function test_ZeroContributionsLeavesPoolUnallocated() public {
        _registerDefaults();
        vm.warp(end + 1);
        round.finalize();

        assertEq(round.totalScore(), 0);
        assertEq(round.totalMatchAllocated(), 0);
        assertEq(round.unallocatedPool(), POOL);

        vm.prank(operator);
        round.reclaimUnallocatedPool();
        assertEq(address(round).balance, 0);
    }

    // ------------------------------------------------------------------
    // Test 4: each project withdraws only once (CEI + reentrancy guard)
    // ------------------------------------------------------------------

    function test_ProjectCanWithdrawOnlyOnce() public {
        _installEligibility();
        _registerDefaults();

        _contribute(alice, 0, 1 ether);
        _contribute(bob, 0, 4 ether);
        _contribute(alice, 1, 1 ether);

        vm.warp(end + 1);
        round.finalize();

        QuadraticFundingRound.Project memory project = round.getProject(0);
        uint256 expected = project.contributions + project.matchAmount;
        assertGt(expected, 0);

        uint256 before = payout0.balance;
        vm.prank(payout0);
        round.withdraw(0);
        assertEq(payout0.balance, before + expected);
        QuadraticFundingRound.Project memory afterWithdraw = round.getProject(0);
        assertTrue(afterWithdraw.withdrawn);

        vm.prank(payout0);
        vm.expectRevert(QuadraticFundingRound.AlreadyWithdrawn.selector);
        round.withdraw(0);
    }

    function test_OnlyPayoutCanWithdraw() public {
        _installEligibility();
        _registerDefaults();
        _contribute(alice, 0, 1 ether);

        vm.warp(end + 1);
        round.finalize();

        vm.prank(alice);
        vm.expectRevert(QuadraticFundingRound.NotProjectPayout.selector);
        round.withdraw(0);
    }

    function test_ReentrantPayoutCannotWithdrawTwice() public {
        ReentrantPayout attacker = new ReentrantPayout();
        vm.prank(operator);
        round.registerProject(address(attacker), "Reentrant", "");
        // The attacker is the only registered project, so its id is 0.
        attacker.setRound(round, 0);

        _installEligibility();
        _contribute(alice, 0, 1 ether);
        _contribute(bob, 0, 4 ether);

        vm.warp(end + 1);
        round.finalize();

        uint256 roundBalanceBefore = address(round).balance;
        attacker.claim();

        QuadraticFundingRound.Project memory project = round.getProject(0);
        uint256 expected = project.contributions + project.matchAmount;
        assertEq(address(attacker).balance, expected);
        assertEq(address(round).balance, roundBalanceBefore - expected);
    }

    // ------------------------------------------------------------------
    // Accounting and access control
    // ------------------------------------------------------------------

    function test_ReclaimUnallocatedPoolOnlyAfterFinalization() public {
        vm.prank(operator);
        vm.expectRevert(QuadraticFundingRound.RoundNotFinalized.selector);
        round.reclaimUnallocatedPool();
    }

    function test_OperatorCanFundPoolBeforeEnd() public {
        vm.prank(operator);
        round.fundPool{value: 1 ether}();
        assertEq(round.matchingPool(), POOL + 1 ether);
    }

    function test_DirectEthTransferIsRejected() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok, ) = address(round).call{value: 1 ether}("");
        assertFalse(ok);
    }

    function test_ScoreOfRejectsUnknownProject() public {
        vm.expectRevert(QuadraticFundingRound.InvalidProject.selector);
        round.scoreOf(99);
    }

    function test_ContributionsAndMatchesAreFullyWithdrawable() public {
        _installEligibility();
        _registerDefaults();
        _contribute(alice, 0, 1 ether);
        _contribute(bob, 0, 4 ether);
        _contribute(carol, 1, 9 ether);

        vm.warp(end + 1);
        round.finalize();

        QuadraticFundingRound.Project memory project0 = round.getProject(0);
        QuadraticFundingRound.Project memory project1 = round.getProject(1);
        uint256 p0 = project0.contributions + project0.matchAmount;
        uint256 p1 = project1.contributions + project1.matchAmount;

        vm.prank(payout0);
        round.withdraw(0);
        vm.prank(payout1);
        round.withdraw(1);

        assertEq(address(round).balance, round.unallocatedPool());
        assertEq(payout0.balance + payout1.balance, p0 + p1);
    }
}

/// @dev A project payout that attempts to re-enter `withdraw` during the ETH transfer.
contract ReentrantPayout {
    QuadraticFundingRound private round;
    uint256 private projectId;

    function setRound(QuadraticFundingRound round_, uint256 projectId_) external {
        round = round_;
        projectId = projectId_;
    }

    function claim() external {
        round.withdraw(projectId);
    }

    receive() external payable {
        if (address(round).balance > 0) {
            try round.withdraw(projectId) {} catch {}
        }
    }
}

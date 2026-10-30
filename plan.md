Two Hundred Small Backers Should Beat One Whale
Arjun has a matching pool from a local sponsor and about a dozen grassroots projects that want a share before Devcon 8:

Tamil and Kannada translations of wallet docs
a Marathi Solidity video series
a student Ethereum club in Guwahati
a meetup kit for tier-3 cities
He doesn't want a committee picking winners. He wants the community to decide, in a way where breadth of support matters more than the size of one cheque. He's read about quadratic funding and likes the idea.

He has also watched a past round go wrong. One project topped the leaderboard with "supporters" who turned out to be the same person. He knows who the real community members are, because he has the list from ten weeks of Road to Devcon events. And when the round ends, he has to publish a result that a project lead who got less can check for themselves.

What you'll learn

How quadratic funding turns many small contributions into a matching signal
Doing square-root math in integers on the EVM without losing precision
Why matching mechanisms are only as good as their resistance to gaming
What to do

Let Arjun register the projects and fund the matching pool.
Let eligible community members contribute to any project during a fixed round window.
When the round closes, compute each project's quadratic match from the pool.
Let each project withdraw its contributions plus its match.
Deploy to Sepolia and record the deployed address in your repo.
Build a results page that shows why each project received what it did, so anyone can verify the math.
Deliverable. A public GitHub repo with the contracts, a deploy script, the deployed Sepolia address, and the frontend.

Acceptance criteria

When the round closes, every project lead can see their match, check the math themselves, and claim it, and nobody could have bought the result.
10 scored test cases · 80 points are read straight off your code — open the Test cases tab to see exactly what they are before you build.

Suggested stack

Solidity
Foundry
OpenZeppelin Contracts
Ethereum Attestation Service
Scaffold-ETH 2
viem
Sepolia




Get started
npx loopshouse add road-to-devcon-xi
Copy
Before you run it

Needs Node 20.12+ (22 LTS recommended) — check with node -v, and switch with nvm use 22if you're older. Sign-in opens in your browser (Google, GitHub, or an email code) — nothing to copy or paste.

Run it in your project directory — it installs this battle's agent skill and signs you in, then you build with your own coding agent.

How to use
Via CLI
Query this problem's knowledge graph straight from your terminal:

loops knowledge query --event road-to-devcon-xi --problem devcon-india-quadratic-round -q "<your question>"
Copy
Via IDE
Once the skill is installed, your coding agent knows this battle — just ask it in plain English inside your IDE:

Ask the "Two Hundred Small Backers Should Beat One Whale" knowledge graph: <your question>


Test cases

10

Points from checks

80 /100

Points from judgment

20

Each check is answered by reading the repo you submit — pass it, bank its points.

1.Match uses the square of summed square roots

15
Passes if Each project's score is computed as the square of the sum of the square roots of its contributions, (Σ√c)², before the pool is divided.

Fails if Matches are proportional to raw totals or contributor counts, some other formula is used, or the repo contains no match computation.

2.Total matches cannot exceed the matching pool

15
Passes if Each project's match is scaled by the pool divided by the sum of all projects' scores (or capped by an equivalent rule), so the matches together never exceed the pool.

Fails if Raw scores are paid out without scaling to the pool, so total matches can exceed what the pool holds, or there is no conversion from score to payout.

3.Contribute checks eligibility in the contract

10
Passes if The contribute function reverts for an address that does not satisfy the onchain eligibility condition.

Fails if Eligibility is checked only in the frontend or a backend, anyone can contribute, or there is no eligibility concept at all.

4.Each project can withdraw only once

10
Passes if The flag or zeroed payout is written before the ETH transfer and checked on entry, so a second call reverts or pays nothing.

Fails if A project can call withdraw again to receive more, the state update follows the external call with no reentrancy guard, or there is no withdraw function.

5.Contribution events carry the contributor's address

6
Passes if The event declaration includes the contributor's address as a parameter.

Fails if The event omits the contributor, no event is emitted on contribution, or there is no contribute function.

6.Match finalization reverts before the round ends

6
Passes if That function reverts unless block.timestamp is past the round end.

Fails if Matches can be finalized or withdrawn while the round is open, or the contract stores no round end.

7.Contributions revert after the round closes

5
Passes if The contribute function reverts when block.timestamp is past the round end.

Fails if The window is enforced only in the UI, the contribute function has no time check, or the contract stores no round end.

8.Only the round operator can register projects

5
Passes if Registration reverts for any caller other than the operator, or projects are set only in the constructor with no other way to add one.

Fails if Any address can register a project, or the contract has no notion of registered projects.

9.Deployed Sepolia address is recorded in the repo

3
Passes if A contract address for the Sepolia deployment appears in a tracked file.

Fails if No deployed contract address appears anywhere in the repo.

10.No credentials appear in any tracked file

5
Passes if No private key, seed phrase, API key, or authenticated RPC URL appears in any tracked file.

Fails if Any such credential appears in a tracked file.
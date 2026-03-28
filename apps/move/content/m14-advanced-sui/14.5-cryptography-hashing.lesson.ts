import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '14.5',
  title: 'Cryptography & Hashing',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'On-Chain Crypto Primitives',
      content: `Sui provides built-in hash functions for content addressing, verification, and commit-reveal patterns. Both live in \`std::hash\`:

\`\`\`move
module frontier::crypto_demo;

use std::hash;

fun hash_examples() {
    // SHA2-256 — the most common general-purpose hash
    let digest = hash::sha2_256(b"frontier data");

    // SHA3-256 — newer standard, additional security margin
    let digest2 = hash::sha3_256(b"frontier data");
}
\`\`\`

Both functions:
- Accept \`vector<u8>\` as input
- Return \`vector<u8>\` (32 bytes / 256 bits)
- Are deterministic — same input always produces same output

### When to use which

| Hash | Use case |
|------|----------|
| SHA2-256 | General purpose, most common — use this by default |
| SHA3-256 | Where a newer standard is required by a protocol |

### Signature verification

For verifying off-chain signatures on-chain, Sui provides \`sui::ed25519::ed25519_verify(sig, pk, msg)\`. The common pattern is a server signs a message off-chain with its private key; the contract stores the public key and verifies the signature when a player submits it. Useful for server-signed item grants, one-time permits, and allowlists.`,
    },
    {
      type: 'LEARN',
      title: 'Practical: Commit-Reveal',
      content: `The **commit-reveal** pattern is a classic use of hashing in smart contracts. It lets you hide a choice until the right moment — preventing front-running.

### The problem
In an on-chain auction or game, if you submit your choice openly, others can see it and react before your transaction is finalized.

### The solution: two phases

**Phase 1 — Commit:** Hash your choice + a secret. Store only the hash.
\`\`\`move
module frontier::commit_reveal;

use std::hash;

public struct Game has key {
    id: UID,
    commitment: vector<u8>,
}

public fun commit(game: &mut Game, hash: vector<u8>) {
    game.commitment = hash;
}
\`\`\`

**Phase 2 — Reveal:** Provide the original choice + secret. Hash them and verify the hash matches.
\`\`\`move
public fun reveal(game: &mut Game, choice: vector<u8>, secret: vector<u8>): bool {
    let mut data = choice;
    data.append(secret);
    let hash = hash::sha2_256(data);
    hash == game.commitment
}
\`\`\`

Nobody can see your choice during the commit phase (they only see the hash). During reveal, the contract verifies you committed to what you claim.

**Use cases in EVE Frontier:**
- Hidden fleet movements — commit coordinates, reveal after everyone has moved
- Sealed-bid auctions — commit bid amounts, reveal simultaneously
- Rock-paper-scissors style combat choices`,
    },
    {
      type: 'TASK',
      title: 'Commit-Reveal System',
      content: `Build a commit-reveal system for hidden game choices.

For example:

\`\`\`move
public fun submit_bid(auction: &mut Auction, hash: vector<u8>) {
    auction.bid_hash = hash;
}

public fun reveal_bid(auction: &mut Auction, amount: vector<u8>, salt: vector<u8>): bool {
    let mut data = amount;
    data.append(salt);
    hash::sha2_256(data) == auction.bid_hash
}
\`\`\``,
      task: `Write a commit-reveal module:

1. \`commit(game: &mut Game, hash: vector<u8>)\` — stores the hash in \`game.commitment\`
2. \`reveal(game: &mut Game, choice: vector<u8>, secret: vector<u8>): bool\` — appends secret to choice, hashes with \`hash::sha2_256\`, and returns whether it matches \`game.commitment\``,
      hint: `\`\`\`move
public fun commit(game: &mut Game, hash: vector<u8>) {
    game.commitment = hash;
}

public fun reveal(game: &mut Game, choice: vector<u8>, secret: vector<u8>): bool {
    let mut data = choice;
    data.append(secret);
    let hash = hash::sha2_256(data);
    hash == game.commitment
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::commit_reveal;

use std::hash;

public struct Game has key {
    id: UID,
    commitment: vector<u8>,
}

// Write commit — store the hash in game.commitment


// Write reveal — hash choice+secret with sha2_256, compare to commitment


#[test]
fun test_commit_reveal() {
    let mut game = Game {
        id: object::new(&mut tx_context::dummy()),
        commitment: vector[],
    };

    // Commit: hash of "attack" + "mysecret"
    let mut data = b"attack";
    data.append(b"mysecret");
    let hash = hash::sha2_256(data);
    commit(&mut game, hash);

    // Reveal with correct choice + secret
    assert!(reveal(&mut game, b"attack", b"mysecret") == true, 0);

    // Reveal with wrong choice
    assert!(reveal(&mut game, b"defend", b"mysecret") == false, 1);

    let Game { id, commitment: _ } = game;
    id.delete();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*commit_reveal\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::commit_reveal;' },
        { test: (code: string) => /fun\s+commit\s*\(/.test(code), errorMsg: 'Write a function called commit.' },
        { test: (code: string) => /fun\s+reveal\s*\(/.test(code), errorMsg: 'Write a function called reveal.' },
        { test: (code: string) => /sha2_256/.test(code), errorMsg: 'Use hash::sha2_256 to hash the choice + secret.' },
        { test: (code: string) => /commitment/.test(code), errorMsg: 'Store and compare against game.commitment.' },
        { test: (code: string) => /append/.test(code), errorMsg: 'Append the secret to the choice before hashing.' },
        { test: (code: string) => /bool/.test(code), errorMsg: 'reveal should return a bool.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::commit_reveal::test_commit_reveal
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 14.5 — Summary',
      content: `- **\`std::hash::sha2_256\`** and **\`std::hash::sha3_256\`** — accept \`vector<u8>\`, return 32-byte \`vector<u8>\`
- **\`sui::ed25519::ed25519_verify(sig, pk, msg)\`** — verifies an ed25519 signature on-chain; returns \`bool\`
- **Server-signed permit pattern**: store a public key on-chain, have the server sign messages, verify in the contract
- **Commit-reveal pattern**: hash(choice + secret) to hide, then reveal and verify
- Commit-reveal prevents front-running in games, auctions, and competitive scenarios`,
    },
  ],
};
export default lesson;

# Course Registry

Records Learn Move course completions on-chain. Learners register their wallet
address and a display name; a `CourseCompleted` event is emitted for each first
registration and used by the frontend to build the completers list.

## Deployed — Stillness (Sui Testnet)

| Key | Value |
|-----|-------|
| **Package ID** | `0xe438072a5a07f43ec521877fed8a8d50421d284b8f603df90e91540f3677429f` |
| **Registry Object ID** | `0xc255bfc7a8694ef292650af87d8ec3ec06c91ba87fa25798d186fe1ffe89d5a9` |
| **UpgradeCap ID** | `0x02120c5c48849422b6d99bb971d11574924b633f9d24812c843a7cb76439259d` |
| **Deploy Tx** | `PQqPBpf1uxPPyDKh3ehkcX5o8egtc82TJH1QnXbiSH3` |
| **Deployer** | `0xe2eded98fa755561a171d4405c71b2cf28a7ee9c85b123a07134a6457965b94f` |
| **Epoch** | 1052 |
| **Date** | 2026-03-28 |

## Key functions

```bash
# Register course 1 completion (name is UTF-8 bytes, max 64 bytes)
sui client call \
  --package 0xe438072a5a07f43ec521877fed8a8d50421d284b8f603df90e91540f3677429f \
  --module course_registry \
  --function register_course1 \
  --args 0xc255bfc7a8694ef292650af87d8ec3ec06c91ba87fa25798d186fe1ffe89d5a9 \
         '"Your Name"' \
  --gas-budget 10000000

# Register course 2 completion
sui client call \
  --package 0xe438072a5a07f43ec521877fed8a8d50421d284b8f603df90e91540f3677429f \
  --module course_registry \
  --function register_course2 \
  --args 0xc255bfc7a8694ef292650af87d8ec3ec06c91ba87fa25798d186fe1ffe89d5a9 \
         '"Your Name"' \
  --gas-budget 10000000
```

## Querying completers (frontend)

Events are indexed by type — query all `CourseCompleted` events to get the list:

```
suix_queryEvents filter: { MoveEventType: "{PACKAGE_ID}::course_registry::CourseCompleted" }
```

Each event contains: `learner` (address), `course` (1 or 2), `name` (string), `epoch`.

## Re-deploying

If struct changes are needed, a fresh publish is required (Sui's compatible
upgrade policy doesn't allow new struct fields). Update the IDs in this file
and in `apps/move/src/lib/registry-constants.ts` after each fresh deploy.

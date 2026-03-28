import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '14.4',
  title: 'BCS Serialization',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Binary Encoding',
      content: `**BCS** (Binary Canonical Serialization) is Sui's standard encoding format. Every transaction, every object — all serialized with BCS. Understanding it lets you do powerful things:

- Pass structured data between modules as raw bytes
- Integrate with off-chain systems
- Compact storage for complex data

### Encoding

\`\`\`move
module frontier::bcs_demo;

use sui::bcs;

fun encode_coordinates(x: u64, y: u64): vector<u8> {
    let mut bytes = vector[];
    bytes.append(bcs::to_bytes(&x));
    bytes.append(bcs::to_bytes(&y));
    bytes
}
\`\`\`

\`bcs::to_bytes(&value)\` serializes any value into a \`vector<u8>\`.

### Decoding

Decoding is the reverse — create a \`BCS\` wrapper and "peel" values off in order:

\`\`\`move
fun decode_coordinates(data: vector<u8>): (u64, u64) {
    let mut bcs = bcs::new(data);
    let x = bcs.peel_u64();
    let y = bcs.peel_u64();
    (x, y)
}
\`\`\`

**Order matters!** You must peel values in the exact same order they were encoded.`,
    },
    {
      type: 'LEARN',
      title: 'Peel Functions',
      content: `The \`BCS\` wrapper provides peel functions for all primitive types:

| Function | Peels |
|----------|-------|
| \`peel_u8()\` | Single byte |
| \`peel_u64()\` | 8-byte unsigned integer |
| \`peel_u128()\` | 16-byte unsigned integer |
| \`peel_bool()\` | Boolean (1 byte) |
| \`peel_address()\` | 32-byte address |
| \`peel_vec_u8()\` | Byte vector (length-prefixed) |

### Practical example: trade orders

\`\`\`move
module frontier::trade_encoding;

use sui::bcs;

fun encode_trade(item_id: u64, price: u64, is_buy: bool): vector<u8> {
    let mut bytes = vector[];
    bytes.append(bcs::to_bytes(&item_id));
    bytes.append(bcs::to_bytes(&price));
    bytes.append(bcs::to_bytes(&is_buy));
    bytes
}

fun decode_trade(data: vector<u8>): (u64, u64, bool) {
    let mut bcs = bcs::new(data);
    let item_id = bcs.peel_u64();
    let price = bcs.peel_u64();
    let is_buy = bcs.peel_bool();
    (item_id, price, is_buy)
}
\`\`\`

This is how off-chain systems communicate structured data to on-chain contracts — encode off-chain, decode on-chain.`,
    },
    {
      type: 'TASK',
      title: 'Encode & Decode Orders',
      content: `Build encoding and decoding functions for a market order.

For example:

\`\`\`move
public fun encode_point(x: u64, y: u64): vector<u8> {
    let mut bytes = vector[];
    bytes.append(bcs::to_bytes(&x));
    bytes.append(bcs::to_bytes(&y));
    bytes
}

public fun decode_point(data: vector<u8>): (u64, u64) {
    let mut b = bcs::new(data);
    (b.peel_u64(), b.peel_u64())
}
\`\`\``,
      task: `Write encode/decode functions for market orders:

1. \`encode_order(price: u64, quantity: u64): vector<u8>\` — encode price then quantity using \`bcs::to_bytes\` and append to a vector
2. \`decode_order(data: vector<u8>): (u64, u64)\` — decode using \`bcs::new\` and \`peel_u64\`, returning (price, quantity)`,
      hint: `\`\`\`move
public fun encode_order(price: u64, quantity: u64): vector<u8> {
    let mut bytes = vector[];
    bytes.append(bcs::to_bytes(&price));
    bytes.append(bcs::to_bytes(&quantity));
    bytes
}

public fun decode_order(data: vector<u8>): (u64, u64) {
    let mut bcs_data = bcs::new(data);
    let price = bcs_data.peel_u64();
    let quantity = bcs_data.peel_u64();
    (price, quantity)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::market_order;

use sui::bcs;

// Write encode_order(price, quantity) -> vector<u8>
// Encode price first, then quantity


// Write decode_order(data) -> (u64, u64)
// Decode in the same order: price, then quantity


#[test]
fun test_roundtrip() {
    let encoded = encode_order(1500, 42);
    let (price, quantity) = decode_order(encoded);
    assert!(price == 1500, 0);
    assert!(quantity == 42, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*market_order\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::market_order;' },
        { test: (code: string) => /fun\s+encode_order\s*\(/.test(code), errorMsg: 'Write a function called encode_order.' },
        { test: (code: string) => /fun\s+decode_order\s*\(/.test(code), errorMsg: 'Write a function called decode_order.' },
        { test: (code: string) => /to_bytes/.test(code), errorMsg: 'Use bcs::to_bytes(&value) to encode values.' },
        { test: (code: string) => /bcs\s*::\s*new/.test(code), errorMsg: 'Use bcs::new(data) to create a BCS decoder.' },
        { test: (code: string) => /peel_u64/.test(code), errorMsg: 'Use peel_u64() to decode the u64 values.' },
        { test: (code: string) => /vector<u8>/.test(code), errorMsg: 'encode_order should return vector<u8>.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::market_order::test_roundtrip
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 14.4 — Summary',
      content: `- **BCS** (Binary Canonical Serialization) is Sui's standard encoding format
- **Encode**: \`bcs::to_bytes(&value)\` converts any value to \`vector<u8>\`
- **Decode**: create \`bcs::new(data)\`, then peel values with \`peel_u8()\`, \`peel_u64()\`, \`peel_u128()\`, \`peel_bool()\`, \`peel_address()\`, \`peel_vec_u8()\`
- **Order matters** — peel in the same order values were encoded
- Use cases: cross-module data passing, off-chain integration, compact storage`,
    },
  ],
};
export default lesson;

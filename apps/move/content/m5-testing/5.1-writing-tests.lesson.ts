import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '5.1',
  title: 'Writing Tests',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'The Move Test Framework',
      content: `Move has a built-in test framework. Tests live in the same file as the code they test, annotated with \`#[test]\`.

\`\`\`move
public fun double(x: u64): u64 { x * 2 }

#[test]
fun test_double() {
    assert!(double(5) == 10, 1);
    assert!(double(0) == 0, 2);
}
\`\`\`

Run tests with: \`sui move test\`

### Test-Only Code

Use \`#[test_only]\` for helpers that should only exist in the test environment:

\`\`\`move
#[test_only]
use some::package::helper;
\`\`\`

### Expected Failures

Test that a function aborts correctly:

\`\`\`move
#[test]
#[expected_failure(abort_code = 1)]
fun test_refuel_rejects_zero() {
    refuel(0); // this should abort with code 1
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Write a Unit Test',
      content: `Write a function and verify it works with a unit test.`,
      task: `In module \`testing::demo\`: (1) write \`public fun double(x: u64): u64\` that returns \`x * 2\`, then (2) write a \`#[test]\` function named \`test_double\` that uses \`assert!\` to verify \`double(5) == 10\`.`,
      hint: `Mark the test function with \`#[test]\` on the line above \`fun test_double()\``,
      bonus: null,
      starterCode: `module testing::demo;\n\n// Write public fun double(x: u64): u64 { x * 2 }\n// Write a #[test] function test_double\n// that asserts double(5) == 10\n\n`,
      checks: [
        { test: code => /public\s+fun\s+double\s*\(\s*\w+\s*:\s*u64\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: public fun double(x: u64): u64 { ... }' },
        { test: code => /#\[test\]/.test(code), errorMsg: 'Add the #[test] attribute before your test function' },
        { test: code => /fun\s+test_double/.test(code), errorMsg: 'Name the test function: test_double' },
        { test: code => /assert!/.test(code), errorMsg: 'Use assert! to verify the result inside test_double' },
      ],
      successOutput: `$ sui move test\n   Running tests in testing::demo\n   [ PASS ] testing::demo::test_double\n\nTest result: OK. 1 passed; 0 failed; 0 skipped.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 5.1 — Summary',
      content: `- Move has a built-in test framework using the \`#[test]\` attribute
- Tests live in the same file as the code they test
- Run tests with \`sui move test\`
- Use \`#[test_only]\` for test-only imports and helpers
- Use \`#[expected_failure(abort_code = N)]\` to test that a function aborts correctly
- \`assert!(condition, error_code)\` verifies expected behavior in tests`,
    },
  ],
};
export default lesson;

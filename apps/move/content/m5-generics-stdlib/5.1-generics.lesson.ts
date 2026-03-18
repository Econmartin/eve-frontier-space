import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '5.1',
  title: 'Generics',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Writing Code That Works with Any Type',
      content: `You've been using \`vector<u64>\` and \`vector<u8>\` since module 3. The angle brackets \`<T>\` mean "this works with any type." That's **generics** — writing code once that works with many different types.

### Generic functions

A generic function declares a **type parameter** in angle brackets after the function name:

\`\`\`move
module frontier::utils;

fun identity<T>(x: T): T {
    x   // works for ANY type
}
\`\`\`

\`T\` is a placeholder. When you call \`identity(42u64)\`, the compiler fills in \`T = u64\`. When you call \`identity(true)\`, it fills in \`T = bool\`.

You can have multiple type parameters:

\`\`\`move
fun swap<A, B>(a: A, b: B): (B, A) {
    (b, a)
}
\`\`\`

### Type inference

The compiler usually figures out the type from context:

\`\`\`move
let x = identity(42);       // inferred: identity<u64>(42)
let (b, a) = swap(1, true); // inferred: swap<u64, bool>(1, true)
\`\`\`

You can also specify types explicitly when needed:

\`\`\`move
let x = identity<u64>(42);  // explicit
\`\`\`

### Ability constraints

Without constraints, a generic type can only be **moved** — you can't copy, drop, or store it. Add constraints with \`:\` to require abilities:

\`\`\`move
// T must have copy — so we can duplicate it
fun duplicate<T: copy>(x: T): (T, T) {
    (copy x, x)
}

// T must have copy AND drop
fun first_or_default<T: copy + drop>(v: &vector<T>, default: T): T {
    if (v.is_empty()) {
        default
    } else {
        v[0]
    }
}

// No constraints — can only move T
fun consume<T>(x: T): T {
    x   // just passes it through
}
\`\`\`

The \`+\` syntax combines constraints: \`T: copy + drop + store\` means T must have all three.`,
    },
    {
      type: 'TASK',
      title: 'Generic Functions',
      content: `Write functions that work with any type.`,
      task: `Write two generic functions:

1. \`fun wrap_pair<T: copy + drop>(a: T, b: T): (T, T, T)\` — returns \`(a, b, a)\`. Since you use \`a\` twice, \`T\` needs \`copy\`.
2. \`fun pick_first<T>(a: T, _b: T): T\` — returns only \`a\`. The second value is moved in and discarded, so \`T\` needs \`drop\`.`,
      hint: `\`\`\`move
fun wrap_pair<T: copy + drop>(a: T, b: T): (T, T, T) {
    (copy a, b, a)
}

fun pick_first<T: drop>(a: T, _b: T): T {
    a
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::generics;

// Write wrap_pair<T: copy + drop>(a: T, b: T): (T, T, T)
// Returns (a, b, a) — uses a twice, so T needs copy


// Write pick_first<T: drop>(a: T, _b: T): T
// Returns a, discards b — so T needs drop


#[test]
fun test_generics() {
    let (x, y, z) = wrap_pair(10u64, 20u64);
    assert!(x == 10 && y == 20 && z == 10, 0);

    let result = pick_first(true, false);
    assert!(result == true, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*generics\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::generics;' },
        { test: (code: string) => /fun\s+wrap_pair\s*</.test(code), errorMsg: 'Write a generic function: fun wrap_pair<T: copy + drop>(...' },
        { test: (code: string) => /fun\s+pick_first\s*</.test(code), errorMsg: 'Write a generic function: fun pick_first<T: drop>(...' },
        { test: (code: string) => /copy\s+\w/.test(code), errorMsg: 'Use the copy keyword to duplicate the value in wrap_pair.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::generics::test_generics
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Generic Structs',
      content: `Structs can also be generic. You've already used one — \`vector<T>\` is a generic struct!

\`\`\`move
module frontier::containers;

public struct Pair<T1, T2> has copy, drop {
    first: T1,
    second: T2,
}
\`\`\`

This creates a **family** of types: \`Pair<u64, bool>\`, \`Pair<u8, u8>\`, etc. Each is a distinct type — you can't mix them up.

### Creating and using generic structs

\`\`\`move
fun example() {
    let coords = Pair { first: 10u64, second: 20u64 };
    // type inferred as Pair<u64, u64>

    let mixed = Pair { first: 42, second: true };
    // type inferred as Pair<u64, bool>
}
\`\`\`

### Generic functions on generic structs

\`\`\`move
fun get_first<T1: copy, T2>(pair: &Pair<T1, T2>): T1 {
    pair.first
}
\`\`\`

Reading \`pair.first\` copies the value out, so \`T1\` needs \`copy\`.

### Conditional abilities

Here's a subtle but important point. When a struct declares abilities, those abilities depend on whether the type parameters satisfy them too:

\`\`\`move
public struct Box<T> has copy, drop, store {
    value: T,
}
\`\`\`

- \`Box<u64>\` has \`copy, drop, store\` — because \`u64\` has all three
- \`Box<SomeNoCopy>\` does **not** have \`copy\` — because the inner type lacks \`copy\`

The rule: a generic struct has an ability only if **all its type parameters' fields** also have that ability.

### Type constraints on struct type params

You can require abilities on type parameters:

\`\`\`move
public struct SafeBox<T: store + drop> has key {
    id: UID,
    contents: T,
}
\`\`\`

Now \`T\` is guaranteed to have \`store\` and \`drop\`, so anyone creating a \`SafeBox\` must use a type that satisfies both.`,
    },
    {
      type: 'TASK',
      title: 'Build a Container',
      content: `Create a generic container struct with functions to manipulate it.`,
      task: `1. The \`Container<T>\` struct is defined for you
2. Write \`fun new_container<T>(item: T): Container<T>\` — wraps the item
3. Write \`fun unpack<T>(c: Container<T>): T\` — destructures and returns the item`,
      hint: `\`\`\`move
fun new_container<T>(item: T): Container<T> {
    Container { item }
}

fun unpack<T>(c: Container<T>): T {
    let Container { item } = c;
    item
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::containers;

public struct Container<T> has drop {
    item: T,
}

// Write new_container<T>(item: T): Container<T>


// Write unpack<T>(c: Container<T>): T
// Destructure the Container to extract the item


#[test]
fun test_container() {
    let c = new_container(42u64);
    let value = unpack(c);
    assert!(value == 42, 0);

    let c2 = new_container(true);
    let flag = unpack(c2);
    assert!(flag == true, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*containers\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::containers;' },
        { test: (code: string) => /fun\s+new_container\s*</.test(code), errorMsg: 'Write a generic function: fun new_container<T>(...' },
        { test: (code: string) => /fun\s+unpack\s*</.test(code), errorMsg: 'Write a generic function: fun unpack<T>(...' },
        { test: (code: string) => /Container\s*(<\s*T\s*>)?\s*\{/.test(code), errorMsg: 'Create a Container using: Container { item }' },
        { test: (code: string) => /let\s+Container\s*(<\s*T\s*>)?\s*\{/.test(code), errorMsg: 'Destructure: let Container { item } = c;' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::containers::test_container
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Phantom Type Parameters',
      content: `Sometimes you want a type parameter that **doesn't appear in any field** — it's just a compile-time tag that distinguishes types. This is called a **phantom** type parameter.

### The problem: mixing things that shouldn't mix

Imagine you're tracking different kinds of fuel. The data is the same (just a \`u64\` amount), but you never want to accidentally mix starship fuel with station fuel:

\`\`\`move
module frontier::fuel_types;

// Marker types — no fields, just labels
public struct StarshipFuel {}
public struct StationFuel {}

// phantom means T isn't stored — it's just a type tag
public struct FuelReserve<phantom T> has copy, drop, store {
    amount: u64,
}
\`\`\`

Now \`FuelReserve<StarshipFuel>\` and \`FuelReserve<StationFuel>\` are **completely different types** — even though they both hold a \`u64\` inside. The compiler won't let you pass one where the other is expected.

### Why \`phantom\`?

If a type parameter isn't used in any field, Move **requires** you to mark it \`phantom\`. This tells the compiler (and other programmers) that the parameter exists only for type-level distinction.

### Phantom params don't affect abilities

This is the key benefit. The marker types (\`StarshipFuel\`, \`StationFuel\`) have **no abilities** — but that's fine because they're phantom:

\`\`\`move
public struct StarshipFuel {}  // no copy, no drop, no store

// FuelReserve still has copy, drop, store!
// Because StarshipFuel is phantom — its abilities don't matter
public struct FuelReserve<phantom T> has copy, drop, store {
    amount: u64,
}
\`\`\`

If \`T\` were a regular (non-phantom) parameter used in a field, \`FuelReserve\` would lose \`copy\`, \`drop\`, and \`store\` because \`StarshipFuel\` lacks them.

### Type-safe functions

You can write functions that only work with a specific fuel type:

\`\`\`move
fun refuel_ship(reserve: &mut FuelReserve<StarshipFuel>, amount: u64) {
    reserve.amount = reserve.amount + amount;
}

// refuel_ship(&mut station_reserve, 50);  // COMPILE ERROR!
// Wrong phantom type — expected StarshipFuel, got StationFuel
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Type-Safe Tokens',
      content: `Use phantom types to create fuel reserves that can't be mixed up.`,
      task: `The marker types and struct are defined for you.

Write two functions:

1. \`fun new_reserve<T>(amount: u64): FuelReserve<T>\` — creates a reserve with the given amount
2. \`fun merge<T>(dest: &mut FuelReserve<T>, source: FuelReserve<T>)\` — adds the source's amount to dest. Destructure the source to get its amount.

The generic \`T\` ensures you can only merge matching fuel types.`,
      hint: `\`\`\`move
fun new_reserve<T>(amount: u64): FuelReserve<T> {
    FuelReserve { amount }
}

fun merge<T>(dest: &mut FuelReserve<T>, source: FuelReserve<T>) {
    let FuelReserve { amount } = source;
    dest.amount = dest.amount + amount;
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fuel_types;

public struct StarshipFuel {}
public struct StationFuel {}

public struct FuelReserve<phantom T> has copy, drop {
    amount: u64,
}

// Write new_reserve<T>(amount: u64): FuelReserve<T>


// Write merge<T>(dest: &mut FuelReserve<T>, source: FuelReserve<T>)
// Destructure source, add its amount to dest


#[test]
fun test_phantom() {
    let mut ship_fuel = new_reserve<StarshipFuel>(100);
    let extra_ship = new_reserve<StarshipFuel>(50);
    merge(&mut ship_fuel, extra_ship);
    assert!(ship_fuel.amount == 150, 0);

    // This would NOT compile:
    // let station = new_reserve<StationFuel>(200);
    // merge(&mut ship_fuel, station);  // ERROR: type mismatch!
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fuel_types\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fuel_types;' },
        { test: (code: string) => /fun\s+new_reserve\s*</.test(code), errorMsg: 'Write a generic function: fun new_reserve<T>(...' },
        { test: (code: string) => /fun\s+merge\s*</.test(code), errorMsg: 'Write a generic function: fun merge<T>(...' },
        { test: (code: string) => /FuelReserve\s*(<\s*T\s*>)?\s*\{/.test(code), errorMsg: 'Create a FuelReserve: FuelReserve { amount }' },
        { test: (code: string) => /let\s+FuelReserve\s*(<\s*T\s*>)?\s*\{/.test(code), errorMsg: 'Destructure the source: let FuelReserve { amount } = source;' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fuel_types::test_phantom
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 5.1 — Summary',
      content: `- **Generic functions** use type parameters: \`fun name<T>(x: T): T\`
- **Generic structs** create families of types: \`struct Pair<T1, T2> { ... }\`
- The compiler **infers** type arguments from context — explicit annotation is optional
- **Ability constraints** restrict what types can be used: \`T: copy + drop\`
- Without constraints, you can only **move** the value — not copy, drop, or store it
- **Conditional abilities**: \`Box<T> has copy\` only if \`T\` also has \`copy\`
- **Phantom type parameters**: \`<phantom T>\` — a type tag that isn't stored in any field
  - Doesn't affect the struct's abilities
  - Creates distinct types from identical data (e.g. different fuel types, currencies)
  - Move requires \`phantom\` when a type param isn't used in fields
- You've been using generics all along: \`vector<T>\` is a generic struct!`,
    },
  ],
};
export default lesson;

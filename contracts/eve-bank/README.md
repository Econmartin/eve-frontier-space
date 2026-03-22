# EVE Bank — Move Contract

Generic DeFi primitive for EVE Frontier testnet. Powers deposits, loans, and lottery for any Sui coin type.

## Deployed packages

| Network   | Package ID |
|-----------|------------|
| Utopia    | `0x51c9dc67394cc377069884bf757b27ae62553e366aa45a692e3c3daea46f1beb` |
| Stillness | `0x51c9dc67394cc377069884bf757b27ae62553e366aa45a692e3c3daea46f1beb` |

## Shared objects

| Object           | Utopia | Stillness |
|------------------|--------|-----------|
| CentralBank      | `0x7ac8c370e80674ddb5cb3363453188f419d6fe94c6b51906e4d6a18128f06615` | `0x0a77f7b7b1c78f46f055e28435c6b7c12e76be130270db50b07d535cf64132d0` |
| LotterySystem    | `0x405d406b7ed3dae80a3e996c7a32552f429e33d15480a9c7637c275c6a86f70f` | `0x789504a42610c0d070e61826f49034d3a21593cb3b48024f3f20a15340a9f2c4` |
| LoanProduct      | `0xfa4f0cbdcdb650720b2d761b16d3b5a685e1e28791b4921132c128368175907b` | `0xfa4f0cbdcdb650720b2d761b16d3b5a685e1e28791b4921132c128368175907b` |

AdminCap: `0xd16df07f25b0bb37435f63325d3e64deae0a6ab7c7a620f64e0f6fc7455fb3a6`

## Deploy (fresh publish)

```bash
sui client publish --gas-budget 100000000
```

After publishing, call admin setup for each network/coin type:

```bash
# Create bank
sui client call --package <PKG> --module bank --function create_bank \
  --type-args <EVE_COIN_TYPE> --args <ADMIN_CAP> --gas-budget 10000000

# Create lottery (ticket_price in MIST, house_edge_bps)
sui client call --package <PKG> --module bank --function initialize_lottery \
  --type-args <EVE_COIN_TYPE> --args <ADMIN_CAP> 1000000000 2000 --gas-budget 10000000

# Create loan product (interest_rate_bps, min_loan, max_loan in MIST)
sui client call --package <PKG> --module bank --function create_loan_product \
  --args <ADMIN_CAP> 500 1000000000 100000000000 --gas-budget 10000000
```

## Notes

- Struct changes (adding fields) require a **fresh publish**, not an upgrade — Sui's compatible upgrade policy does not allow new struct fields.
- Update object IDs in `apps/finance/src/constants.ts` after each fresh deploy.

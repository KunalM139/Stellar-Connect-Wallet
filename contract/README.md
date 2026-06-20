# StellarFund — Soroban contracts (workspace)

Two cooperating Soroban contracts power the StellarFlow dApp:

1. **`fund`** — an on-chain crowdfunding campaign. Donors send a Stellar asset
   (the native XLM SAC on Testnet) into the contract; it tracks the cumulative
   amount raised, the unique-donor count, and each donor's running total. The
   beneficiary (`owner`) can withdraw collected funds.
2. **`badge`** (DonorBadge) — a companion contract. On every donation the fund
   contract makes a **cross-contract call** to `badge.award`, which assigns the
   donor a loyalty tier (Bronze / Silver / Gold) from their cumulative total.

```
contract/
├── Cargo.toml                  # workspace (members = contracts/*)
└── contracts/
    ├── fund/src/lib.rs         # crowdfunding contract  → calls badge
    └── badge/src/lib.rs        # DonorBadge contract    ← called by fund
```

## Inter-contract communication

`fund.donate()` updates the donor's running total, then — if a badge contract
has been registered via `fund.set_badge(<BADGE_ID>)` — invokes:

```
BadgeClient::new(&env, &badge).award(&from, &donor_total)
```

The badge contract authorizes the call with `admin.require_auth()`, where
`admin` is the fund contract's own address (set at badge deploy time). Soroban
satisfies this automatically for the contract making the invocation, so no
external account can forge badges. Both writes share one transaction, so the
badge update is **atomic** with the donation.

## Deployment (Testnet)

| | fund | badge |
|---|---|---|
| **Contract ID** | `CCIYIE3WDF5EEC4DL25JR2O4SAV2G3USARIBMCLWPIFQVUOIVDEN5FWI` | _set after deploy_ |
| **Network** | Stellar Testnet | Stellar Testnet |
| **Explorer** | [fund](https://stellar.expert/explorer/testnet/contract/CCIYIE3WDF5EEC4DL25JR2O4SAV2G3USARIBMCLWPIFQVUOIVDEN5FWI) | — |

- **Asset** — native XLM (SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`)
- **Goal** — 1,000 XLM (`10000000000` stroops)

### Sample transaction hashes (Testnet)

| Action | Hash |
|---|---|
| Upload wasm | `d1c2a6f8509599c5e2fb9cbb8735cae0db1d0c7bc674b1d4bdbb76f6f0cafe7d` |
| Deploy contract | `97bb3a9250ad37d64a76d3255ecd56f1bf562e21f958ad1f5ec53dbef806ee41` |
| `donate()` interaction | `5edecdcbbc74588796b951900b22244af71baa35398e2aa499d32645511937e4` |

## Interfaces

### `fund`

| Method | Kind | Description |
|---|---|---|
| `donate(from, amount)` | write | Pulls `amount` from `from`, records the donation, cross-calls `badge.award`, emits `Donated`. Returns the new total raised. |
| `withdraw()` | write | Owner-only. Transfers the contract balance to the beneficiary, emits `Withdrawn`. |
| `set_badge(badge)` | write | Owner-only. Registers the DonorBadge contract for cross-contract awards. |
| `goal()` / `raised()` / `donors()` | read | Campaign progress. |
| `is_closed()` | read | `true` once the goal has been reached. |
| `contribution(who)` | read | A given address's running total. |
| `badge()` | read | The registered badge contract (if any). |
| `owner()` / `token()` | read | Campaign configuration. |

**Errors:** `ZeroAmount` (1) · `CampaignClosed` (2) · `NothingRaised` (3)

### `badge` (DonorBadge)

| Method | Kind | Description |
|---|---|---|
| `award(donor, total)` | write | Admin-only (the fund contract). Sets/upgrades the donor's tier from `total`, emits `BadgeAwarded`. Tiers never downgrade. |
| `tier(who)` | read | A donor's current tier (0–3). |
| `minted()` | read | Count of unique donors who have earned a badge. |
| `admin()` | read | The fund contract authorized to award. |

**Tiers (cumulative):** Bronze ≥ 1 XLM · Silver ≥ 10 XLM · Gold ≥ 100 XLM

## Develop

```bash
cargo test                 # run the full unit test suite (11 tests: 6 fund + 5 badge)
stellar contract build     # build both optimized wasm files
```

## Deploy both contracts (Testnet)

```bash
# 0) Build
stellar contract build
#    → target/wasm32v1-none/release/fund.wasm
#    → target/wasm32v1-none/release/badge.wasm

# 1) Deploy the fund contract (constructor: owner, token, goal-in-stroops)
stellar contract deploy --wasm target/wasm32v1-none/release/fund.wasm \
  --source <identity> --network testnet \
  -- --owner <G...> --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC --goal 10000000000
#    → prints FUND_ID

# 2) Deploy the badge contract with the fund contract as its admin
stellar contract deploy --wasm target/wasm32v1-none/release/badge.wasm \
  --source <identity> --network testnet \
  -- --admin <FUND_ID>
#    → prints BADGE_ID

# 3) Register the badge contract on the fund (owner-only)
stellar contract invoke --id <FUND_ID> --source <identity> --network testnet \
  -- set_badge --badge <BADGE_ID>

# 4) Donate → triggers the cross-contract badge award
stellar contract invoke --id <FUND_ID> --source <identity> --network testnet \
  -- donate --from <G...> --amount 1000000000
```

After deploying, update `CONTRACT_ID` and `BADGE_ID` in
[`src/components/Fund.js`](../src/components/Fund.js).

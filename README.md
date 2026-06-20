<h1 align="center">✦ StellarFund + StellarFlow</h1>

<h3 align="center">A Soroban smart contract for on-chain crowdfunding, with a non-custodial React dApp + Freighter wallet front-end on the Stellar Testnet</h3>

<p align="center">
  <a href="https://soroban.stellar.org"><img src="https://img.shields.io/badge/Soroban-Smart_Contract-000000?style=flat-square&logo=stellar" alt="Soroban"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React"/></a>
  <a href="https://stellar.org"><img src="https://img.shields.io/badge/Stellar_SDK-latest-000000?style=flat-square&logo=stellar" alt="Stellar SDK"/></a>
  <a href="https://www.freighter.app"><img src="https://img.shields.io/badge/Freighter_API-v6-7B5EA7?style=flat-square" alt="Freighter API"/></a>
  <a href="https://horizon-testnet.stellar.org"><img src="https://img.shields.io/badge/Network-Testnet-orange?style=flat-square" alt="Network"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"/></a>
</p>

---

## 🛰️ Deployed Soroban Smart Contract

**StellarFund** is a Rust/Soroban smart contract deployed and live on the **Stellar Testnet**. It is a fully on-chain crowdfunding campaign: donors send the native XLM asset into the contract, which tracks the cumulative amount raised, the unique-donor count, and each donor's running total; the campaign beneficiary (`owner`) can withdraw the collected funds.

| | |
|---|---|
| **Contract ID** | `CCIYIE3WDF5EEC4DL25JR2O4SAV2G3USARIBMCLWPIFQVUOIVDEN5FWI` |
| **Network** | Stellar Testnet |
| **Asset** | native XLM (SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`) |
| **Goal** | 1,000 XLM (`10000000000` stroops) |
| **Source** | [`contract/contracts/fund/src/lib.rs`](contract/contracts/fund/src/lib.rs) |
| **Explorer** | [stellar.expert → contract](https://stellar.expert/explorer/testnet/contract/CCIYIE3WDF5EEC4DL25JR2O4SAV2G3USARIBMCLWPIFQVUOIVDEN5FWI) |

### 📂 Smart Contract Folder Structure

The complete contract source lives in **[`contract/contracts/fund/src/lib.rs`](contract/contracts/fund/src/lib.rs)** under a standard Soroban workspace layout:

```
contract/
├── Cargo.toml                          # Soroban workspace (soroban-sdk 26)
└── contracts/
    └── fund/
        ├── Cargo.toml                  # fund crate — crate-type ["lib", "cdylib"]
        ├── Makefile
        └── src/
            ├── lib.rs                  # ← the StellarFund smart contract source
            └── test.rs                 # unit tests (5 tests)
```

### 🧩 Contract Interface — `contract/contracts/fund/src/lib.rs`

The contract uses Soroban's `#[contract]`, `#[contractimpl]`, `#[contracttype]`, `#[contracterror]`, and `#[contractevent]` macros, with `require_auth()` authorization and both instance and persistent storage.

| Method | Kind | Description |
|---|---|---|
| `__constructor(owner, token, goal)` | init | Sets the beneficiary, campaign asset (SAC), and fundraising goal at deploy time. |
| `donate(from, amount)` | write | Requires `from` auth, pulls `amount` of the token into the contract, updates the cumulative total + per-donor contribution, closes the campaign when the goal is met, emits a `Donated` event. Returns the new total raised. |
| `withdraw()` | write | Owner-only (`require_auth`). Transfers the full contract balance to the beneficiary, emits `Withdrawn`. |
| `goal()` / `raised()` / `donors()` | read | Campaign progress. |
| `is_closed()` | read | `true` once the goal has been reached. |
| `contribution(who)` | read | A given address's running total. |
| `owner()` / `token()` | read | Campaign configuration. |

**Custom errors:** `ZeroAmount` (1) · `CampaignClosed` (2) · `NothingRaised` (3)
**Events:** `Donated { from, amount, total }` · `Withdrawn { owner, amount }`

### 🦀 Build, Test & Deploy the Contract

```bash
cd contract
cargo test                 # run the unit test suite (5 tests)
stellar contract build     # build the optimized wasm

# Deploy (constructor args: owner, token, goal-in-stroops)
stellar contract deploy --wasm target/wasm32v1-none/release/fund.wasm \
  --source <identity> --network testnet \
  -- --owner <G...> --token <native-SAC> --goal 10000000000
```

---

## 📖 Front-End dApp — StellarFlow

**StellarFlow** is the non-custodial React + Freighter front-end that pairs with the StellarFund contract. It connects a user's Freighter wallet, reads their address and live XLM balance, and signs/submits real Stellar Testnet transactions — no sign-up, no middleman, no custody of keys.

- ✅ **Connect Wallet** — Freighter integration in [`src/components/Freighter.js`](src/components/Freighter.js): `setAllowed()` → permission, `requestAccess()` → address retrieval, `signTransaction()` → transaction signing
- ✅ **Wallet Balance Checker** — live XLM balance displayed on connection
- ✅ **Send XLM** — real Testnet payments with client-side address validation
- ✅ **Transaction History Viewer** — persistent activity panel via `localStorage`

### Key Features

| Feature | Details |
|---|---|
| 🔗 Wallet Connection | Connects via Freighter browser extension (non-custodial) |
| 🪪 Address Retrieval | `requestAccess()` returns the connected public key |
| ✍️ Transaction Signing | `signTransaction()` signs XDR inside Freighter |
| 💸 Send XLM | Real Stellar Testnet transactions |
| 📊 Live Balance | Auto-refreshes after every transaction |
| 🧾 Transaction History | Persisted in `localStorage` — survives reconnects |
| ✅ Address Validation | Client-side Stellar address format check |
| 🌐 WebGL Landing Page | Interactive light-rays hero (OGL + custom GLSL shaders) |
| 📱 Responsive Design | Mobile, tablet, and desktop |

---

### 🌌 Landing Page — Light Rays Hero
> Mouse-interactive WebGL background, glassmorphism nav, hero CTA

<img width="1451" height="731" alt="Landing page" src="https://github.com/user-attachments/assets/81c34928-29e4-4960-851d-d674d73a6d9b" />


### 🔌 Wallet Connected — Dashboard View
> Balance displayed, wallet address shown, Recent Activity panel ready

<img width="1451" height="731" alt="Dashboard" src="https://github.com/user-attachments/assets/6ec4c169-7585-4c91-ba2e-2ce949468a8f" />


### 📤 Sending XLM — Transfer Panel
> Recipient address input with Stellar format validation, amount field, Process Transfer button

<img width="1451" height="731" alt="Transfer panel" src="https://github.com/user-attachments/assets/61d41ac1-0a3f-42e4-928b-3930ca03a98b" />


### ✅ Successful Testnet Transaction
> Green "Transaction confirmed" badge with the on-chain transaction hash

<img width="714" height="239" alt="Confirmed transaction" src="https://github.com/user-attachments/assets/8d9ec35e-1573-41a0-929c-a94d83d4e309" />

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Rust + Soroban SDK 26 (`contract/contracts/fund/src/lib.rs`) |
| **Contract Network** | Stellar Testnet (deployed) |
| **Frontend** | React 18 (Create React App) |
| **Wallet** | Freighter Browser Extension |
| **Stellar SDK** | `@stellar/stellar-sdk` |
| **Freighter API** | `@stellar/freighter-api` v6 |
| **WebGL Rendering** | `ogl` (minimal WebGL library) |
| **Styling** | Vanilla CSS — glassmorphism + dark theme |
| **Persistence** | Browser `localStorage` (transaction history) |

---

## ⚙️ Front-End Setup

### Prerequisites

- **Node.js** v16+ — [Download](https://nodejs.org)
- **npm** v8+ (comes with Node)
- **Freighter Wallet** extension — [Install for Chrome](https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk)

### 1. Clone & install

```bash
git clone https://github.com/amankoli09/Stellar-Connect-Wallet.git
cd Stellar-Connect-Wallet
npm install
```

### 2. Start the dev server

```bash
npm start
```

The app opens at **[http://localhost:3000](http://localhost:3000)**.

### 3. Configure Freighter for Testnet

1. Click the Freighter extension icon
2. Go to **Settings → Network → Testnet**
3. Return to `localhost:3000` and click **Connect**

### 4. Fund your Testnet wallet

```
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

Or use [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test).

---

## 🚀 How to Use

```
1. Install & configure Freighter (switch to Testnet)
2. Open http://localhost:3000
3. Click "Connect" → approve in Freighter (setAllowed + requestAccess)
4. Your XLM balance loads automatically
5. Enter a recipient Stellar address (G... 56 chars) + amount
6. Click "Process Transfer" → sign in Freighter (signTransaction)
7. Watch the balance update and "Transaction confirmed" appear in green
8. Check Recent Activity — history persists even after disconnect
```

---

## 📁 Full Project Structure

```
stellar-connect-wallet/
├── contract/                           # ← Soroban smart contract (Rust)
│   ├── Cargo.toml                      # workspace
│   └── contracts/
│       └── fund/
│           ├── Cargo.toml
│           └── src/
│               ├── lib.rs              # StellarFund contract source
│               └── test.rs             # unit tests
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js                   # landing page + dashboard UI
│   │   ├── Freighter.js                # wallet connect, address, balance, signing
│   │   ├── LightRays.js                # WebGL light-rays effect (OGL + GLSL)
│   │   └── LightRays.css
│   ├── App.js                          # root component
│   ├── App.css                         # design system (glassmorphism dark theme)
│   └── index.css
├── package.json
└── README.md
```

---

## 🔐 Security Notes

- **Non-custodial**: StellarFlow never stores, transmits, or accesses private keys
- All transaction signing happens **inside the Freighter extension**
- The `withdraw` contract method is owner-gated via `require_auth()`
- The front-end only calls the public [Stellar Horizon Testnet API](https://horizon-testnet.stellar.org)

---

## 🌐 Live Demo

> Deployed at: **https://stellar-connect-wallet-rust.vercel.app/**

---

## 📄 License

MIT © 2025 — Built for the Stellar Developer Track submission.

---

<div align="center">
  <sub>Built with ♥ on the Stellar Testnet — Soroban contract + Freighter dApp</sub>
</div>

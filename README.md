# CalibreX - Decentralized Arbitrage Trading Platform

![Stellar](https://img.shields.io/badge/Stellar-Network-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Rust](https://img.shields.io/badge/Rust-Soroban-orange)

CalibreX is an automated arbitrage trading system built on Stellar's Soroban smart contracts. The platform identifies and exploits pricing inefficiencies across liquidity pools, executing trades automatically with real-time oracle integration and DAO governance.

## Key Features

- **Automated Arbitrage**: Real-time opportunity detection and execution across Stellar liquidity pools
- **Custodial Management**: Secure user fund management with smart contract custody
- **DAO Governance**: Community-driven decision making with KALE token staking
- **Risk Management**: Programmable risk framework with automated controls
- **Oracle Integration**: Real-time price feeds for accurate market data

## Active Contract Addresses

**Network**: Stellar Testnet

- **Risk Manager**: [`CAGLHASPDWED7XBJ6VOFRUD5QRTEO4OP7WTGSRP5ENE5DGRMEAQKSEE4`](https://stellar.expert/explorer/testnet/contract/CAGLHASPDWED7XBJ6VOFRUD5QRTEO4OP7WTGSRP5ENE5DGRMEAQKSEE4)
- **Arbitrage Bot**: [`CCPCIIYJ4XQKVH7UGMYVITAPSJZMXIHU2F4GSDMOAUQYGZQFKUIFJPRE`](https://stellar.expert/explorer/testnet/contract/CCPCIIYJ4XQKVH7UGMYVITAPSJZMXIHU2F4GSDMOAUQYGZQFKUIFJPRE)
- **DAO Governance**: [`CDF6EDQOA75TDOGGCOA7POBK2KCMQ47J6BULFSKYOLSAK2M23AUWAUA3`](https://stellar.expert/explorer/testnet/contract/CDF6EDQOA75TDOGGCOA7POBK2KCMQ47J6BULFSKYOLSAK2M23AUWAUA3)
- **Trading Strategies**: [`CCWXGLZ3J7REF2DHXINHM3WOHXXSFJQ5LQRIAGDLUVWABKLC5M7XNHJA`](https://stellar.expert/explorer/testnet/contract/CCWXGLZ3J7REF2DHXINHM3WOHXXSFJQ5LQRIAGDLUVWABKLC5M7XNHJA)

## Project Structure

```
stellar/
├── contracts/                    # Soroban Smart Contracts (Rust)
│   ├── arbitrage-bot/           # Main arbitrage execution
│   ├── dao-governance/          # DAO governance system
│   ├── risk-manager/            # Risk management
│   ├── trading-strategies/      # Strategy management
│   └── shared-types/            # Common data structures
└── frontend/                    # Next.js Frontend
    ├── app/                     # App router and pages
    ├── components/              # React components
    ├── hooks/                   # Custom hooks
    └── bindings/                # Contract bindings
```

## Installation

### Requirements
- Node.js v18+
- Freighter Wallet extension
- Stellar testnet account

### Setup

```bash
# Clone repository
git clone https://github.com/your-username/stellar-arbitrage.git
cd stellar

# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

## Usage

### User Dashboard
1. Connect Freighter wallet
2. Initialize trading account
3. Deposit funds for arbitrage trading
4. Monitor performance and withdraw profits

### DAO Governance
1. Stake KALE tokens
2. Create or vote on proposals
3. Execute approved proposals
4. Earn governance rewards

## Smart Contracts

### Arbitrage Bot
```rust
pub fn initialize_user_account(...)     // Initialize user account
pub fn deposit_user_funds(...)          // Deposit trading funds
pub fn scan_advanced_opportunities(...) // Find arbitrage opportunities
pub fn execute_enhanced_arbitrage(...)  // Execute trades
```

### DAO Governance
```rust
pub fn create_proposal(...)    // Create governance proposals
pub fn vote(...)              // Vote on proposals
pub fn stake_kale(...)        // Stake governance tokens
pub fn execute_proposal(...)  // Execute approved proposals
```

## Development

### Frontend Development
```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
```

### Contract Development
```bash
# Build contracts
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Deploy to testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/contract.wasm --network testnet
```

## Security

- **Smart Contract Security**: Memory-safe Rust development with Soroban runtime
- **Access Controls**: Role-based permissions and emergency functions
- **Risk Management**: Automated position limits and drawdown protection
- **Governance**: Timelock mechanisms and multi-signature controls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Contact

- **GitHub**: [github.com/your-username/stellar-arbitrage]
- **Documentation**: [docs.calibrex.com]
- **Support**: [support@calibrex.com]

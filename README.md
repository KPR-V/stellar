# README: Decentralized Arbitrage Trading System

Welcome to your fully deployed, multi-contract decentralized arbitrage trading platform on the Stellar network! This system integrates four specialized Soroban smart contracts to create a robust, automated, and community-governed DeFi solution.

***

## 📋 Live System Information

**Network**: Stellar Testnet
**Deployment Date**: Sunday, August 24, 2025
**Admin Account**: `GB2HVFY6ZEDSMOBOB5NYXUMMB75BJHJ4JJ6YUT65IC2DUVKSU27PFV5D`

### **Live Contract Addresses**

You can monitor all on-chain activity for your contracts using the Stellar Expert explorer:

*   **Risk Manager**: [`CAGLHASPDWED7XBJ6VOFRUD5QRTEO4OP7WTGSRP5ENE5DGRMEAQKSEE4`](https://stellar.expert/explorer/testnet/contract/CAGLHASPDWED7XBJ6VOFRUD5QRTEO4OP7WTGSRP5ENE5DGRMEAQKSEE4)
*   **Arbitrage Bot**: [`CCPCIIYJ4XQKVH7UGMYVITAPSJZMXIHU2F4GSDMOAUQYGZQFKUIFJPRE`](https://stellar.expert/explorer/testnet/contract/CCPCIIYJ4XQKVH7UGMYVITAPSJZMXIHU2F4GSDMOAUQYGZQFKUIFJPRE)
*   **DAO Governance**: [`CDF6EDQOA75TDOGGCOA7POBK2KCMQ47J6BULFSKYOLSAK2M23AUWAUA3`](https://stellar.expert/explorer/testnet/contract/CDF6EDQOA75TDOGGCOA7POBK2KCMQ47J6BULFSKYOLSAK2M23AUWAUA3)
*   **Trading Strategies**: [`CCWXGLZ3J7REF2DHXINHM3WOHXXSFJQ5LQRIAGDLUVWABKLC5M7XNHJA`](https://stellar.expert/explorer/testnet/contract/CCWXGLZ3J7REF2DHXINHM3WOHXXSFJQ5LQRIAGDLUVWABKLC5M7XNHJA)

***

## 📱 Application Frontend: UI Components & Function Mapping

Here’s how to translate your smart contract functions into a user-facing dApp.

### **👤 User Dashboard & Account Management**

This section is the user's personal hub for interacting with the arbitrage bot.

*   **UI Components**:
    *   Wallet connection button (using Freighter).
    *   Account summary card displaying total balance and P&L.
    *   Deposit and Withdraw forms with input fields for token and amount.
    *   A table or list to display personal trade history.
    *   A settings page to configure personal trading parameters.
*   **Contract Functions to Use (`Arbitrage Bot`):**
    *   `initialize_user_account`: Call this once when a new user connects their wallet for the first time.
    *   `deposit_user_funds`: Hook this to the "Deposit" button.
    *   `withdraw_user_funds`: Hook this to the "Withdraw" button.
    *   `get_user_balances`: Periodically call this to update the user's balance display.
    *   `get_user_performance_metrics`: Use this to populate the P&L and other performance stats on the dashboard.
    *   `get_user_trade_history`: Fetch and display the user's recent trades.
    *   `update_user_config`: On the settings page, allow users to call this to adjust their personal `ArbitrageConfig`.

### **🗳️ DAO Governance Portal**

This is the central place for community members to participate in the decision-making process.

*   **UI Components**:
    *   A list of active, passed, and failed proposals.
    *   A detailed view for each proposal showing its description, votes, and status.
    *   A "Create Proposal" form.
    *   "Vote Yes" / "Vote No" buttons on active proposals.
    *   An "Execute Proposal" button for passed proposals (visible only after the timelock).
    *   A staking dashboard showing total KALE staked and the user's personal stake.
*   **Contract Functions to Use (`DAO Governance`):**
    *   `get_all_proposals`: Fetch the list of all proposals to display on the main governance page.
    *   `get_proposal`: Get the details for a specific proposal when a user clicks on it.
    *   `create_proposal`: Hook this to the "Submit" button on your proposal creation form.
    *   `vote`: Connect this to the "Vote Yes" and "Vote No" buttons.
    *   `finalize_proposal`: Your app could have a button for this, or a backend service could call it periodically for expired proposals.
    *   `execute_proposal`: This is a critical function to connect. The button should only be enabled if the proposal `status` is `Passed` and the current time is past `execution_earliest`.
    *   `stake_kale` / `unstake_kale`: These are for your staking dashboard.

### **📈 System Analytics & Arbitrage Opportunities Dashboard**

This public-facing dashboard provides transparency into the system's performance and current market opportunities.

*   **UI Components**:
    *   Real-time charts showing total profit, trade volume, and success rate.
    *   A live-updating table of detected arbitrage opportunities.
    *   A "Keeper" section where authorized users can trigger trades.
*   **Contract Functions to Use (`Arbitrage Bot`):**
    *   `get_performance_metrics`: Call this to get global system performance for your analytics charts.
    *   `scan_advanced_opportunities`: This is a key function. Your frontend can call this periodically (e.g., every 30 seconds) to display potential arbitrage trades in real-time.
    *   `execute_enhanced_arbitrage`: This function should be accessible to authorized "Keepers". In your UI, if a user's wallet address is on the keeper list, show a "Execute Trade" button next to each opportunity.

### **🛠️ Admin Panel (For the System Administrator)**

A secure, admin-only section for managing the core system.

*   **UI Components**:
    *   A form to add new keepers.
    *   A form to add/pause trading pairs and venues.
    *   An "Emergency Stop" button.
    *   A "Transfer Admin" form.
*   **Contract Functions to Use (`Arbitrage Bot`):**
    *   `add_keeper`: For the "Add Keeper" form.
    *   `add_enhanced_pair` / `pause_pair`: For managing trading pairs.
    *   `emergency_stop`: A big, red button for emergencies. This call should have extra confirmations in the UI.
    *   `transfer_admin`: A secure form to transfer ownership of the protocol.

***

## 🚀 Next Steps: Your Development Roadmap

1.  **Phase 1: Read-Only dApp & User Onboarding**
    *   Implement the **User Dashboard** with a focus on `get_*` functions. Allow users to connect their wallet, see their (zero) balance, and call `initialize_user_account`.
    *   Implement the **DAO Governance Portal** in read-only mode, showing existing (if any) proposals.
    *   Implement the **System Analytics Dashboard**, calling `scan_advanced_opportunities` to show live data.

2.  **Phase 2: Core User Interactions**
    *   Enable the `deposit_user_funds` and `withdraw_user_funds` functions.
    *   Allow users to `stake_kale` and `unstake_kale`.
    *   Build out the "Create Proposal" form.

3.  **Phase 3: Full Governance and Keeper Functionality**
    *   Enable the `vote` and `execute_proposal` functions.
    *   Build the admin panel for the system administrator.
    *   Implement the "Keeper" functionality, allowing authorized users to call `execute_enhanced_arbitrage`.

4.  **Phase 4: Security and Production**
    *   Conduct a thorough security audit of your frontend and smart contracts.
    *   Optimize for performance and gas fees.
    *   Plan and execute your Mainnet deployment.

***

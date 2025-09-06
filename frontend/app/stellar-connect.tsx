"use client";
import React from "react";
import {StellarWalletsKit, WalletNetwork, ISupportedWallet, xBullModule, FreighterModule, AlbedoModule} from "@creit.tech/stellar-wallets-kit";
import Message from "../components/message";
import { useMessage } from "../hooks/useMessage";
import { useWallet } from "../hooks/useWallet";

export default function StellarConnect() {
  const {
    address,
    isLoading,
    setAddress,
    setIsLoading,
    setPortfolioValue,
    setProfitLoss,
    setWalletKit
  } = useWallet();
  const { messageState, showMessage, hideMessage } = useMessage();

  const initializeAccount = async (walletAddress: string ,kit: StellarWalletsKit) => {
    setIsLoading(true);

    try {
      const defaultConfig = {
        min_profit_bps: 100,
        max_trade_size: 1000000000,
        slippage_tolerance_bps: 20000,
        enabled: true,
        max_gas_price: 100000,
        min_liquidity: 100000000,
      };

      const defaultRiskLimits = {
        max_daily_volume: 50000000000,
        max_position_size: 5000000000,
        max_drawdown_bps: 2000,
        var_limit: 1000000000,
      };

      const response = await fetch("/api/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize_user_account",
          userAddress: walletAddress,
          initialConfig: defaultConfig,
          riskLimits: defaultRiskLimits,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const { signedTxXdr } = await kit.signTransaction(data.data.transactionXdr, {
          address: walletAddress,
          networkPassphrase: WalletNetwork.TESTNET,
        });

        await submitSignedTransaction(signedTxXdr);
        
        showMessage("Account initialized successfully on blockchain!");
      } else {
        throw new Error(data.error || "Failed to prepare transaction.");
      }
    } catch (error) {
      console.error("Error initializing account:", error);
      showMessage("Failed to initialize account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitSignedTransaction = async (signedXdr: string) => {
    const response = await fetch("/api/contract/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedXdr }),
    });
  };

 const connectWallet = async () => {
    setIsLoading(true);
    try {
      const kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        modules: [
          new xBullModule(),
          new FreighterModule(),
          new AlbedoModule(),
        ],
      });

      setWalletKit(kit);

      await kit.openModal({
        modalTitle: "Connect Your Stellar Wallet",
        notAvailableText: "No compatible wallet found.",
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            await kit.setWallet(option.id);
            const { address: walletAddress } = await kit.getAddress();
            if (walletAddress) {
              setAddress(walletAddress);
              localStorage.setItem("stellarWalletAddress", walletAddress);
              localStorage.setItem("stellarSelectedWallet", option.id);
              showMessage("Wallet connected successfully!");

              setPortfolioValue('0.00');
              setProfitLoss({
                value: '0.00',
                percentage: '0.00',
                isProfit: true
              });
              await initializeAccount(walletAddress, kit);
            }
          } catch (error) {
            console.error("Error connecting wallet:", error);
            showMessage("Failed to connect wallet. Please try again.");
          }
        },
        onClosed: (err?: Error) => {
          if (err) {
            console.error("Modal closed with error:", err.message);
            showMessage("Wallet connection was cancelled.");
          }
        },
      });
    } catch (error) {
      console.error("Error opening wallet modal:", error);
      showMessage("Error opening wallet selection. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setWalletKit(null);
    localStorage.removeItem("stellarWalletAddress");
    setPortfolioValue('0.00');
    setProfitLoss({
      value: '0.00',
      percentage: '0.00',
      isProfit: true
    });
    showMessage("Wallet disconnected successfully.");
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {!address ? (
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-full
              px-6 py-2.5 text-sm text-white font-medium outline-none transition-all duration-300 ease-out
              hover:border-white/30 hover:bg-black/25 hover:shadow-lg hover:shadow-white/5
              focus:border-white/40 focus:bg-black/30 focus:ring-2 focus:ring-white/10
              active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed font-raleway"
          >
            {isLoading ? "Connecting..." : "Connect Stellar Wallet"}
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="font-mono text-xs text-white/90 font-raleway">
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>
            </div>

            <button
              onClick={disconnectWallet}
              className="text-white/60 hover:text-white/90 text-smtransition-colors duration-300 font-raleway"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <Message
        message={messageState.message}
        isVisible={messageState.isVisible}
        onClose={hideMessage}
      />
    </>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  ISupportedWallet,
  xBullModule,
  FreighterModule,
  AlbedoModule,
} from "@creit.tech/stellar-wallets-kit";
import {
  WalletConnectAllowedMethods,
  WalletConnectModule,
} from "@creit.tech/stellar-wallets-kit/modules/walletconnect.module";
import Message from "../components/message";
import { useMessage } from "../hooks/useMessage";

export default function StellarConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const { messageState, showMessage, hideMessage } = useMessage();

  // Check stored wallet address on component mount
  useEffect(() => {
    const storedAddress = localStorage.getItem("stellarWalletAddress");
    if (storedAddress) {
      setAddress(storedAddress);
      checkAccountInitialization(storedAddress);
    }
  }, []);

  const checkAccountInitialization = async (walletAddress: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_user_initialized",
          userAddress: walletAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsInitialized(data.data.isInitialized);

        if (data.data.isInitialized) {
          showMessage("Account is already initialized. Welcome back!");
          // Fetch user data
          await fetchUserData(walletAddress);
        } else {
          showMessage("Account not initialized. Please complete the setup process.");
        }
      } else {
        throw new Error(data.error || "Failed to check account initialization.");
      }
    } catch (error) {
      console.error("Error checking account initialization:", error);
      showMessage("Error checking account status. Please try again.");
      setIsInitialized(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (walletAddress: string) => {
    try {
      const [balancesResponse, configResponse] = await Promise.all([
        fetch("/api/contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_user_balances",
            userAddress: walletAddress,
          }),
        }),
        fetch("/api/contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_user_config",
            userAddress: walletAddress,
          }),
        }),
      ]);

      const balancesData = await balancesResponse.json();
      const configData = await configResponse.json();

      if (balancesData.success && configData.success) {
        console.log("User data loaded:", {
          balances: balancesData.data.balances,
          userConfig: configData.data,
        });
        showMessage("User data loaded successfully!");
      } else {
        throw new Error("Failed to fetch user data.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showMessage("Error loading user data.");
    }
  };

  const initializeAccount = async () => {
    if (!address) return;

    setIsLoading(true);

    try {
      // Default configuration - you can replace with form inputs
      const defaultConfig = {
        enabled: true,
        slippage_tolerance_bps: 100,
        max_trade_size: 1000000000, // 1000 XLM in stroops
        min_profit_threshold: 10000000, // 10 XLM in stroops
      };

      const defaultRiskLimits = {
        max_position_size: 5000000000, // 5000 XLM in stroops
        max_daily_volume: 50000000000, // 50000 XLM in stroops
      };

      const response = await fetch("/api/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize_user_account",
          userAddress: address,
          initialConfig: defaultConfig,
          riskLimits: defaultRiskLimits,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.transaction) {
          showMessage("Please sign the transaction in your wallet to complete initialization.");
        } else {
          showMessage("Account initialized successfully!");
          setIsInitialized(true);
          await fetchUserData(address);
        }
      } else {
        throw new Error(data.error || "Failed to initialize account.");
      }
    } catch (error) {
      console.error("Error initializing account:", error);
      showMessage("Failed to initialize account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);

    try {
      const kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET, // Changed to TESTNET
        modules: [
          new xBullModule(),
          new FreighterModule(),
          new AlbedoModule(),
          new WalletConnectModule({
            url: "http://localhost:3000",
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
            method: WalletConnectAllowedMethods.SIGN,
            description: "Stellar Arbitrage Bot",
            name: "CalibreX Arbitrage Bot",
            icons: ["https://yourdomain.com/logo.png"],
            network: WalletNetwork.TESTNET,
          }),
        ],
      });

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
              showMessage("Wallet connected successfully!");

              // Check if account is initialized
              await checkAccountInitialization(walletAddress);
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
    setIsInitialized(null);
    localStorage.removeItem("stellarWalletAddress");
    showMessage("Wallet disconnected successfully.");
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {!address ? (
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="
              bg-black/20 backdrop-blur-sm border border-white/20 rounded-full
              px-6 py-2.5 text-sm text-white font-medium outline-none
              transition-all duration-300 ease-out
              hover:border-white/30 hover:bg-black/25 hover:shadow-lg hover:shadow-white/5
              focus:border-white/40 focus:bg-black/30 focus:ring-2 focus:ring-white/10
              active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
              font-raleway
            "
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

            {isInitialized === false && (
              <button
                onClick={initializeAccount}
                disabled={isLoading}
                className="
                  bg-blue-500/20 border border-blue-400/30 rounded-full
                  px-4 py-1 text-xs text-blue-400 font-medium
                  hover:bg-blue-500/30 hover:border-blue-400/50
                  transition-all duration-300 disabled:opacity-50
                  font-raleway
                "
              >
                {isLoading ? "Initializing..." : "Initialize Account"}
              </button>
            )}

            {isInitialized === true && (
              <div className="text-green-400 text-xs font-medium px-2 py-1 bg-green-400/10 rounded-full border border-green-400/20 font-raleway">
                ✓ Initialized
              </div>
            )}

            <button
              onClick={disconnectWallet}
              className="
                text-white/60 hover:text-white/90 text-sm
                transition-colors duration-300 font-raleway
              "
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Message Component */}
      <Message
        message={messageState.message}
        isVisible={messageState.isVisible}
        onClose={hideMessage}
      />
    </>
  );
}

"use client";
import { useState } from "react";
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

export default function StellarConnect() {
  const [address, setAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    const kit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      modules: [
        new xBullModule(),
        new FreighterModule(),
        new AlbedoModule(),
        new WalletConnectModule({
          url: "http://localhost:3000",
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
          method: WalletConnectAllowedMethods.SIGN,
          description: "My Stellar dApp using WalletConnect",
          name: "My Stellar dApp",
          icons: ["https://yourdomain.com/logo.png"],
          network: WalletNetwork.PUBLIC,
        }),
      ],
    });

    await kit.openModal({
      modalTitle: "Connect Your Stellar Wallet", // ✅ custom title
      notAvailableText: "No compatible wallet found.", // ✅ custom text
      onWalletSelected: async (option: ISupportedWallet) => {
        await kit.setWallet(option.id);
        const { address } = await kit.getAddress();
        if (address) setAddress(address);
      },
      onClosed: (err?: Error) => {
        if (err) {
          console.error("Modal closed with error:", err.message);
        } else {
          console.log("Modal closed normally");
        }
      },
    });
  };

  return (
    <div>
      <button
        onClick={connectWallet}
        className="
          bg-black/20 backdrop-blur-sm border border-white/20 rounded-full
          px-6 py-2.5 text-sm text-white font-medium outline-none
          transition-all duration-300 ease-out
          hover:border-white/30 hover:bg-black/25 hover:shadow-lg hover:shadow-white/5
          focus:border-white/40 focus:bg-black/30 focus:ring-2 focus:ring-white/10
          active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {address ? (
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="font-mono text-xs text-white/90">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
          </span>
        ) : (
          "Connect Stellar Wallet"
        )}
      </button>
    </div>
  );
}

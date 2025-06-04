"use client";
import './globals.css';
import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_URL, SOLANA_NETWORK } from '@/lib/constants';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "@solana/wallet-adapter-react-ui/styles.css";
interface RootLayoutProps {
  children: React.ReactNode;
}

const App: FC<RootLayoutProps> = ({ children }) => {
  const endpoint = useMemo(() => RPC_URL, []);
  const network = WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: SOLANA_NETWORK }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <html>
      <body>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
              <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>

  );
}

export default App;
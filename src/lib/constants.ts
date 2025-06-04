import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl, PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORK = WalletAdapterNetwork.Devnet; // Or Mainnet-beta
export const RPC_URL = clusterApiUrl(SOLANA_NETWORK);

// Example Token Mints (Devnet)
// Native SOL
export const INPUT_MINT_ADDRESS = 'So11111111111111111111111111111111111111112'; // SOL
export const OUTPUT_MINT_ADDRESS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // USDC (Devnet)

export const JUPITER_API_BASE_URL = 'https://quote-api.jup.ag/v6';
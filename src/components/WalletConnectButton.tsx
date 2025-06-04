"use client";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React from 'react';

const WalletConnectButton = () => {
    return (
        <div className="wallet-button-container">
            <WalletMultiButton />
        </div>
    );
};

export default WalletConnectButton;
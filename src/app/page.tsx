"use client";
import styles from '@/styles/Home.module.css';
import Head from 'next/head';
import WalletConnectButton from '@/components/WalletConnectButton';
import SwapInterface from '@/components/SwapInterface';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <>
      <Head>
        <title>Solana DEX 交易平台</title>
        <meta name="description" content="在Solana上交换代币" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.description}>
          <p className={styles.headerText}>
            Solana 代币交易平台 &nbsp;
            <code className={`${styles.walletCode} ${!publicKey && styles.disconnectedCode}`}>
              {publicKey ? `已连接: ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : '钱包未连接'}
            </code>
          </p>
          <div>
            <WalletConnectButton />
          </div>
        </div>
        
        <div className={styles.container}>
          <div className={styles.leftPanel}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>市场概览</h2>
              <p className={styles.marketInfo}>关注Solana生态系统中的热门代币和交易对</p>
              
              <div className={styles.marketCard}>
                <h3 className={styles.marketCardTitle}>SOL/USDC</h3>
                <div className={styles.pricePair}>
                  <span>当前价格:</span>
                  <span className={styles.priceUp}>$118.45</span>
                </div>
                <div className={styles.pricePair}>
                  <span>24h变化:</span>
                  <span className={styles.priceUp}>+3.2%</span>
                </div>
              </div>
              
              <div className={styles.marketCard}>
                <h3 className={styles.marketCardTitle}>JUP/USDC</h3>
                <div className={styles.pricePair}>
                  <span>当前价格:</span>
                  <span className={styles.priceDown}>$0.675</span>
                </div>
                <div className={styles.pricePair}>
                  <span>24h变化:</span>
                  <span className={styles.priceDown}>-1.8%</span>
                </div>
              </div>
              
              <div className={styles.marketCard}>
                <h3 className={styles.marketCardTitle}>BONK/USDC</h3>
                <div className={styles.pricePair}>
                  <span>当前价格:</span>
                  <span className={styles.priceUp}>$0.00001845</span>
                </div>
                <div className={styles.pricePair}>
                  <span>24h变化:</span>
                  <span className={styles.priceUp}>+5.7%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.rightPanel}>
            <SwapInterface />
          </div>
        </div>
      </main>
    </>
  );
}
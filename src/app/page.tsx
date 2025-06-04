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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main} style={{
        background: 'linear-gradient(to bottom, #1a2236, #121721)',
        minHeight: '100vh',
        padding: '1.5rem 1rem',
        color: '#e0e0e0'
      }}>
        <div className={styles.description} style={{
          background: 'rgba(30, 38, 55, 0.95)',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
          padding: '1rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
          border: '1px solid rgba(88, 102, 126, 0.2)'
        }}>
          <p style={{ 
            fontSize: '1.1rem', 
            fontWeight: '500',
            color: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            margin: 0
          }}>
            Solana 代币交易平台 &nbsp;
            <code className={styles.code} style={{
              background: 'rgba(20, 28, 45, 0.7)',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: publicKey ? '#64b5f6' : '#ff8a80',
              border: '1px solid rgba(88, 102, 126, 0.3)'
            }}>{publicKey ? `已连接: ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : '钱包未连接'}</code>
          </p>
          <div>
            <WalletConnectButton />
          </div>
        </div>
        
        {/* 左右布局容器 */}
        <div className={styles.container}>
          {/* 左侧面板 */}
          <div className={styles.leftPanel}>
            <div className={styles.card} style={{ height: '100%' }}>
              <h2 style={{ textAlign: 'center' }}>市场概览</h2>
              <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>关注Solana生态系统中的热门代币和交易对</p>
              
              <div style={{ 
                borderRadius: '8px', 
                background: 'rgba(44, 57, 80, 0.5)', 
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h3 style={{ fontSize: '1rem', color: '#90caf9', marginBottom: '0.5rem' }}>SOL/USDC</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>当前价格:</span>
                  <span style={{ color: '#81c784', fontWeight: 'bold' }}>$118.45</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>24h变化:</span>
                  <span style={{ color: '#81c784' }}>+3.2%</span>
                </div>
              </div>
              
              <div style={{ 
                borderRadius: '8px', 
                background: 'rgba(44, 57, 80, 0.5)', 
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h3 style={{ fontSize: '1rem', color: '#90caf9', marginBottom: '0.5rem' }}>JUP/USDC</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>当前价格:</span>
                  <span style={{ color: '#ff8a80', fontWeight: 'bold' }}>$0.675</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>24h变化:</span>
                  <span style={{ color: '#ff8a80' }}>-1.8%</span>
                </div>
              </div>
              
              <div style={{ 
                borderRadius: '8px', 
                background: 'rgba(44, 57, 80, 0.5)', 
                padding: '1rem' 
              }}>
                <h3 style={{ fontSize: '1rem', color: '#90caf9', marginBottom: '0.5rem' }}>BONK/USDC</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>当前价格:</span>
                  <span style={{ color: '#81c784', fontWeight: 'bold' }}>$0.00001845</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>24h变化:</span>
                  <span style={{ color: '#81c784' }}>+5.7%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧面板 - 兑换界面 */}
          <div className={styles.rightPanel}>
            <SwapInterface />
          </div>
        </div>
      </main>
    </>
  );
}
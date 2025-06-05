"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { createJupiterApiClient, QuoteGetRequest, SwapRequest, QuoteResponse } from '@jup-ag/api';
import { INPUT_MINT_ADDRESS, OUTPUT_MINT_ADDRESS, SOLANA_NETWORK, JUPITER_API_BASE_URL } from '@/lib/constants';
import { toast } from 'react-toastify';
import styles from '@/styles/Home.module.css';
import { useWindowSize } from '@/hooks/useWindowSize';

const SwapInterface: React.FC = () => {
    const { connection } = useConnection();
    const { publicKey, signTransaction } = useWallet();
    const { width } = useWindowSize();
    const isSmallScreen = width <= 480;

    // 初始化 Jupiter API 客户端
    const jupiterApi = useMemo(() => createJupiterApiClient({
        basePath: JUPITER_API_BASE_URL
    }), []);

    const [inputMint, setInputMint] = useState<string>(INPUT_MINT_ADDRESS);
    const [outputMint, setOutputMint] = useState<string>(OUTPUT_MINT_ADDRESS);
    const [amount, setAmount] = useState<string>('0.1');
    const [slippageBps, setSlippageBps] = useState<number>(50);

    const [quote, setQuote] = useState<QuoteResponse | null>(null);
    const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
    const [swapping, setSwapping] = useState<boolean>(false);

    // 使用 useCallback 包装 fetchQuote
    const fetchQuote = useCallback(async () => {
        if (!publicKey || parseFloat(amount) <= 0) {
            setQuote(null);
            return;
        }
        setLoadingQuote(true);
        setQuote(null);

        try {
            // TODO: 需要更动态地获取输入代币的 decimals
            const inputTokenDecimals = inputMint === INPUT_MINT_ADDRESS ? 9 : 6;
            const amountInSmallestUnit = Math.round(parseFloat(amount) * Math.pow(10, inputTokenDecimals));

            const params: QuoteGetRequest = {
                inputMint: inputMint,
                outputMint: outputMint,
                amount: amountInSmallestUnit,
                slippageBps: slippageBps,
            };

            const jupiterQuote = await jupiterApi.quoteGet(params);

            if (jupiterQuote) {
                setQuote(jupiterQuote);
                toast.success("报价已更新!");
            } else {
                throw new Error("收到空的报价响应.");
            }

        } catch (error: any) {
            const errorMessage = error.message || (error.error?.message) || '获取报价失败';
            console.error("获取报价时发生错误:", error);
            toast.error(`获取报价时发生错误: ${errorMessage}`);
            setQuote(null);
        } finally {
            setLoadingQuote(false);
        }
    }, [amount, inputMint, outputMint, slippageBps, publicKey, jupiterApi]);


    const handleSwap = async () => {
        if (!publicKey || !quote || !signTransaction) {
            toast.error("无法兑换: 钱包未连接或没有可用报价.");
            return;
        }
        setSwapping(true);
        toast.info("正在准备交易...");

        try {
            const swapRequestBody: SwapRequest = {
                quoteResponse: quote,
                userPublicKey: publicKey.toBase58(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
            };

            const swapResult = await jupiterApi.swapPost({ swapRequest: swapRequestBody });
            const { swapTransaction, lastValidBlockHeight } = swapResult;

            const transactionBuf = Buffer.from(swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(transactionBuf);

            toast.info("请在钱包中签名交易...");
            const signedTransaction = await signTransaction(transaction);

            const rawTransaction = signedTransaction.serialize();
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 5,
            });
            toast.info(`交易已发送! 交易ID: ${txid.substring(0, 10)}... 正在确认...`);

            const confirmation = await connection.confirmTransaction({
                signature: txid,
                blockhash: transaction.message.recentBlockhash,
                lastValidBlockHeight: lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                console.error("交易确认错误:", confirmation.value.err);
                throw new Error(`交易确认失败: ${JSON.stringify(confirmation.value.err)}`);
            }

            toast.success(`兑换成功! 交易ID: ${txid}`);
            console.log(`兑换成功: https://solscan.io/tx/${txid}?cluster=${SOLANA_NETWORK.toLowerCase()}`);
            setQuote(null);

        } catch (error: any) {
            const errorMessage = error.message || (error.error?.message) || '兑换失败';
            console.error("兑换失败详情:", error);
            toast.error(`兑换失败: ${errorMessage}`);
        } finally {
            setSwapping(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            if (parseFloat(amount) > 0 && publicKey) {
                fetchQuote();
            } else {
                setQuote(null);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [amount, inputMint, outputMint, slippageBps, publicKey, fetchQuote]);

    return (
        <div className={`${styles.card} ${styles.cardFlex}`}>
            <h2 className={styles.cardTitle}>代币兑换</h2>
            
            <div className={styles.formGroup}>
                <label htmlFor="inputMint" className={styles.formLabel}>输入代币地址:</label>
                <input
                    id="inputMint"
                    type="text"
                    value={inputMint}
                    onChange={(e) => { setInputMint(e.target.value); setQuote(null); }}
                    placeholder="输入代币地址"
                    className={styles.formInput}
                    disabled={loadingQuote || swapping}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="amount" className={styles.formLabel}>兑换数量:</label>
                <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); }}
                    placeholder="输入数量"
                    min="0"
                    step="0.0001"
                    className={styles.formInput}
                    disabled={loadingQuote || swapping}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="outputMint" className={styles.formLabel}>输出代币地址:</label>
                <input
                    id="outputMint"
                    type="text"
                    value={outputMint}
                    onChange={(e) => { setOutputMint(e.target.value); setQuote(null); }}
                    placeholder="输出代币地址"
                    className={styles.formInput}
                    disabled={loadingQuote || swapping}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="slippage" className={styles.formLabel}>滑点容忍度 (%):</label>
                <input
                    id="slippage"
                    type="number"
                    inputMode="decimal"
                    value={slippageBps / 100}
                    onChange={(e) => { setSlippageBps(Math.round(parseFloat(e.target.value) * 100)); }}
                    placeholder="滑点，如 0.5"
                    min="0.1"
                    step="0.1"
                    className={styles.formInput}
                    disabled={loadingQuote || swapping}
                />
            </div>

            <div className={styles.buttonContainer} style={{ 
                flexDirection: isSmallScreen ? 'column' : 'row' 
            }}>
                <button
                    onClick={fetchQuote}
                    disabled={!publicKey || loadingQuote || swapping || parseFloat(amount) <= 0}
                    className={`${styles.button} ${styles.primaryButton}`}
                    style={{ marginBottom: isSmallScreen ? '10px' : '0' }}
                >
                    {loadingQuote ? '获取报价中...' : '刷新报价'}
                </button>

                <button
                    onClick={handleSwap}
                    disabled={!publicKey || !quote || swapping || loadingQuote}
                    className={`${styles.button} ${styles.successButton}`}
                >
                    {swapping ? '兑换中...' : '确认兑换'}
                </button>
            </div>

            {loadingQuote && !swapping && 
                <p className={styles.loadingText}>正在加载报价...</p>
            }

            {quote && <QuoteInfo quote={quote} />}
            
            <div className={styles.spacer}></div>
            
            <p className={styles.footerHint}>
                请确保交易前已连接钱包并拥有足够的代币余额
            </p>
        </div>
    );
};

const QuoteInfo = ({ quote }: { quote: QuoteResponse }) => {
    if (!quote) return null;
    
    const inputTokenDecimals = quote.inputMint === INPUT_MINT_ADDRESS ? 9 : 6;
    const outputTokenDecimals = quote.outputMint === INPUT_MINT_ADDRESS ? 9 : 6;

    const inputAmountUi = parseFloat(quote.inAmount) / Math.pow(10, inputTokenDecimals);
    const outputAmountUi = parseFloat(quote.outAmount) / Math.pow(10, outputTokenDecimals);
    const priceImpact = parseFloat(quote.priceImpactPct);

    // 缩短地址显示
    const shortenAddress = (address: string) => {
        if (address.length <= 8) return address;
        return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
    };
    
    const { width } = useWindowSize();
    const isSmallScreen = width <= 480;
    
    return (
        <div className={styles.grid}>
            <h4 className={styles.quoteTitle}>交易报价</h4>
            
            <div className={styles.quoteRow} style={{ flexDirection: isSmallScreen ? 'column' : 'row' }}>
                <span className={styles.quoteLabel}>输入:</span> 
                <span className={styles.quoteValue} style={{ textAlign: isSmallScreen ? 'left' : 'right' }}>
                    {inputAmountUi.toFixed(4)} ({shortenAddress(quote.inputMint)})
                </span>
            </div>
            
            <div className={styles.quoteRow} style={{ flexDirection: isSmallScreen ? 'column' : 'row' }}>
                <span className={styles.quoteLabel}>输出(最小):</span> 
                <span className={styles.quoteValue} style={{ textAlign: isSmallScreen ? 'left' : 'right' }}>
                    {outputAmountUi.toFixed(6)} ({shortenAddress(quote.outputMint)})
                </span>
            </div>
            
            <div className={styles.quoteRow}>
                <span className={styles.quoteLabel}>价格影响:</span> 
                <span className={priceImpact > 0.05 ? styles.impactWarning : styles.impactGood}>
                    {(priceImpact * 100).toFixed(4)}%
                </span>
            </div>
            
            <div className={styles.quoteRow} style={{ flexDirection: isSmallScreen ? 'column' : 'row' }}>
                <span className={styles.quoteLabel}>路由:</span> 
                <span className={styles.quoteValue} style={{ 
                    textAlign: isSmallScreen ? 'left' : 'right',
                    marginTop: isSmallScreen ? '4px' : '0'
                }}>
                    {quote.routePlan.map(p => p.swapInfo.label).join(' → ')}
                </span>
            </div>
        </div>
    );
};

export default SwapInterface;
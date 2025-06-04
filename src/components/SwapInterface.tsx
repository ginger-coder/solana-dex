"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
// 从 @jup-ag/api 导入
import { createJupiterApiClient, QuoteGetRequest, SwapRequest, QuoteResponse } from '@jup-ag/api';
// 我们的自定义类型（可以与 @jup-ag/api 的类型比较和对齐，但通常它们是兼容的，因为都基于 OpenAPI 规范）
import { SwapResponse as CustomSwapResponse } from '@/types/jupiter'; // Renamed to avoid conflict if SDK exports SwapResponse
import { INPUT_MINT_ADDRESS, OUTPUT_MINT_ADDRESS, SOLANA_NETWORK } from '@/lib/constants';
import { toast } from 'react-toastify';
import styles from '@/styles/Home.module.css';

// 注意：@jup-ag/api 本身会导出 QuoteResponse 和 SwapResponse 类型。
// 为清晰起见，如果我们的自定义类型与之冲突，最好重命名或直接使用 SDK 的类型。
// 在此示例中，假设我们的 types/jupiter.ts 中的 QuoteResponse 与 SDK 的兼容。
// 对于 SwapResponse，我们使用 CustomSwapResponse 以防 SDK 的 SwapResponse 结构略有不同或用于请求。

const SwapInterface: React.FC = () => {
    const { connection } = useConnection();
    const { publicKey, signTransaction } = useWallet();

    // 初始化 Jupiter API 客户端
    const jupiterApi = useMemo(() => createJupiterApiClient(), []);

    const [inputMint, setInputMint] = useState<string>(INPUT_MINT_ADDRESS);
    const [outputMint, setOutputMint] = useState<string>(OUTPUT_MINT_ADDRESS);
    const [amount, setAmount] = useState<string>('0.1');
    const [slippageBps, setSlippageBps] = useState<number>(50);

    const [quote, setQuote] = useState<QuoteResponse | null>(null); // SDK 的 QuoteResponse 应该可以直接使用
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
            const inputTokenDecimals = inputMint === INPUT_MINT_ADDRESS ? 9 : 6; // SOL is 9, USDC (devnet/mainnet) is 6. This should be dynamic.
            const amountInSmallestUnit = Math.round(parseFloat(amount) * Math.pow(10, inputTokenDecimals));

            const params: QuoteGetRequest = {
                inputMint: inputMint,
                outputMint: outputMint,
                amount: amountInSmallestUnit, // API 需要 lamports 或最小单位
                slippageBps: slippageBps,
                // onlyDirectRoutes: false, // 可选
                // platformFeeBps: 0, // 如果你有平台费用
            };

            const jupiterQuote = await jupiterApi.quoteGet(params); // 使用 SDK 获取报价

            if (jupiterQuote) {
                setQuote(jupiterQuote); // 直接使用 SDK 返回的 QuoteResponse
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
            const swapRequestBody: SwapRequest = { // 这是 @jup-ag/api 期望的类型
                quoteResponse: quote,
                userPublicKey: publicKey.toBase58(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true, // 推荐，以获得更好的CU估算
                // prioritizeFeeLamports: { autoMultiplier: 2 }, // 支付优先费用以提高成功率，'auto' 或具体数值
            };

            // 使用 SDK 获取交易对象
            const swapResult = await jupiterApi.swapPost({ swapRequest: swapRequestBody });

            // swapResult 的类型是 SDK 定义的 SwapResponse，它包含 swapTransaction 和 lastValidBlockHeight
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
            setQuote(null); // 重置报价
            // 可选择在此重新获取余额

        } catch (error: any) {
            const errorMessage = error.message || (error.error?.message) || '兑换失败';
            console.error("兑换失败详情:", error);
            toast.error(`兑换失败: ${errorMessage}`);
        } finally {
            setSwapping(false);
        }
    };

    return (
        <div className={styles.card} style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h2 style={{ 
                textAlign: 'center', 
                marginBottom: '25px', 
                color: '#e0e0e0',
                fontSize: '1.5rem',
                fontWeight: '600'
            }}>代币兑换</h2>
            
            <div style={{ marginBottom: '18px' }}>
                <label htmlFor="inputMint" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#b0bec5',
                    fontSize: '0.95rem'
                }}>输入代币地址:</label>
                <input
                    id="inputMint"
                    type="text"
                    value={inputMint}
                    onChange={(e) => { setInputMint(e.target.value); setQuote(null); }}
                    placeholder="输入代币地址"
                    style={{ 
                        width: '100%', 
                        padding: '12px 15px', 
                        marginBottom: '10px',
                        borderRadius: '8px',
                        border: '1px solid #37474f',
                        fontSize: '0.95rem',
                        transition: 'border 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
                        backgroundColor: '#2c3950',
                        color: '#e0e0e0'
                    }}
                    disabled={loadingQuote || swapping}
                />
            </div>
            
            <div style={{ marginBottom: '18px' }}>
                <label htmlFor="amount" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#b0bec5',
                    fontSize: '0.95rem'
                }}>兑换数量:</label>
                <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); }}
                    placeholder="输入数量"
                    min="0"
                    step="0.0001"
                    style={{ 
                        width: '100%', 
                        padding: '12px 15px', 
                        marginBottom: '10px',
                        borderRadius: '8px',
                        border: '1px solid #37474f',
                        fontSize: '0.95rem',
                        transition: 'border 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
                        backgroundColor: '#2c3950',
                        color: '#e0e0e0'
                    }}
                    disabled={loadingQuote || swapping}
                />
            </div>
            
            <div style={{ marginBottom: '18px' }}>
                <label htmlFor="outputMint" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#b0bec5',
                    fontSize: '0.95rem'
                }}>输出代币地址:</label>
                <input
                    id="outputMint"
                    type="text"
                    value={outputMint}
                    onChange={(e) => { setOutputMint(e.target.value); setQuote(null); }}
                    placeholder="输出代币地址"
                    style={{ 
                        width: '100%', 
                        padding: '12px 15px', 
                        marginBottom: '10px',
                        borderRadius: '8px',
                        border: '1px solid #37474f',
                        fontSize: '0.95rem',
                        transition: 'border 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
                        backgroundColor: '#2c3950',
                        color: '#e0e0e0'
                    }}
                    disabled={loadingQuote || swapping}
                />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
                <label htmlFor="slippage" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#b0bec5',
                    fontSize: '0.95rem'
                }}>滑点容忍度 (%):</label>
                <input
                    id="slippage"
                    type="number"
                    value={slippageBps / 100}
                    onChange={(e) => { setSlippageBps(Math.round(parseFloat(e.target.value) * 100)); }}
                    placeholder="滑点，如 0.5"
                    min="0.1"
                    step="0.1"
                    style={{ 
                        width: '100%', 
                        padding: '12px 15px', 
                        marginBottom: '10px',
                        borderRadius: '8px',
                        border: '1px solid #37474f',
                        fontSize: '0.95rem',
                        transition: 'border 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
                        backgroundColor: '#2c3950',
                        color: '#e0e0e0'
                    }}
                    disabled={loadingQuote || swapping}
                />
            </div>

            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '25px',
                gap: '15px'
            }}>
                <button
                    onClick={fetchQuote}
                    disabled={!publicKey || loadingQuote || swapping || parseFloat(amount) <= 0}
                    className={styles.button}
                    style={{ 
                        flex: '1',
                        backgroundColor: '#1976d2',
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        color: '#e0e0e0',
                        fontWeight: 'bold',
                        cursor: !publicKey || loadingQuote || swapping || parseFloat(amount) <= 0 ? 'not-allowed' : 'pointer',
                        opacity: !publicKey || loadingQuote || swapping || parseFloat(amount) <= 0 ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 5px rgba(25, 118, 210, 0.5)',
                        fontSize: '1rem'
                    }}
                >
                    {loadingQuote ? '获取报价中...' : '刷新报价'}
                </button>

                <button
                    onClick={handleSwap}
                    disabled={!publicKey || !quote || swapping || loadingQuote}
                    className={styles.button}
                    style={{ 
                        flex: '1',
                        backgroundColor: '#2e7d32',
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        color: '#e0e0e0',
                        fontWeight: 'bold',
                        cursor: !publicKey || !quote || swapping || loadingQuote ? 'not-allowed' : 'pointer',
                        opacity: !publicKey || !quote || swapping || loadingQuote ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 5px rgba(46, 125, 50, 0.5)',
                        fontSize: '1rem'
                    }}
                >
                    {swapping ? '兑换中...' : '确认兑换'}
                </button>
            </div>

            {loadingQuote && !swapping && 
                <p style={{ 
                    textAlign: 'center', 
                    marginTop: '10px', 
                    color: '#b0bec5',
                    padding: '8px',
                    backgroundColor: '#2c3950',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                }}>正在加载报价...</p>
            }

            {quote && <QuoteInfo quote={quote} />}
            
            {/* 添加弹性空间以使内容填充 */}
            <div style={{ flexGrow: 1 }}></div>
            
            {/* 底部提示 */}
            <p style={{ 
                fontSize: '0.85rem', 
                color: '#78909c', 
                textAlign: 'center',
                marginTop: '20px',
                padding: '10px',
                borderTop: '1px solid #37474f'
            }}>
                请确保交易前已连接钱包并拥有足够的代币余额
            </p>
        </div>
    );
};

const QuoteInfo = ({ quote }: { quote: QuoteResponse }) => {
    if (!quote) return null;
    // TODO: 需要动态获取 input/output 代币的 decimals 用于 UI 显示
    const inputTokenDecimals = quote.inputMint === INPUT_MINT_ADDRESS ? 9 : 6;
    const outputTokenDecimals = quote.outputMint === INPUT_MINT_ADDRESS ? 9 : 6;

    const inputAmountUi = parseFloat(quote.inAmount) / Math.pow(10, inputTokenDecimals);
    const outputAmountUi = parseFloat(quote.outAmount) / Math.pow(10, outputTokenDecimals);

    return (
        <div className={styles.grid} style={{ 
            marginTop: '20px', 
            border: '1px solid #37474f', 
            padding: '20px', 
            borderRadius: '12px',
            backgroundColor: '#2c3950',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 0.3s ease-in-out'
        }}>
            <h4 style={{ 
                margin: '0 0 15px 0', 
                color: '#90caf9', 
                fontSize: '1.1rem',
                borderBottom: '1px solid #37474f',
                paddingBottom: '10px'
            }}>交易报价</h4>
            <p style={{ 
                margin: '8px 0',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span style={{ fontWeight: 'bold', color: '#b0bec5' }}>输入:</span> 
                <span style={{ color: '#e0e0e0' }}>{inputAmountUi.toFixed(4)} ({quote.inputMint.substring(0, 4)}...{quote.inputMint.substring(quote.inputMint.length - 4)})</span>
            </p>
            <p style={{ 
                margin: '8px 0', 
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span style={{ fontWeight: 'bold', color: '#b0bec5' }}>输出(最小):</span> 
                <span style={{ color: '#e0e0e0' }}>{outputAmountUi.toFixed(6)} ({quote.outputMint.substring(0, 4)}...{quote.outputMint.substring(quote.outputMint.length - 4)})</span>
            </p>
            <p style={{ 
                margin: '8px 0', 
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span style={{ fontWeight: 'bold', color: '#b0bec5' }}>价格影响:</span> 
                <span className={parseFloat(quote.priceImpactPct) > 0.05 ? 'text-warning' : 'text-success'} style={{
                    color: parseFloat(quote.priceImpactPct) > 0.05 ? '#ffb74d' : '#81c784'
                }}>
                    {(parseFloat(quote.priceImpactPct) * 100).toFixed(4)}%
                </span>
            </p>
            <p style={{ 
                margin: '8px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <span style={{ fontWeight: 'bold', color: '#b0bec5' }}>路由:</span> 
                <span style={{ 
                    textAlign: 'right',
                    maxWidth: '70%',
                    wordBreak: 'break-word',
                    color: '#e0e0e0'
                }}>{quote.routePlan.map(p => p.swapInfo.label).join(' → ')}</span>
            </p>
        </div>
    );
};

export default SwapInterface;
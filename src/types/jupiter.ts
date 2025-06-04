export interface TokenInfo {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    logoURI: string;
    tags: string[];
    extensions?: Record<string, unknown>;
}

export interface RoutePlanStep {
    swapAmm: {
        id: string;
        label: string;
    };
}

export interface QuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    priceImpactPct: string;
    routePlan: RoutePlanStep[];
    contextSlot: number;
    timeTaken: number;
    slippageBps: number;
    platformFee?: {
        amount: string;
        feeBps: number;
    };
    otherAmountThreshold: string; // Important for slippage
    swapMode: string;
}

export interface SwapResponse {
    swapTransaction: string; // base64 encoded transaction
    lastValidBlockHeight: number;
}

export interface JupiterErrorResponse {
    error?: {
        message: string;
    };
    message?: string; // Fallback for different error structures
}
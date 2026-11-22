/**
 * Live Cryptocurrency Rates Service
 * Fetches real-time market exchange rates using free public APIs with instant fallbacks.
 */

export interface CryptoRates {
  BTC: number;
  ETH: number;
  SOL: number;
  USDT: number;
  USDC: number;
  [coin: string]: number;
}

export const FALLBACK_RATES: CryptoRates = {
  BTC: 96500,
  ETH: 2750,
  SOL: 185,
  USDT: 1.0,
  USDC: 1.0,
};

let cachedRates: CryptoRates = { ...FALLBACK_RATES };
let lastFetchedTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Fetch live cryptocurrency rates against USD.
 * Tries CoinGecko free public API, with instant graceful fallback.
 */
export async function fetchLiveCryptoRates(): Promise<CryptoRates> {
  const now = Date.now();
  if (now - lastFetchedTime < CACHE_TTL_MS && lastFetchedTime > 0) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether,usd-coin&vs_currencies=usd",
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.bitcoin?.usd) {
        cachedRates = {
          BTC: Number(data.bitcoin.usd) || FALLBACK_RATES.BTC,
          ETH: Number(data.ethereum?.usd) || FALLBACK_RATES.ETH,
          SOL: Number(data.solana?.usd) || FALLBACK_RATES.SOL,
          USDT: Number(data.tether?.usd) || 1.0,
          USDC: Number(data["usd-coin"]?.usd) || 1.0,
        };
        lastFetchedTime = now;
        return cachedRates;
      }
    }
  } catch (err) {
    // Network timeout or CORS restriction; fallback seamlessly to cached / standard rates
    console.info("Using cached crypto rates:", err);
  }

  return cachedRates;
}

/**
 * Calculate the crypto equivalent for a given USD fee/amount.
 * e.g., $1,500 fee with BTC -> "0.0155 BTC"
 */
export function calculateCryptoAmount(
  usdAmount: number | string | null | undefined,
  coin: string,
  rates: CryptoRates = cachedRates
): {
  formatted: string;
  cryptoValue: number;
  symbol: string;
  fullDisplay: string;
} {
  const symbol = (coin || "BTC").toUpperCase().trim();
  const numUSD =
    typeof usdAmount === "number"
      ? usdAmount
      : parseFloat(String(usdAmount || "0").replace(/[^0-9.]/g, "")) || 0;

  if (numUSD <= 0) {
    return {
      formatted: `0 ${symbol}`,
      cryptoValue: 0,
      symbol,
      fullDisplay: `0 ${symbol}`,
    };
  }

  const rate = rates[symbol] || FALLBACK_RATES[symbol] || 1;
  const rawCrypto = numUSD / rate;

  let formatted = "";
  if (symbol === "BTC") {
    formatted = `${rawCrypto.toFixed(4)} BTC`;
  } else if (symbol === "ETH") {
    formatted = `${rawCrypto.toFixed(4)} ETH`;
  } else if (symbol === "SOL") {
    formatted = `${rawCrypto.toFixed(3)} SOL`;
  } else if (symbol === "USDT" || symbol === "USDC") {
    const rounded = Math.round(rawCrypto * 100) / 100;
    formatted = `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(rounded)} ${symbol}`;
  } else {
    formatted = `${rawCrypto.toFixed(4)} ${symbol}`;
  }

  return {
    formatted,
    cryptoValue: rawCrypto,
    symbol,
    fullDisplay: `${formatted} (≈ $${new Intl.NumberFormat("en-US").format(numUSD)} USD)`,
  };
}

/**
 * Generate standard mobile crypto URI schemes & deep links
 */
export function getWalletDeepLink(coin: string, address: string, amount?: number | string): string {
  const c = (coin || "").toUpperCase().trim();
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount || "0")) || 0;
  const cleanAddr = (address || "").trim();

  if (c === "BTC" || c === "BITCOIN") {
    return amt > 0 ? `bitcoin:${cleanAddr}?amount=${amt}` : `bitcoin:${cleanAddr}`;
  }
  if (c === "ETH" || c === "ETHEREUM") {
    return amt > 0 ? `ethereum:${cleanAddr}?value=${amt}` : `ethereum:${cleanAddr}`;
  }
  if (c === "SOL" || c === "SOLANA") {
    return amt > 0 ? `solana:${cleanAddr}?amount=${amt}` : `solana:${cleanAddr}`;
  }
  if (c === "USDT" || c === "USDC") {
    return amt > 0 ? `ethereum:${cleanAddr}?value=${amt}` : `ethereum:${cleanAddr}`;
  }
  return `ethereum:${cleanAddr}`;
}

export function getMetaMaskDeepLink(address: string, amount?: number | string): string {
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount || "0")) || 0;
  const cleanAddr = (address || "").trim();
  return amt > 0
    ? `https://metamask.app.link/send/pay-${cleanAddr}@1?value=${amt}`
    : `https://metamask.app.link/send/pay-${cleanAddr}@1`;
}

export function getTrustWalletDeepLink(coin: string, address: string, amount?: number | string): string {
  const c = (coin || "").toUpperCase().trim();
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount || "0")) || 0;
  const cleanAddr = (address || "").trim();
  let asset = "c60";
  if (c === "BTC") asset = "c0";
  else if (c === "SOL") asset = "c501";

  return amt > 0
    ? `https://link.trustwallet.com/send?asset=${asset}&address=${cleanAddr}&amount=${amt}`
    : `https://link.trustwallet.com/send?asset=${asset}&address=${cleanAddr}`;
}

import { EvmPriceServiceConnection } from '@pythnetwork/pyth-evm-js';

// Pyth Price Feed IDs (Mainnet - Free to use, no API key required)
// Full list: https://pyth.network/developers/price-feed-ids
export const PYTH_PRICE_FEEDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  MOVE: '0x8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026',
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
};

export interface PythPrice {
  symbol: string;
  price: number;
  confidence: number;
  timestamp: number;
  expo: number;
  isStale: boolean;
}

interface PriceCache {
  [symbol: string]: {
    data: PythPrice;
    fetchedAt: number;
  };
}

class PythOracleService {
  private connection: EvmPriceServiceConnection;
  private cache: PriceCache = {};
  private cacheTimeout = 10000; // 10 seconds (Pyth updates ~400ms)
  private staleThreshold = 60000; // 60 seconds

  constructor() {
    // Pyth Hermes endpoint - FREE, no authentication required
    this.connection = new EvmPriceServiceConnection(
      'https://hermes.pyth.network',
      {
        priceFeedRequestConfig: {
          binary: true,
        },
      }
    );
  }

  /**
   * Get latest price for a single asset
   * @param symbol Asset symbol (BTC, ETH, SOL, MOVE, etc.)
   * @returns PythPrice object or null if unavailable
   */
  async getPrice(symbol: string): Promise<PythPrice | null> {
    const cached = this.cache[symbol];

    // Return cache if fresh (< 10 seconds)
    if (cached && Date.now() - cached.fetchedAt < this.cacheTimeout) {
      console.log(`💰 Cache hit for ${symbol}: $${cached.data.price.toFixed(2)}`);
      return cached.data;
    }

    try {
      const priceId = PYTH_PRICE_FEEDS[symbol as keyof typeof PYTH_PRICE_FEEDS];

      if (!priceId) {
        console.warn(`⚠️ No Pyth price feed configured for ${symbol}`);
        return null;
      }

      // Fetch from Pyth Network (FREE)
      const priceFeeds = await this.connection.getLatestPriceFeeds([priceId]);

      if (!priceFeeds || priceFeeds.length === 0) {
        console.error(`❌ No price feed returned for ${symbol}`);
        return null;
      }

      const priceFeed = priceFeeds[0];
      const price = priceFeed.getPriceUnchecked();

      // Convert Pyth price format to USD
      const priceValue = Number(price.price) * Math.pow(10, price.expo);
      const confidenceValue = Number(price.conf) * Math.pow(10, price.expo);
      const publishTime = Number(price.publishTime) * 1000; // Convert to ms
      const age = Date.now() - publishTime;

      const pythPrice: PythPrice = {
        symbol,
        price: priceValue,
        confidence: confidenceValue,
        timestamp: publishTime,
        expo: price.expo,
        isStale: age > this.staleThreshold,
      };

      // Cache the result
      this.cache[symbol] = {
        data: pythPrice,
        fetchedAt: Date.now(),
      };

      console.log(
        `✅ Pyth price for ${symbol}: $${priceValue.toFixed(2)} (±$${confidenceValue.toFixed(2)}) ${pythPrice.isStale ? '⚠️ STALE' : ''}`
      );

      return pythPrice;
    } catch (error) {
      console.error(`❌ Failed to fetch Pyth price for ${symbol}:`, error);
      // Return cached data if available, even if stale
      return cached?.data || null;
    }
  }

  /**
   * Get multiple prices at once (more efficient than individual calls)
   * @param symbols Array of asset symbols
   * @returns Record of symbol -> PythPrice
   */
  async getPrices(symbols: string[]): Promise<Record<string, PythPrice>> {
    const priceIds = symbols
      .map((symbol) => PYTH_PRICE_FEEDS[symbol as keyof typeof PYTH_PRICE_FEEDS])
      .filter(Boolean);

    if (priceIds.length === 0) {
      console.warn('⚠️ No valid price feed IDs found');
      return {};
    }

    try {
      const priceFeeds = await this.connection.getLatestPriceFeeds(priceIds);
      const result: Record<string, PythPrice> = {};

      priceFeeds.forEach((feed, index) => {
        const symbol = symbols[index];
        const price = feed.getPriceUnchecked();

        const priceValue = Number(price.price) * Math.pow(10, price.expo);
        const confidenceValue = Number(price.conf) * Math.pow(10, price.expo);
        const publishTime = Number(price.publishTime) * 1000;
        const age = Date.now() - publishTime;

        const pythPrice: PythPrice = {
          symbol,
          price: priceValue,
          confidence: confidenceValue,
          timestamp: publishTime,
          expo: price.expo,
          isStale: age > this.staleThreshold,
        };

        result[symbol] = pythPrice;

        // Cache it
        this.cache[symbol] = {
          data: pythPrice,
          fetchedAt: Date.now(),
        };
      });

      console.log(`✅ Fetched ${Object.keys(result).length} prices from Pyth`);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch Pyth prices:', error);
      return {};
    }
  }

  /**
   * Get bundle prices (BTC 50%, ETH 30%, SOL 20%)
   * Used for bundleTrade and bucket protocol
   */
  async getBundlePrices() {
    const prices = await this.getPrices(['BTC', 'ETH', 'SOL']);

    if (!prices.BTC || !prices.ETH || !prices.SOL) {
      throw new Error('Failed to fetch bundle prices from Pyth');
    }

    const bundleValue =
      prices.BTC.price * 0.5 + prices.ETH.price * 0.3 + prices.SOL.price * 0.2;

    return {
      btc: {
        symbol: 'BTC',
        price: prices.BTC.price,
        change24h: 0, // Pyth doesn't provide 24h change directly
        lastUpdated: prices.BTC.timestamp,
        confidence: prices.BTC.confidence,
        isStale: prices.BTC.isStale,
      },
      eth: {
        symbol: 'ETH',
        price: prices.ETH.price,
        change24h: 0,
        lastUpdated: prices.ETH.timestamp,
        confidence: prices.ETH.confidence,
        isStale: prices.ETH.isStale,
      },
      sol: {
        symbol: 'SOL',
        price: prices.SOL.price,
        change24h: 0,
        lastUpdated: prices.SOL.timestamp,
        confidence: prices.SOL.confidence,
        isStale: prices.SOL.isStale,
      },
      bundleValue,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if a price is stale (older than threshold)
   */
  isPriceStale(price: PythPrice): boolean {
    const age = Date.now() - price.timestamp;
    return age > this.staleThreshold;
  }

  /**
   * Get price with confidence interval bounds
   * Returns [lowerBound, price, upperBound]
   */
  getPriceWithConfidence(price: PythPrice): [number, number, number] {
    return [
      price.price - price.confidence,
      price.price,
      price.price + price.confidence,
    ];
  }

  /**
   * Calculate confidence percentage
   * Returns value between 0-100 (higher is better)
   */
  getConfidencePercentage(price: PythPrice): number {
    const confidenceRatio = price.confidence / price.price;
    return Math.max(0, Math.min(100, (1 - confidenceRatio) * 100));
  }

  /**
   * Check if price is safe for trading
   * Returns true if confidence is high enough and price is not stale
   */
  isSafeForTrading(price: PythPrice, minConfidence: number = 95): boolean {
    const confidence = this.getConfidencePercentage(price);
    return !price.isStale && confidence >= minConfidence;
  }

  /**
   * Format price age for display
   * e.g., "2s ago", "45s ago", "2m ago"
   */
  formatPriceAge(price: PythPrice): string {
    const ageMs = Date.now() - price.timestamp;
    const ageSec = Math.floor(ageMs / 1000);

    if (ageSec < 60) {
      return `${ageSec}s ago`;
    } else if (ageSec < 3600) {
      const ageMin = Math.floor(ageSec / 60);
      return `${ageMin}m ago`;
    } else {
      const ageHour = Math.floor(ageSec / 3600);
      return `${ageHour}h ago`;
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache() {
    this.cache = {};
    console.log('🗑️ Pyth price cache cleared');
  }
}

// Export singleton instance
export const pythOracleService = new PythOracleService();
export default pythOracleService;

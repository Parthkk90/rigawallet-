/**
 * Price Service - Fetches real-time crypto prices
 * Supports: CoinGecko (primary), Binance (fallback)
 */

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: number;
}

interface BundlePrice {
  btc: PriceData;
  eth: PriceData;
  sol: PriceData;
  bundleValue: number;
  timestamp: number;
}

class PriceService {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private CACHE_DURATION = 30000; // 30 seconds

  /**
   * Fetch prices from CoinGecko API (Free, no auth required)
   */
  async fetchFromCoinGecko(symbols: string[]): Promise<Map<string, PriceData>> {
    try {
      const ids = symbols.map(s => {
        switch(s.toUpperCase()) {
          case 'BTC': return 'bitcoin';
          case 'ETH': return 'ethereum';
          case 'SOL': return 'solana';
          default: return s.toLowerCase();
        }
      }).join(',');

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      
      console.log('📊 Fetching prices from CoinGecko...');
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const prices = new Map<string, PriceData>();

      Object.entries(data).forEach(([id, priceData]: [string, any]) => {
        let symbol = id.toUpperCase();
        if (id === 'bitcoin') symbol = 'BTC';
        if (id === 'ethereum') symbol = 'ETH';
        if (id === 'solana') symbol = 'SOL';

        prices.set(symbol, {
          symbol,
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          lastUpdated: Date.now(),
        });
      });

      console.log('✅ Prices fetched from CoinGecko');
      return prices;
    } catch (error) {
      console.error('❌ CoinGecko fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch prices from Binance API (Fallback)
   */
  async fetchFromBinance(symbols: string[]): Promise<Map<string, PriceData>> {
    try {
      console.log('📊 Fetching prices from Binance...');
      const prices = new Map<string, PriceData>();

      for (const symbol of symbols) {
        const pair = `${symbol}USDT`;
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
        
        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json();
        prices.set(symbol, {
          symbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          lastUpdated: Date.now(),
        });
      }

      console.log('✅ Prices fetched from Binance');
      return prices;
    } catch (error) {
      console.error('❌ Binance fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get bundle prices (BTC 50%, ETH 30%, SOL 20%)
   */
  async getBundlePrices(): Promise<BundlePrice> {
    try {
      const symbols = ['BTC', 'ETH', 'SOL'];
      let prices: Map<string, PriceData>;

      // Try CoinGecko first, fallback to Binance
      try {
        prices = await this.fetchFromCoinGecko(symbols);
      } catch (error) {
        console.log('⚠️ CoinGecko failed, trying Binance...');
        prices = await this.fetchFromBinance(symbols);
      }

      const btc = prices.get('BTC')!;
      const eth = prices.get('ETH')!;
      const sol = prices.get('SOL')!;

      // Calculate bundle value (weighted average for $1000 investment)
      // BTC 50% = $500, ETH 30% = $300, SOL 20% = $200
      const bundleValue = (btc.price * 0.5) + (eth.price * 0.3) + (sol.price * 0.2);

      return {
        btc,
        eth,
        sol,
        bundleValue,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Failed to fetch bundle prices:', error);
      // Return fallback prices
      return {
        btc: { symbol: 'BTC', price: 43500, change24h: 0, lastUpdated: Date.now() },
        eth: { symbol: 'ETH', price: 2300, change24h: 0, lastUpdated: Date.now() },
        sol: { symbol: 'SOL', price: 98, change24h: 0, lastUpdated: Date.now() },
        bundleValue: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get single asset price with caching
   */
  async getPrice(symbol: string): Promise<number> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const prices = await this.fetchFromCoinGecko([symbol]);
      const priceData = prices.get(symbol.toUpperCase());
      
      if (priceData) {
        this.cache.set(symbol, { price: priceData.price, timestamp: Date.now() });
        return priceData.price;
      }
    } catch (error) {
      // Try Binance fallback
      try {
        const prices = await this.fetchFromBinance([symbol]);
        const priceData = prices.get(symbol.toUpperCase());
        
        if (priceData) {
          this.cache.set(symbol, { price: priceData.price, timestamp: Date.now() });
          return priceData.price;
        }
      } catch (binanceError) {
        console.error('Both price sources failed');
      }
    }

    // Return cached value even if expired, or 0
    return cached?.price || 0;
  }

  /**
   * Calculate position value based on entry and current prices
   */
  calculatePositionPnL(
    entryPrice: number,
    currentPrice: number,
    margin: number,
    leverage: number,
    isLong: boolean
  ): { pnl: number; pnlPercent: number; currentValue: number } {
    const priceChange = isLong 
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;
    
    const pnlPercent = priceChange * leverage * 100;
    const pnl = margin * priceChange * leverage;
    const currentValue = margin + pnl;

    return {
      pnl,
      pnlPercent,
      currentValue,
    };
  }

  /**
   * Clear price cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const priceService = new PriceService();
export type { PriceData, BundlePrice };

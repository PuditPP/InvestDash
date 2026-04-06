/**
 * Market Data Service using Finnhub API.
 * This is the professional way to get real-time market data directly in the browser.
 */

const FINNHUB_API_BASE = 'https://finnhub.io/api/v1';
// API Keys from environment variables
const API_TOKEN = import.meta.env.VITE_FINNHUB_API_KEY; 
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface MarketQuote {
  symbol: string;
  price: number;
  priorClose: number;
  name?: string;
}

export interface HistoricalData {
  symbol: string;
  prices: number[];
}

export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  url: string;
  datetime: number;
  source: string;
  image: string;
  aiSummary?: string;
  relatedSymbol?: string;
}

const formatSymbol = (symbol: string): string => {
  return symbol.toUpperCase();
};

export const fetchMarketQuotes = async (symbols: string[]): Promise<MarketQuote[]> => {
  if (symbols.length === 0) return [];

  try {
    const quotePromises = symbols.map(async (symbol) => {
      const { symbol: targetSymbol } = getExchangeSymbol(symbol);
      const url = `${FINNHUB_API_BASE}/quote?symbol=${targetSymbol}&token=${API_TOKEN}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${symbol}`);
      
      const data = await response.json();
      
      // If the specific crypto symbol failed, try the original symbol
      if (data.c === 0 && data.pc === 0 && targetSymbol !== symbol.toUpperCase()) {
        const fallbackUrl = `${FINNHUB_API_BASE}/quote?symbol=${symbol.toUpperCase()}&token=${API_TOKEN}`;
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.c !== 0 || fallbackData.pc !== 0) {
            return {
              symbol: symbol.toUpperCase(),
              price: fallbackData.c,
              priorClose: fallbackData.pc,
            };
          }
        }
        return null;
      }

      if (data.c === 0 && data.pc === 0) return null;
      
      return {
        symbol: symbol.toUpperCase(),
        price: data.c,
        priorClose: data.pc,
      };
    });

    const results = await Promise.all(quotePromises);
    return results.filter((q): q is MarketQuote => q !== null);
  } catch (error) {
    console.error('Finnhub Fetch Error:', error);
    return [];
  }
};

export const fetchSingleQuote = async (symbol: string): Promise<MarketQuote | null> => {
  const quotes = await fetchMarketQuotes([symbol]);
  return quotes.length > 0 ? quotes[0] : null;
};

/**
 * Common crypto mappings for symbols to full names
 */
const COMMON_CRYPTO: Record<string, { name: string; sector: string }> = {
  'BTC': { name: 'Bitcoin', sector: 'Financials' },
  'ETH': { name: 'Ethereum', sector: 'Financials' },
  'SOL': { name: 'Solana', sector: 'Financials' },
  'BNB': { name: 'Binance Coin', sector: 'Financials' },
  'ADA': { name: 'Cardano', sector: 'Financials' },
  'XRP': { name: 'XRP', sector: 'Financials' },
  'DOT': { name: 'Polkadot', sector: 'Financials' },
  'DOGE': { name: 'Dogecoin', sector: 'Financials' },
  'USDT': { name: 'Tether', sector: 'Financials' },
  'USDC': { name: 'USD Coin', sector: 'Financials' },
};

/**
 * Helper to get the best symbol for quotes/candles.
 * Finnhub often needs exchange prefixes for Crypto.
 */
const getExchangeSymbol = (symbol: string): { symbol: string; isCrypto: boolean } => {
  const formatted = symbol.toUpperCase();
  if (COMMON_CRYPTO[formatted]) {
    // For quotes and candles, Finnhub free tier works better with specific crypto symbols
    return { symbol: `BINANCE:${formatted}USDT`, isCrypto: true };
  }
  return { symbol: formatted, isCrypto: false };
};

/**
 * Fetches company profile information (Name, Sector/Industry).
 */
export const fetchCompanyProfile = async (symbol: string) => {
  try {
    const formatted = formatSymbol(symbol);
    
    // Check common crypto first
    if (COMMON_CRYPTO[formatted]) {
      return {
        ...COMMON_CRYPTO[formatted],
        assetType: 'Crypto'
      };
    }

    // Try standard profile fetch
    const profileUrl = `${FINNHUB_API_BASE}/stock/profile2?symbol=${formatted}&token=${API_TOKEN}`;
    const profileResponse = await fetch(profileUrl);
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData && profileData.name) {
        return {
          name: profileData.name,
          sector: profileData.finnhubIndustry || 'Other',
          assetType: profileData.ticker ? 'Stock' : 'ETF' 
        };
      }
    }

    // Fallback: Use Search endpoint for ETFs and other tickers not in profile2
    const searchUrl = `${FINNHUB_API_BASE}/search?q=${formatted}&token=${API_TOKEN}`;
    const searchResponse = await fetch(searchUrl);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const bestMatch = searchData.result?.find((item: any) => 
        item.symbol === formatted || item.displaySymbol === formatted
      );
      
      if (bestMatch) {
        return {
          name: bestMatch.description,
          sector: 'Other', // Search doesn't give sector
          assetType: bestMatch.type === 'ETP' ? 'ETF' : (bestMatch.type === 'Crypto' ? 'Crypto' : 'Stock')
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Finnhub Profile Error (${symbol}):`, error);
    return null;
  }
};

/**
 * Fetches 7 days of historical closing prices for sparkline visualization.
 */
export const fetchHistoricalData = async (symbol: string): Promise<number[]> => {
  try {
    const { symbol: targetSymbol, isCrypto } = getExchangeSymbol(symbol);
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);
    
    // Use /crypto/candle for crypto symbols
    const endpoint = isCrypto ? 'crypto' : 'stock';
    const url = `${FINNHUB_API_BASE}/${endpoint}/candle?symbol=${targetSymbol}&resolution=D&from=${sevenDaysAgo}&to=${now}&token=${API_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch history for ${symbol}`);
    
    const data = await response.json();
    
    if (data.s === 'ok' && data.c && data.c.length > 0) {
      return data.c;
    }
    
    // Fallback for crypto: try original symbol if it was prefixed
    if (isCrypto) {
      const fallbackUrl = `${FINNHUB_API_BASE}/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${sevenDaysAgo}&to=${now}&token=${API_TOKEN}`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.s === 'ok' && fallbackData.c && fallbackData.c.length > 0) {
          return fallbackData.c;
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Finnhub History Error (${symbol}):`, error);
    return [];
  }
};

/**
 * Fetches the latest 3 company news items from Finnhub.
 */
export const fetchCompanyNews = async (symbol: string): Promise<NewsItem[]> => {
  try {
    const formatted = symbol.toUpperCase();
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); 
    const from = fromDate.toISOString().split('T')[0];

    const url = `${FINNHUB_API_BASE}/company-news?symbol=${formatted}&from=${from}&to=${to}&token=${API_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch news for ${symbol}`);
    
    const data = await response.json();
    return (data as any[]).slice(0, 3).map(item => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary,
      url: item.url,
      datetime: item.datetime,
      source: item.source,
      image: item.image
    }));
  } catch (error) {
    console.error(`Finnhub News Error (${symbol}):`, error);
    return [];
  }
};

/**
 * Fetches the latest global market news from Finnhub.
 */
export const fetchGlobalNews = async (): Promise<NewsItem[]> => {
  try {
    const url = `${FINNHUB_API_BASE}/news?category=general&token=${API_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch global news');
    
    const data = await response.json();
    return (data as any[]).map(item => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary,
      url: item.url,
      datetime: item.datetime,
      source: item.source,
      image: item.image
    }));
  } catch (error) {
    console.error('Finnhub Global News Error:', error);
    return [];
  }
};

/**
 * Summarizes news impact using Groq AI (Llama 3).
 * Groq is much faster and more reliable than Hugging Face free tier.
 */
export const summarizeNewsImpact = async (headline: string, content: string): Promise<string> => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a senior financial analyst. Provide a 1-sentence summary of the investment impact of news. Be concise and professional."
          },
          {
            role: "user",
            content: `Analyze this news: Headline: ${headline}. Summary: ${content}. What is the short-term investment impact?`
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      }),
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('Groq API Error:', err);
        return "AI analysis temporarily unavailable.";
    }

    const result = await response.json();
    return result.choices[0]?.message?.content?.trim() || "Neutral market impact expected.";
  } catch (error) {
    console.error('Groq Connection Error:', error);
    return "Unable to generate AI impact summary.";
  }
};

/**
 * Generates a holistic AI analysis of the entire portfolio.
 */
export const analyzePortfolio = async (
  holdings: any[], 
  summary: any, 
  portfolioNews: NewsItem[]
): Promise<string> => {
  try {
    const holdingsContext = holdings.map(h => `${h.symbol} (${h.quantity} shares @ $${h.currentPrice})`).join(', ');
    const newsContext = portfolioNews.slice(0, 10).map(n => `[${n.relatedSymbol}] ${n.headline}`).join('; ');
    
    const prompt = `
      As a Senior Portfolio Strategist, analyze this portfolio:
      - Total Value: $${summary.totalValue.toLocaleString()}
      - Daily Change: ${summary.dailyChangePercentage.toFixed(2)}% ($${summary.dailyChange.toLocaleString()})
      - Holdings: ${holdingsContext}
      - Recent News: ${newsContext}
      
      Provide a professional 2-3 sentence analysis of how these specific global events and news are impacting this unique mix of assets. Focus on actionable risk or opportunity.
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a professional investment analyst. Provide a high-signal, holistic portfolio summary in 2-3 sentences."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.4
      }),
    });

    if (!response.ok) return "Portfolio analysis is currently updating. Please check back shortly.";

    const result = await response.json();
    return result.choices[0]?.message?.content?.trim() || "Portfolio performance is steady within current market parameters.";
  } catch (error) {
    console.error('Portfolio Analysis Error:', error);
    return "Unable to generate holistic portfolio analysis at this time.";
  }
};

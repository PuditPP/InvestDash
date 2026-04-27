/**
 * Market Data Service using Finnhub API.
 * This is the professional way to get real-time market data directly in the browser.
 */

const FINNHUB_API_BASE = 'https://finnhub.io/api/v1';
// API Keys from environment variables
const API_TOKEN = import.meta.env.VITE_FINNHUB_API_KEY; 
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4o';

// For production security: Move keys to a backend/proxy
const PROXY_URL = import.meta.env.VITE_PROXY_URL; 

export const BENCHMARK_SYMBOL = 'SPY'; // S&P 500 ETF

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
const COMMON_CRYPTO: Record<string, { name: string; sector: string; assetType?: string; logo?: string }> = {
  'BTC': { 
    name: 'Bitcoin', 
    sector: 'Crypto', 
    assetType: 'Bitcoin',
    logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
  },
  'ETH': { 
    name: 'Ethereum', 
    sector: 'Crypto', 
    assetType: 'Crypto',
    logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
  },
  'SOL': { 
    name: 'Solana', 
    sector: 'Crypto', 
    assetType: 'Crypto',
    logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
  },
  'BNB': { name: 'Binance Coin', sector: 'Crypto', assetType: 'Crypto' },
  'ADA': { name: 'Cardano', sector: 'Crypto', assetType: 'Crypto' },
  'XRP': { name: 'XRP', sector: 'Crypto', assetType: 'Crypto' },
  'DOT': { name: 'Polkadot', sector: 'Crypto', assetType: 'Crypto' },
  'DOGE': { name: 'Dogecoin', sector: 'Crypto', assetType: 'Crypto' },
  'USDT': { name: 'Tether', sector: 'Crypto', assetType: 'Crypto' },
  'USDC': { name: 'USD Coin', sector: 'Crypto', assetType: 'Crypto' },
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
        assetType: COMMON_CRYPTO[formatted].assetType || 'Crypto'
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
          assetType: profileData.ticker ? 'Stock' : 'ETF',
          logo: profileData.logo 
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
 * Fetches 30 days of historical closing prices for sparkline visualization.
 */
export const fetchHistoricalData = async (symbol: string): Promise<number[]> => {
  try {
    const { symbol: targetSymbol, isCrypto } = getExchangeSymbol(symbol);
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
    
    // Use /crypto/candle for crypto symbols
    const endpoint = isCrypto ? 'crypto' : 'stock';
    const url = `${FINNHUB_API_BASE}/${endpoint}/candle?symbol=${targetSymbol}&resolution=D&from=${thirtyDaysAgo}&to=${now}&token=${API_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch history for ${symbol}`);
    
    const data = await response.json();
    
    if (data.s === 'ok' && data.c && data.c.length > 0) {
      return data.c;
    }
    
    // Fallback for crypto: try original symbol if it was prefixed
    if (isCrypto) {
      const fallbackUrl = `${FINNHUB_API_BASE}/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${thirtyDaysAgo}&to=${now}&token=${API_TOKEN}`;
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

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const callAIProxy = async (action: 'summarize' | 'analyze' | 'ask', payload: any): Promise<any> => {
  let lastError: any = null;

  // 1. Try Proxy first if configured
  if (PROXY_URL) {
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, payload })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!data.error) return data;
        lastError = new Error(data.error.message || 'AI Error via Proxy');
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(`Proxy error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.warn('Proxy request failed (CORS or Network):', err.message);
      lastError = err;
    }
  }

  // 2. Fallback to direct call if proxy failed or was not configured
  // We do this if we have an OPENAI_API_KEY available locally
  if (OPENAI_API_KEY) {
    if (lastError) {
      console.info('Proxy failed, attempting direct OpenAI call as fallback...');
    }

    const getSystemContent = () => {
      if (action === 'summarize') return "You are a senior financial analyst. Provide a 1-sentence summary of the investment impact of news. Be concise and professional.";
      if (action === 'ask') return "You are a professional investment analyst. Answer user questions about their portfolio with high-signal, concise financial insights.";
      return "You are a senior equity analyst at Seeking Alpha. Provide a professional 'Key Takeaways' summary. No intro, no filler, no bolding. Just high-signal financial analysis.";
    };

    const getUserContent = () => {
      if (action === 'summarize') return `Analyze this news: Headline: ${payload.headline}. Summary: ${payload.content}. What is the short-term investment impact?`;
      return payload.prompt;
    };

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: "system", content: getSystemContent() },
            { role: "user", content: getUserContent() }
          ],
          max_tokens: action === 'summarize' ? 150 : 500,
          temperature: 0.4
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }
      
      return await response.json();
    } catch (err: any) {
      console.error('Direct OpenAI call also failed:', err.message);
      throw new Error(`AI Service Unavailable. Proxy: ${lastError?.message || 'N/A'}. Direct: ${err.message}`);
    }
  }

  // If we reach here, both failed or weren't configured
  throw lastError || new Error('AI Service not configured (Missing Proxy URL or OpenAI Key)');
};

export const summarizeNewsImpact = async (headline: string, content: string): Promise<string> => {
  try {
    const result = await callAIProxy('summarize', { headline, content });
    return result.choices[0]?.message?.content?.trim() || "Neutral market impact expected.";
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return "Unable to generate AI impact summary.";
  }
};

export const askPortfolioQuestion = async (
  question: string,
  holdings: any[], 
  summary: any, 
  portfolioNews: NewsItem[]
): Promise<string> => {
  try {
    const holdingsContext = holdings.map(h => `${h.symbol} (${h.quantity} shares @ $${h.currentPrice})`).join(', ');
    const newsContext = portfolioNews.slice(0, 5).map(n => `[${n.relatedSymbol}] ${n.headline}`).join('; ');
    
    const prompt = `
      User Question: "${question}"
      Portfolio Context:
      - Total Value: $${summary.totalValue.toLocaleString()}
      - Daily Change: ${summary.dailyChangePercentage.toFixed(2)}%
      - Holdings: ${holdingsContext}
      - Recent News: ${newsContext}
      As a Senior Portfolio Strategist, answer concisely (under 60 words).
    `;

    const result = await callAIProxy('ask', { prompt });
    return result.choices[0]?.message?.content?.trim() || "I couldn't generate an answer.";
  } catch (error: any) {
    console.error('Portfolio QA Error:', error);
    return `Unable to answer at this time. ${error.message || ''}`;
  }
};

export const analyzePortfolio = async (
  holdings: any[], 
  summary: any, 
  portfolioNews: NewsItem[]
): Promise<string> => {
  try {
    const holdingsContext = holdings.map(h => `${h.symbol} (${h.quantity} shares @ $${h.currentPrice})`).join(', ');
    const newsContext = portfolioNews.slice(0, 10).map(n => `[${n.relatedSymbol}] ${n.headline}`).join('; ');
    
    const prompt = `
      Analyze this portfolio in the style of Seeking Alpha "Key Takeaways". 
      - Value: $${summary.totalValue.toLocaleString()}
      - Daily Change: ${summary.dailyChangePercentage.toFixed(2)}%
      - Assets: ${holdingsContext}
      - News: ${newsContext}
      Provide 3-4 professional bullet points. Plain text only.
    `;

    const result = await callAIProxy('analyze', { prompt });
    return result.choices[0]?.message?.content?.trim() || "Portfolio analysis is currently steady.";
  } catch (error: any) {
    console.error('Portfolio Analysis Error:', error);
    return `Analysis failed: ${error.message || 'Check your internet connection or API keys.'}`;
  }
};

/**
 * Provides a high-quality fallback image for news items that are missing one.
 */
export const getNewsFallbackImage = (symbol?: string, source?: string): string => {
  const stockCharts = [
    'https://images.unsplash.com/photo-1611974714014-416b77943577',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
    'https://images.unsplash.com/photo-1642390237263-1d5139bc8ec4'
  ];
  
  const techImages = [
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085'
  ];

  const cryptoImages = [
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d',
    'https://images.unsplash.com/photo-1621761191319-c6fb620040bc'
  ];

  let baseUrl = stockCharts[0];
  const upperSymbol = symbol?.toUpperCase() || '';
  const upperSource = source?.toUpperCase() || '';

  if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || upperSource.includes('CRYPTO')) {
    baseUrl = cryptoImages[Math.floor(Math.random() * cryptoImages.length)];
  } else if (['AAPL', 'MSFT', 'NVDA', 'GOOG', 'META'].includes(upperSymbol) || upperSource.includes('TECH')) {
    baseUrl = techImages[Math.floor(Math.random() * techImages.length)];
  } else {
    baseUrl = stockCharts[Math.floor(Math.random() * stockCharts.length)];
  }

  return `${baseUrl}?auto=format&fit=crop&w=800&q=80`;
};

export const searchSymbols = async (query: string): Promise<any[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const url = `${FINNHUB_API_BASE}/search?q=${encodeURIComponent(query)}&token=${API_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Search Error:', error);
    return [];
  }
};

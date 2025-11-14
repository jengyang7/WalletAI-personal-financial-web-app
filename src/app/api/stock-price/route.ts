import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // Try Yahoo Finance first (v8 API - more reliable)
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      
      if (price) {
        return NextResponse.json({ 
          symbol, 
          price,
          source: 'yahoo'
        });
      }
    }

    // Fallback to alternative API
    const altUrl = `https://financialmodelingprep.com/api/v3/quote-short/${symbol}?apikey=demo`;
    const altResponse = await fetch(altUrl);
    
    if (altResponse.ok) {
      const altData = await altResponse.json();
      const price = altData?.[0]?.price;
      
      if (price) {
        return NextResponse.json({ 
          symbol, 
          price,
          source: 'fmp'
        });
      }
    }

    return NextResponse.json({ error: 'Could not fetch price' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}







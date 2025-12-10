import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!symbol || !year || !month) {
        return NextResponse.json(
            { error: 'Symbol, year, and month are required' },
            { status: 400 }
        );
    }

    try {
        // Calculate last day of the given month
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        // Format dates for Yahoo Finance API
        // period1 and period2 are Unix timestamps
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);

        // Use Yahoo Finance v8 API for historical data
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

        const response = await fetch(yahooUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch historical data');
        }

        const data = await response.json();
        const result = data?.chart?.result?.[0];

        if (!result) {
            return NextResponse.json(
                { error: 'No data found for this symbol/period' },
                { status: 404 }
            );
        }

        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        if (timestamps.length === 0 || closes.length === 0) {
            // If no data for this month, return null (market might have been closed)
            return NextResponse.json({
                symbol,
                year: yearNum,
                month: monthNum,
                price: null,
                date: null,
                message: 'No trading data for this period'
            });
        }

        // Get the last available close price and its date
        let lastPrice = null;
        let lastDate = null;

        for (let i = closes.length - 1; i >= 0; i--) {
            if (closes[i] !== null) {
                lastPrice = closes[i];
                lastDate = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                break;
            }
        }

        return NextResponse.json({
            symbol,
            year: yearNum,
            month: monthNum,
            price: lastPrice,
            date: lastDate,
            source: 'yahoo'
        });

    } catch (error) {
        console.error('Error fetching historical price:', error);
        return NextResponse.json(
            { error: 'Failed to fetch historical price' },
            { status: 500 }
        );
    }
}

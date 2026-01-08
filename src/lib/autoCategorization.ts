import { CATEGORY_OPTIONS } from '@/constants/categories';

/**
 * Capitalize first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Currency symbol mapping - note: $ will be handled dynamically based on user settings
const currencySymbols: Record<string, string> = {
  'usd': 'USD',
  'dollar': 'USD',
  'dollars': 'USD',
  '€': 'EUR',
  'eur': 'EUR',
  'euro': 'EUR',
  'euros': 'EUR',
  '£': 'GBP',
  'gbp': 'GBP',
  'pound': 'GBP',
  'pounds': 'GBP',
  '¥': 'JPY', // Default for ¥ symbol
  'jpy': 'JPY',
  'yen': 'JPY',
  'cny': 'CNY',
  'yuan': 'CNY',
  'rmb': 'CNY',
  'rm': 'MYR',
  'myr': 'MYR',
  'ringgit': 'MYR',
  's$': 'SGD',
  'sgd': 'SGD',
  'singapore dollar': 'SGD'
};

// Keyword mappings for each category
const categoryKeywords: Record<string, string[]> = {
  'Food & Dining': [
    'lunch', 'dinner', 'breakfast', 'brunch', 'meal', 'eat', 'food', 'restaurant',
    'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'pizza', 'sushi',
    'kfc', 'subway', 'buffet', 'dine', 'dining', 'snack', 'drink', 'beverage',
    'takeout', 'delivery', 'ubereats', 'doordash', 'grubhub', 'foodpanda',
    'bakery', 'dessert', 'ice cream', 'bar', 'pub', 'bistro', 'kitchen',
    'taco', 'chicken', 'beef', 'pork', 'fish', 'noodle', 'rice', 'pasta'
  ],
  'Transportation': [
    'uber', 'lyft', 'taxi', 'cab', 'bus', 'train', 'metro', 'subway',
    'gas', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'car wash',
    'vehicle', 'transport', 'ride', 'grab', 'gojek', 'ola', 'transit',
    'flight', 'airline', 'plane', 'ticket', 'fare', 'mrt', 'lrt'
  ],
  'Groceries': [
    'grocery', 'groceries', 'supermarket', 'market', 'walmart', 'target',
    'costco', 'whole foods', 'trader joe', 'safeway', 'kroger', 'aldi',
    'vegetables', 'fruits', 'meat', 'dairy', 'bread', 'milk', 'eggs',
    'produce', 'fresh', 'organic', 'shopping', 'store', 'tesco', 'carrefour'
  ],
  'Entertainment': [
    'movie', 'cinema', 'theater', 'concert', 'show', 'netflix', 'spotify',
    'hulu', 'disney', 'amazon prime', 'youtube', 'gaming', 'game', 'xbox',
    'playstation', 'nintendo', 'steam', 'entertainment', 'fun', 'amusement',
    'park', 'zoo', 'museum', 'ticket', 'event', 'festival', 'club', 'party'
  ],
  'Shopping': [
    'amazon', 'ebay', 'shop', 'store', 'mall', 'clothing', 'clothes',
    'shoes', 'fashion', 'accessories', 'electronics', 'gadget', 'phone',
    'laptop', 'computer', 'furniture', 'home goods', 'decor', 'ikea',
    'nike', 'adidas', 'zara', 'h&m', 'uniqlo', 'purchase', 'buy', 'bought'
  ],
  'Utilities': [
    'electric', 'electricity', 'water', 'gas', 'internet', 'wifi', 'cable',
    'phone bill', 'utility', 'utilities', 'power', 'energy', 'heating',
    'cooling', 'trash', 'sewage', 'broadband', 'mobile plan', 'data plan'
  ],
  'Healthcare': [
    'doctor', 'hospital', 'clinic', 'medical', 'medicine', 'pharmacy',
    'prescription', 'drug', 'dentist', 'dental', 'health', 'healthcare',
    'insurance', 'therapy', 'treatment', 'checkup', 'exam', 'cvs', 'walgreens',
    'vitamins', 'supplements', 'emergency', 'urgent care', 'surgery'
  ],
  'Housing': [
    'rent', 'mortgage', 'lease', 'apartment', 'house', 'home', 'property',
    'landlord', 'housing', 'hoa', 'condo', 'maintenance', 'repair',
    'plumber', 'electrician', 'contractor', 'renovation', 'remodel'
  ],
  'Personal Care': [
    'haircut', 'salon', 'spa', 'massage', 'beauty', 'cosmetics', 'makeup',
    'skincare', 'shampoo', 'soap', 'toothpaste', 'hygiene', 'grooming',
    'barber', 'nail', 'manicure', 'pedicure', 'gym', 'fitness', 'yoga'
  ],
  'Miscellaneous': [
    'misc', 'other', 'various', 'general', 'stuff', 'things', 'miscellaneous'
  ]
};

/**
 * Categorize expense description using keyword matching
 * Returns null if no match found
 */
export function categorizeByKeywords(description: string): string | null {
  if (!description || typeof description !== 'string') {
    return null;
  }

  const normalizedDesc = description.toLowerCase().trim();

  // Score each category based on keyword matches
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact word match (highest score)
      const wordRegex = new RegExp(`\\b${keywordLower}\\b`, 'i');
      if (wordRegex.test(normalizedDesc)) {
        score += 10;
      }
      // Partial match (lower score)
      else if (normalizedDesc.includes(keywordLower)) {
        score += 5;
      }
    }

    if (score > 0) {
      scores[category] = score;
    }
  }

  // Return category with highest score
  if (Object.keys(scores).length > 0) {
    const bestMatch = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return bestMatch[0];
  }

  return null;
}

/**
 * Extract amount and currency from description
 * Returns {amount, currency, cleanedDescription}
 * Note: $ symbol uses defaultCurrency (e.g., SGD if user is in Singapore)
 */
export function extractAmountAndCurrency(
  description: string,
  defaultCurrency: string = 'USD'
): {
  amount: number | null;
  currency: string;
  cleanedDescription: string;
} {
  let amount: number | null = null;
  let currency: string = defaultCurrency;
  let cleanedDesc = description;

  // Patterns to match:
  // - $30, $30.50, $30.5
  // - 30 dollars, 30 usd, 30usd
  // - RM30, RM 30, 30 RM, 30RM
  // - €30, £30, ¥30
  // - for $30, cost $30, paid $30
  // - S$30 (explicit Singapore Dollar)

  // First try to match S$ specifically (Singapore Dollar)
  const sgdPattern = /S\$\s*(\d+(?:\.\d{1,2})?)/i;
  let match = description.match(sgdPattern);

  if (match) {
    amount = parseFloat(match[1]);
    currency = 'SGD';
    cleanedDesc = description.replace(match[0], '').trim();
  } else {
    // Try to match other currency symbols followed by amount (e.g., $30, RM50, €20)
    const symbolAmountPattern = /([€£¥$]|RM)\s*(\d+(?:\.\d{1,2})?)/i;
    match = description.match(symbolAmountPattern);

    if (match) {
      const symbol = match[1].toLowerCase();
      amount = parseFloat(match[2]);

      // Handle $ symbol: if user's default currency is SGD, treat $ as SGD
      if (symbol === '$') {
        currency = defaultCurrency; // Use user's default currency for $
      } else {
        currency = currencySymbols[symbol] || defaultCurrency;
      }
      // Remove the matched part from description
      cleanedDesc = description.replace(match[0], '').trim();
    } else {
      // Try to match amount followed by currency word (e.g., 30 dollars, 50 myr)
      const amountWordPattern = /(\d+(?:\.\d{1,2})?)\s*(dollars?|usd|euros?|eur|pounds?|gbp|yen|jpy|yuan|cny|rmb|rm|myr|ringgit|sgd)/i;
      match = description.match(amountWordPattern);

      if (match) {
        amount = parseFloat(match[1]);
        const currencyWord = match[2].toLowerCase();
        currency = currencySymbols[currencyWord] || defaultCurrency;
        // Remove the matched part from description
        cleanedDesc = description.replace(match[0], '').trim();
      } else {
        // Try to match just numbers (e.g., "lunch 30" or "30 for lunch")
        const justNumberPattern = /\b(\d+(?:\.\d{1,2})?)\b/;
        match = description.match(justNumberPattern);

        if (match) {
          const potentialAmount = parseFloat(match[1]);
          // Only consider it an amount if it's reasonable (between 0.01 and 999999)
          if (potentialAmount >= 0.01 && potentialAmount <= 999999) {
            amount = potentialAmount;
            currency = defaultCurrency;
            // Remove the matched part
            cleanedDesc = description.replace(match[0], '').trim();
          }
        }
      }
    }
  }

  // Clean up description by removing:
  // 1. Temporal words (this morning, yesterday, last night, etc.)
  // 2. Common prepositions and filler words
  // 3. Action words
  cleanedDesc = cleanedDesc
    // Remove temporal phrases
    .replace(/\b(this morning|this afternoon|this evening|last night|last week|today|yesterday|just now|earlier|recently)\b/gi, '')
    // Remove relative time expressions
    .replace(/\b(\d+\s*)?(days?|weeks?|months?)\s*ago\b/gi, '')
    // Remove day names
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
    // Remove prepositions and filler words
    .replace(/\b(for|at|to|from|in|on|with|the|a|an)\b/gi, '')
    // Remove action words
    .replace(/\b(cost|costs|paid|pay|spent|spend|purchase|purchased|buying|bought|got|getting|had|have)\b/gi, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Apply Title Case formatting
  const toTitleCase = (str: string): string => {
    return str.split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return { amount, currency, cleanedDescription: toTitleCase(cleanedDesc) || capitalizeFirstLetter(cleanedDesc) };
}

/**
 * Parse date from natural language
 * Returns date in YYYY-MM-DD format
 * Supports DD/MM format (e.g., 12/11 = 12th November)
 */
export function parseDate(description: string): string | null {
  const today = new Date();
  const normalizedDesc = description.toLowerCase();

  // Check for "today"
  if (normalizedDesc.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  // Check for "yesterday"
  if (normalizedDesc.includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Check for "last night" (yesterday)
  if (normalizedDesc.includes('last night')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Check for "this morning" or "this afternoon" (today)
  if (normalizedDesc.includes('this morning') || normalizedDesc.includes('this afternoon') || normalizedDesc.includes('this evening')) {
    return today.toISOString().split('T')[0];
  }

  // Check for DD/MM format (e.g., 12/11 = 12th of November)
  // Also supports DD/MM/YY or DD/MM/YYYY
  const ddmmPattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
  const ddmmMatch = description.match(ddmmPattern);
  if (ddmmMatch) {
    const day = parseInt(ddmmMatch[1]);
    const month = parseInt(ddmmMatch[2]);
    let year = today.getFullYear();

    // If year is provided
    if (ddmmMatch[3]) {
      year = parseInt(ddmmMatch[3]);
      // Handle 2-digit year (e.g., 24 -> 2024)
      if (year < 100) {
        year += 2000;
      }
    }

    // Validate day and month
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const parsedDate = new Date(year, month - 1, day);
      // Validate the date is valid (e.g., not 31/02)
      if (parsedDate.getDate() === day && parsedDate.getMonth() === month - 1) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
  }

  // Check for "2 days ago", "3 days ago", etc.
  const daysAgoPattern = /(\d+)\s*days?\s*ago/i;
  const daysAgoMatch = normalizedDesc.match(daysAgoPattern);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1]);
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - daysAgo);
    return pastDate.toISOString().split('T')[0];
  }

  // Check for "last week"
  if (normalizedDesc.includes('last week')) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString().split('T')[0];
  }

  // Check for day of week (e.g., "monday", "last monday")
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < daysOfWeek.length; i++) {
    if (normalizedDesc.includes(daysOfWeek[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysBack = currentDay - targetDay;

      // If the day hasn't occurred yet this week, or if it says "last [day]", go back to previous week
      if (daysBack <= 0 || normalizedDesc.includes('last ' + daysOfWeek[i])) {
        daysBack += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysBack);
      return targetDate.toISOString().split('T')[0];
    }
  }

  return null;
}

/**
 * Auto-categorize expense using Gemini API
 * Extracts amount, description, category, and date from natural language
 */
export async function categorizeWithGemini(
  description: string,
  apiKey: string,
  defaultCurrency: string = 'USD'
): Promise<{
  category: string;
  confidence: 'high' | 'medium' | 'low';
  extractedAmount?: number;
  extractedCurrency?: string;
  extractedDate?: string;
  cleanedDescription?: string;
}> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expense categorization assistant. Analyze this expense description and extract all relevant information.

Description: "${description}"
User's default currency: ${defaultCurrency}

Available categories: ${CATEGORY_OPTIONS.join(', ')}

Respond in JSON format:
{
  "category": "the best matching category from the list",
  "confidence": "high/medium/low",
  "extractedAmount": extract any amount mentioned (number only, or null),
  "extractedCurrency": extract currency code (USD/EUR/GBP/MYR/SGD/etc, or null),
  "extractedDate": extract relative date as YYYY-MM-DD (or null),
  "cleanedDescription": a clean description without amount/currency/date
}

Rules:
- Choose the MOST appropriate category
- extractedAmount: number (e.g., 30 from "$30" or "30 dollars")
- extractedCurrency: 
  - S$ = SGD (Singapore Dollar)
  - RM = MYR (Malaysian Ringgit)
  - $ alone = use ${defaultCurrency} (user's default currency)
  - Explicit currency words like "usd", "sgd", "myr" override the default
- extractedDate: convert dates to YYYY-MM-DD format
  - "today" → ${new Date().toISOString().split('T')[0]}
  - "yesterday" or "last night" → ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
  - "2 days ago" → calculate accordingly
  - DD/MM format (e.g., "12/11" = 12th November ${new Date().getFullYear()})
  - DD/MM/YY format (e.g., "12/11/24" = 12th November 2024)
- cleanedDescription: Extract ONLY the core item, product, service, or merchant name.
  REMOVE all of these:
  * Temporal words: this morning, this afternoon, this evening, today, yesterday, last night, last week, ago, now, just now, earlier, recently
  * Prepositions/filler: for, at, to, from, in, on, with, the, a, an
  * Action words: cost, costs, paid, pay, spent, spend, purchase, purchased, buying, bought, got, getting, had, have
  * Amounts and currency: any numbers, $, RM, S$, €, £, ¥, etc.
  * Date references: any dates, day names, DD/MM formats
  
  The result should be a SHORT, CLEAN description (1-4 words max), properly capitalized (Title Case).
  If there's a brand/merchant name, prioritize that.

Examples:
Input: "coffee this morning for $10"
Output: {
  "category": "Food & Dining",
  "confidence": "high",
  "extractedAmount": 10,
  "extractedCurrency": "${defaultCurrency}",
  "extractedDate": "${new Date().toISOString().split('T')[0]}",
  "cleanedDescription": "Coffee"
}

Input: "starbucks coffee this morning $8"
Output: {
  "category": "Food & Dining",
  "confidence": "high",
  "extractedAmount": 8,
  "extractedCurrency": "${defaultCurrency}",
  "extractedDate": "${new Date().toISOString().split('T')[0]}",
  "cleanedDescription": "Starbucks Coffee"
}

Input: "lunch $30 12/11"
Output: {
  "category": "Food & Dining",
  "confidence": "high",
  "extractedAmount": 30,
  "extractedCurrency": "${defaultCurrency}",
  "extractedDate": "${new Date().getFullYear()}-11-12",
  "cleanedDescription": "Lunch"
}

Input: "uber to office today RM25"
Output: {
  "category": "Transportation",
  "confidence": "high",
  "extractedAmount": 25,
  "extractedCurrency": "MYR",
  "extractedDate": "${new Date().toISOString().split('T')[0]}",
  "cleanedDescription": "Uber To Office"
}

Input: "Mouse S$50 yesterday"
Output: {
  "category": "Shopping",
  "confidence": "high",
  "extractedAmount": 50,
  "extractedCurrency": "SGD",
  "extractedDate": "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}",
  "cleanedDescription": "Mouse"
}

Input: "got groceries at walmart for $150 last week"
Output: {
  "category": "Groceries",
  "confidence": "high",
  "extractedAmount": 150,
  "extractedCurrency": "${defaultCurrency}",
  "extractedDate": "${new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]}",
  "cleanedDescription": "Walmart Groceries"
}

Input: "paid electricity bill $80"
Output: {
  "category": "Utilities",
  "confidence": "high",
  "extractedAmount": 80,
  "extractedCurrency": "${defaultCurrency}",
  "extractedDate": null,
  "cleanedDescription": "Electricity Bill"
}

Input: "salary payment $5000"
Output: {
  "category": "Miscellaneous",
  "confidence": "medium",
  "extractedAmount": 5000,
  "extractedCurrency": "${defaultCurrency}",
  "extractedDate": null,
  "cleanedDescription": "Salary Payment"
}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 200,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const data = await response.json();
    const textResponse = data.candidates[0]?.content?.parts[0]?.text;

    if (!textResponse) {
      throw new Error('No response from Gemini');
    }

    const result = JSON.parse(textResponse);

    // Validate category exists in our options
    if (!CATEGORY_OPTIONS.includes(result.category)) {
      result.category = 'Miscellaneous';
      result.confidence = 'low';
    }

    return result;
  } catch (error) {
    console.error('Gemini categorization error:', error);
    // Fallback to Miscellaneous
    return {
      category: 'Miscellaneous',
      confidence: 'low'
    };
  }
}

// Available income sources
const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Gift', 'Bonus', 'Other'];

// Available asset types
const ASSET_TYPES = ['Cash', 'Bank Account', 'Investment', 'E-Wallet', 'Cryptocurrency', 'Real Estate', 'Vehicle', 'Other'];

/**
 * Detect income source using Gemini API
 */
export async function detectIncomeSourceWithGemini(
  description: string
): Promise<{
  source: string;
  confidence: 'high' | 'medium' | 'low';
}> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return { source: 'Other', confidence: 'low' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an income source classification assistant. Analyze this income description and identify the source.

Description: "${description}"

Available sources: ${INCOME_SOURCES.join(', ')}

Respond in JSON format:
{
  "source": "the best matching source from the list",
  "confidence": "high/medium/low"
}

Classification rules:
- Salary: regular employment pay, paycheck, wages, monthly pay
- Freelance: project work, gig work, contract jobs, consulting
- Business: profit from own business, sales revenue, shop income
- Investment: dividends, stock gains, interest, returns
- Rental: rent received, property income, lease payments
- Gift: money received as gift, present, inheritance
- Bonus: work bonus, commission, performance pay
- Other: anything that doesn't fit above`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 100,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API request failed');

    const data = await response.json();
    const textResponse = data.candidates[0]?.content?.parts[0]?.text;
    if (!textResponse) throw new Error('No response from Gemini');

    const result = JSON.parse(textResponse);

    // Validate source exists
    if (!INCOME_SOURCES.includes(result.source)) {
      result.source = 'Other';
      result.confidence = 'low';
    }

    return result;
  } catch (error) {
    console.error('Gemini income source detection error:', error);
    return { source: 'Other', confidence: 'low' };
  }
}

/**
 * Detect asset type using Gemini API
 */
export async function detectAssetTypeWithGemini(
  description: string
): Promise<{
  type: string;
  confidence: 'high' | 'medium' | 'low';
}> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return { type: 'Other', confidence: 'low' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an asset type classification assistant. Analyze this asset description and identify the type.

Description: "${description}"

Available types: ${ASSET_TYPES.join(', ')}

Respond in JSON format:
{
  "type": "the best matching type from the list",
  "confidence": "high/medium/low"
}

Classification rules:
- Cash: physical cash, money in hand
- Bank Account: savings account, checking account, fixed deposit, bank balance
- Investment: stocks, bonds, mutual funds, ETFs, investment portfolio
- E-Wallet: PayPal, Venmo, GrabPay, Touch n Go, digital wallet, Apple Pay
- Cryptocurrency: Bitcoin, Ethereum, crypto assets, BTC, ETH, digital currency
- Real Estate: house, property, land, apartment, condo, real estate
- Vehicle: car, motorcycle, bike, vehicle, automobile
- Other: anything that doesn't fit above`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 100,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API request failed');

    const data = await response.json();
    const textResponse = data.candidates[0]?.content?.parts[0]?.text;
    if (!textResponse) throw new Error('No response from Gemini');

    const result = JSON.parse(textResponse);

    // Validate type exists
    if (!ASSET_TYPES.includes(result.type)) {
      result.type = 'Other';
      result.confidence = 'low';
    }

    return result;
  } catch (error) {
    console.error('Gemini asset type detection error:', error);
    return { type: 'Other', confidence: 'low' };
  }
}

/**
 * Main auto-categorization function
 * Extracts all expense information: category, amount, currency, date
 * Always tries Gemini API first, falls back to keyword parsing if unavailable
 */
export async function autoCategorize(
  description: string,
  defaultCurrency: string = 'USD',
  useGemini: boolean = true
): Promise<{
  category: string;
  method: 'keyword' | 'gemini' | 'default';
  confidence?: 'high' | 'medium' | 'low';
  extractedAmount?: number;
  extractedCurrency?: string;
  extractedDate?: string;
  cleanedDescription?: string;
}> {
  // Try Gemini API first (if enabled)
  if (useGemini) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const geminiResult = await categorizeWithGemini(description, apiKey, defaultCurrency);

        // Use Gemini's complete result
        return {
          ...geminiResult,
          method: 'gemini'
        };
      } catch (error) {
        console.error('Gemini API unavailable, falling back to keyword parsing:', error);
        // Continue to fallback below
      }
    }
  }

  // Fallback: Use local parsing (keyword matching + extraction)
  console.log('Using keyword parsing fallback');

  // Extract amount and currency locally
  const { amount, currency, cleanedDescription } = extractAmountAndCurrency(description, defaultCurrency);

  // Extract date locally
  const extractedDate = parseDate(description);

  // Try keyword matching for category
  const keywordCategory = categorizeByKeywords(cleanedDescription || description);

  if (keywordCategory) {
    return {
      category: keywordCategory,
      method: 'keyword',
      confidence: 'high',
      extractedAmount: amount || undefined,
      extractedCurrency: currency,
      extractedDate: extractedDate || undefined,
      cleanedDescription: cleanedDescription
    };
  }

  return {
    category: 'Miscellaneous',
    method: 'default',
    confidence: 'low',
    extractedAmount: amount || undefined,
    extractedCurrency: currency,
    extractedDate: extractedDate || undefined,
    cleanedDescription: cleanedDescription
  };
}

/**
 * Parsed expense item from multi-expense input
 */
export interface ParsedExpenseItem {
  description: string;
  amount: number | null;
  currency: string;
  date: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Parse multiple expenses from natural language input using Gemini API
 * Examples:
 * - "Coffee $5, lunch $15, grab ride RM12"
 * - "Yesterday I spent $10 on coffee and $30 on dinner"
 * - "3 items: groceries $50, gas $40, movie tickets $25"
 */
export async function parseMultipleExpenses(
  input: string,
  defaultCurrency: string = 'SGD',
  defaultDate?: string // Optional: Date to use when no date is mentioned (e.g., from selected month)
): Promise<{
  expenses: ParsedExpenseItem[];
  method: 'gemini' | 'fallback';
}> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  // Use provided defaultDate or fall back to today
  const effectiveDefaultDate = defaultDate || today;

  // Try Gemini API
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expense parsing assistant. Extract ALL expenses from this input.

Input: "${input}"
User's default currency: ${defaultCurrency}
Today's date: ${today}

Available categories: ${CATEGORY_OPTIONS.join(', ')}

Respond with a JSON array of expenses:
{
  "expenses": [
    {
      "description": "Clean description (Title Case, 1-4 words, merchant/item name only)",
      "amount": number or null,
      "currency": "USD/EUR/GBP/MYR/SGD/JPY/CNY",
      "date": "YYYY-MM-DD format",
      "category": "one of the available categories",
      "confidence": "high/medium/low"
    }
  ]
}

Rules:
1. Extract EVERY separate expense mentioned
2. Look for separators: commas, "and", "also", semicolons, line breaks, numbered lists
3. Currency mapping:
   - $ alone → ${defaultCurrency}
   - S$ → SGD
   - RM → MYR
   - € → EUR
   - £ → GBP
   - ¥ → JPY
4. Date handling:
   - If user explicitly says "today" → ${today}
   - If user explicitly says "yesterday" or "last night" → ${yesterday}
   - Relative dates like "2 days ago" → calculate from today (${today})
   - If NO date is mentioned at all → use ${effectiveDefaultDate}
   - If a single date is mentioned, apply it to all expenses in that input
5. Description: Clean item/merchant name only, no amounts/dates/filler words
6. If input contains only ONE expense, return array with single item

Examples:

Input: "coffee $5, lunch $15"
Output: {"expenses": [
  {"description": "Coffee", "amount": 5, "currency": "${defaultCurrency}", "date": "${effectiveDefaultDate}", "category": "Food & Dining", "confidence": "high"},
  {"description": "Lunch", "amount": 15, "currency": "${defaultCurrency}", "date": "${effectiveDefaultDate}", "category": "Food & Dining", "confidence": "high"}
]}

Input: "yesterday: starbucks RM12, grab to office RM25, groceries RM80"
Output: {"expenses": [
  {"description": "Starbucks", "amount": 12, "currency": "MYR", "date": "${yesterday}", "category": "Food & Dining", "confidence": "high"},
  {"description": "Grab To Office", "amount": 25, "currency": "MYR", "date": "${yesterday}", "category": "Transportation", "confidence": "high"},
  {"description": "Groceries", "amount": 80, "currency": "MYR", "date": "${yesterday}", "category": "Groceries", "confidence": "high"}
]}

Input: "I spent $50 on dinner and $30 on uber"  
Output: {"expenses": [
  {"description": "Dinner", "amount": 50, "currency": "${defaultCurrency}", "date": "${effectiveDefaultDate}", "category": "Food & Dining", "confidence": "high"},
  {"description": "Uber", "amount": 30, "currency": "${defaultCurrency}", "date": "${effectiveDefaultDate}", "category": "Transportation", "confidence": "high"}
]}`
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 0.95,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Gemini API request failed');
      }

      const data = await response.json();
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini');
      }

      // Try to parse JSON, with recovery for truncated responses
      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (parseError) {
        // Attempt to repair truncated JSON
        console.warn('JSON parse failed, attempting repair:', parseError);

        // Try to find and extract valid expenses array from potentially truncated response
        let repairedJson = textResponse;

        // If the response is cut off mid-object in an array, try to close it properly
        // Look for the last complete expense object by finding the last "},"
        const lastCompleteObjectIndex = repairedJson.lastIndexOf('},');
        const lastClosingBrace = repairedJson.lastIndexOf('}');

        if (lastCompleteObjectIndex > 0 && lastCompleteObjectIndex < lastClosingBrace) {
          // There's a partial object at the end, truncate to last complete object
          repairedJson = repairedJson.substring(0, lastCompleteObjectIndex + 1) + ']}';
        } else if (repairedJson.includes('"expenses"') && !repairedJson.trim().endsWith(']}')) {
          // Response started but didn't finish the array - try different repair strategies

          // Strategy 1: If we have at least one complete object, use that
          const firstExpenseStart = repairedJson.indexOf('[');
          if (firstExpenseStart > 0) {
            const objectPattern = /\{[^{}]*"description"[^{}]*"amount"[^{}]*"currency"[^{}]*"date"[^{}]*"category"[^{}]*"confidence"[^{}]*\}/g;
            const matches = repairedJson.match(objectPattern);

            if (matches && matches.length > 0) {
              repairedJson = '{"expenses":[' + matches.join(',') + ']}';
            } else {
              // No complete objects found, throw original error
              throw parseError;
            }
          } else {
            throw parseError;
          }
        }

        try {
          result = JSON.parse(repairedJson);
          console.log('JSON repair successful, recovered', result.expenses?.length || 0, 'expenses');
        } catch {
          // Repair failed, throw original error
          console.error('JSON repair failed');
          throw parseError;
        }
      }

      // Validate and clean up the expenses
      const validExpenses: ParsedExpenseItem[] = (result.expenses || []).map((exp: ParsedExpenseItem) => ({
        description: exp.description || 'Expense',
        amount: typeof exp.amount === 'number' ? exp.amount : null,
        currency: exp.currency || defaultCurrency,
        date: exp.date || effectiveDefaultDate,
        category: CATEGORY_OPTIONS.includes(exp.category) ? exp.category : 'Miscellaneous',
        confidence: exp.confidence || 'medium'
      }));

      return {
        expenses: validExpenses.length > 0 ? validExpenses : [{
          description: input,
          amount: null,
          currency: defaultCurrency,
          date: effectiveDefaultDate,
          category: 'Miscellaneous',
          confidence: 'low'
        }],
        method: 'gemini'
      };

    } catch (error) {
      console.error('Gemini multi-expense parsing error:', error);
      // Fall through to fallback
    }
  }

  // Fallback: Use single expense parsing
  console.log('Using fallback for multi-expense parsing');
  const singleResult = await autoCategorize(input, defaultCurrency, false);

  return {
    expenses: [{
      description: singleResult.cleanedDescription || input,
      amount: singleResult.extractedAmount || null,
      currency: singleResult.extractedCurrency || defaultCurrency,
      date: singleResult.extractedDate || effectiveDefaultDate,
      category: singleResult.category,
      confidence: singleResult.confidence || 'low'
    }],
    method: 'fallback'
  };
}



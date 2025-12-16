import { CATEGORY_OPTIONS } from '@/constants/categories';

/**
 * Capitalize first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Currency symbol mapping
const currencySymbols: Record<string, string> = {
  '$': 'USD',
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
  
  // Try to match currency symbol followed by amount (e.g., $30, RM50, €20)
  const symbolAmountPattern = /([€£¥$]|RM|S\$)\s*(\d+(?:\.\d{1,2})?)/i;
  let match = description.match(symbolAmountPattern);
  
  if (match) {
    const symbol = match[1].toLowerCase();
    amount = parseFloat(match[2]);
    currency = currencySymbols[symbol] || defaultCurrency;
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

  // Clean up common prepositions and filler words around amounts
  cleanedDesc = cleanedDesc
    .replace(/\b(for|cost|costs|paid|pay|spent|spend|purchase|purchased|buying|bought|at)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { amount, currency, cleanedDescription: capitalizeFirstLetter(cleanedDesc) };
}

/**
 * Parse date from natural language
 * Returns date in YYYY-MM-DD format
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
- extractedCurrency: detect from $ (USD), RM (MYR), € (EUR), £ (GBP), S$ (SGD), etc.
- extractedDate: convert relative dates to YYYY-MM-DD format
  - "today" → ${new Date().toISOString().split('T')[0]}
  - "yesterday" or "last night" → ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
  - "2 days ago" → calculate accordingly
- cleanedDescription: remove ALL these words: amount, currency, date, "for", "cost", "costs", "paid", "pay", "spent", "spend", "purchase", "purchased", "buying", "bought", "at"
  Keep ONLY the essential item/service name

Examples:
Input: "i had dinner last night for $30"
Output: {
  "category": "Food & Dining",
  "confidence": "high",
  "extractedAmount": 30,
  "extractedCurrency": "USD",
  "extractedDate": "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}",
  "cleanedDescription": "dinner"
}

Input: "uber to office today RM25"
Output: {
  "category": "Transportation",
  "confidence": "high",
  "extractedAmount": 25,
  "extractedCurrency": "MYR",
  "extractedDate": "${new Date().toISOString().split('T')[0]}",
  "cleanedDescription": "uber to office"
}

Input: "Mouse purchase cost S$50 yesterday"
Output: {
  "category": "Shopping",
  "confidence": "high",
  "extractedAmount": 50,
  "extractedCurrency": "SGD",
  "extractedDate": "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}",
  "cleanedDescription": "mouse"
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

  // Final fallback to Miscellaneous
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

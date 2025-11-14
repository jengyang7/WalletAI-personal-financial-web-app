'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Plus, DollarSign } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  action?: {
    type: 'add_expense' | 'add_budget' | 'add_goal';
    data: any;
  };
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'alert' | 'suggestion' | 'opportunity';
}

const mockSuggestions: Suggestion[] = [
  {
    id: '1',
    title: 'Spending Alert',
    description: "You've spent $320 on dining this month, which is 20% higher than your average. Consider cooking at home to save.",
    type: 'alert'
  },
  {
    id: '2',
    title: 'Smart Categorization',
    description: 'I can help categorize your expenses automatically. Just tell me what you spent money on!',
    type: 'suggestion'
  },
  {
    id: '3',
    title: 'Voice Commands',
    description: 'Try saying: "I spent $15 on lunch today" or "Add $500 budget for groceries"',
    type: 'opportunity'
  }
];

export default function AIAdvisor() {
  const { addExpense, addBudget } = useFinance();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  
  const getUserName = () => {
    if (!user) return 'there';
    return user.user_metadata?.display_name || user.email?.split('@')[0] || 'there';
  };
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello ${getUserName()}! I'm your AI financial assistant. You can tell me about your expenses and I'll help you track them. Try saying something like "I spent $10 on lunch today" or "Add $500 budget for groceries".`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseCommandWithLLM = async (text: string): Promise<{ type: 'add_expense' | 'add_budget' | 'add_goal'; data: any } | null> => {
    try {
      const prompt = `
You are a financial assistant that extracts structured data from natural language. 
Analyze this message and return ONLY a JSON response (no other text):

Message: "${text}"

If this is about spending money/expenses, return:
{
  "type": "add_expense",
  "data": {
    "amount": <number>,
    "description": "<what was purchased>",
    "category": "<Food & Dining|Transportation|Groceries|Entertainment|Shopping|Utilities|Healthcare|Housing|Personal Care|Miscellaneous>"
  }
}

If this is about setting a budget, return:
{
  "type": "add_budget", 
  "data": {
    "amount": <number>,
    "category": "<category name>"
  }
}

If this is NOT about expenses or budgets, return:
{
  "type": null
}

Examples:
"I bought coffee for $5" → {"type": "add_expense", "data": {"amount": 5, "description": "coffee", "category": "Food & Dining"}}
"purchased gas 40 dollars" → {"type": "add_expense", "data": {"amount": 40, "description": "gas", "category": "Transportation"}}
"set 500 budget for food" → {"type": "add_budget", "data": {"amount": 500, "category": "food"}}
`;

      // Using Ollama (local LLM) - you need to install Ollama and pull a model like llama3.2
      // const response = await fetch('http://localhost:11434/api/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     model: 'llama3.2:1b', // Lightweight model
      //     prompt: prompt,
      //     stream: false,
      //     options: {
      //       temperature: 0.1, // Low temperature for consistent parsing
      //       num_predict: 200
      //     }
      //   })
      // });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are a financial data extraction assistant. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error('LLM service unavailable');
      }

      const result = await response.json();
      const parsedResponse = JSON.parse(result.choices[0].message.content.trim());
            
      if (parsedResponse.type === null) {
        return null;
      }

      // Add date for expenses
      if (parsedResponse.type === 'add_expense') {
        parsedResponse.data.date = new Date().toISOString().split('T')[0];
      }

      return parsedResponse;
    } catch (error) {
      console.log('LLM parsing failed, falling back to regex:', error);
      return parseCommandFallback(text);
    }
  };

  // Fallback regex parsing (your original code)
  const parseCommandFallback = (text: string): { type: 'add_expense' | 'add_budget' | 'add_goal'; data: any } | null => {
    const expensePatterns = [
      /(?:i\s+)?(?:spent|paid|bought|purchased|got)\s+(?:\$?(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?|usd))\s+(?:on\s+|for\s+)?(.+?)(?:\s+(?:today|yesterday))?$/i,
      /(.+?)\s+(?:cost|was|for)\s+(?:\$?(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?|usd))$/i,
    ];

    for (const pattern of expensePatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount, description;
        if (match[1] && !match[3]) {
          // Pattern: "spent $20 on lunch"
          amount = parseFloat(match[1] || match[2]);
          description = match[3];
        } else {
          // Pattern: "lunch cost $20"
          description = match[1];
          amount = parseFloat(match[2] || match[3]);
        }
        
        return {
          type: 'add_expense' as const,
          data: {
            amount,
            description: description.trim(),
            category: categorizeExpense(description),
            date: new Date().toISOString().split('T')[0]
          }
        };
      }
    }

    const budgetPatterns = [
      /(?:set|add|create)\s+(?:a\s+)?(?:\$?(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?))\s+budget\s+(?:for\s+)?(.+)/i,
    ];

    for (const pattern of budgetPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          type: 'add_budget' as const,
          data: {
            amount: parseFloat(match[1] || match[2]),
            category: match[3].trim()
          }
        };
      }
    }

    return null;
  };

  const categorizeExpense = (description: string): string => {
    const desc = description.toLowerCase();
    
    if (desc.includes('lunch') || desc.includes('dinner') || desc.includes('restaurant') || desc.includes('food')) {
      return 'Food & Dining';
    }
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('taxi') || desc.includes('transport')) {
      return 'Transportation';
    }
    if (desc.includes('grocery') || desc.includes('groceries') || desc.includes('supermarket')) {
      return 'Groceries';
    }
    if (desc.includes('movie') || desc.includes('game') || desc.includes('entertainment')) {
      return 'Entertainment';
    }
    if (desc.includes('clothes') || desc.includes('clothing') || desc.includes('shirt') || desc.includes('shoes')) {
      return 'Shopping';
    }
    
    return 'Miscellaneous';
  };

  const handleSendMessage = async () => {
    if (message.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date()
      };

      // Add user message immediately
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Show "thinking" message
      const thinkingMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '🤔 Understanding your request...',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, thinkingMessage]);

      try {
        const command = await parseCommandWithLLM(userMessage.text);
        let aiResponse: Message;

      if (command) {
        // Actually add the expense/budget to global state
        if (command.type === 'add_expense') {
          addExpense(command.data);
          aiResponse = {
            id: (Date.now() + 1).toString(),
            text: `✅ Perfect! I've added your expense: $${command.data.amount.toFixed(2)} for "${command.data.description}" under ${command.data.category}. Check the Expenses page to see it!`,
            sender: 'ai',
            timestamp: new Date(),
            action: command
          };
        } else if (command.type === 'add_budget') {
          addBudget(command.data);
          aiResponse = {
            id: (Date.now() + 1).toString(),
            text: `✅ Great! I've set a budget of $${command.data.amount.toFixed(2)} for ${command.data.category}. Check the Budget page to see it!`,
            sender: 'ai',
            timestamp: new Date(),
            action: command
          };
        } else {
          aiResponse = {
            id: (Date.now() + 1).toString(),
            text: "I understand you want to track something, but I need a bit more information. Try saying something like 'I spent $15 on lunch' or 'Add $500 budget for groceries'.",
            sender: 'ai',
            timestamp: new Date()
          };
        }
      } else {
        // General AI responses for non-command messages
        const responses = [
          "I'm here to help with your finances! You can tell me about expenses like 'I spent $20 on gas' or set budgets like 'Add $300 budget for entertainment'.",
          "I can help you track expenses and manage budgets. Try commands like 'I bought coffee for $5' or 'Set $1000 budget for groceries'.",
          "What would you like to do? I can help you add expenses, set budgets, or answer questions about your finances.",
          "I'm your personal finance assistant! Tell me about your spending and I'll help organize it for you."
        ];
        
        aiResponse = {
          id: (Date.now() + 2).toString(),
          text: responses[Math.floor(Math.random() * responses.length)],
          sender: 'ai',
          timestamp: new Date()
        };
      }

      // Replace thinking message with actual response
      setMessages(prev => prev.slice(0, -1).concat(aiResponse));

      } catch (error) {
        console.error('Error processing message:', error);
        const errorResponse: Message = {
          id: (Date.now() + 2).toString(),
          text: "Sorry, I'm having trouble understanding that right now. Please try again or use a simpler format like 'I spent $10 on lunch'.",
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => prev.slice(0, -1).concat(errorResponse));
      }
    }
  };

  return (
    <div className="bg-slate-800 border-l border-slate-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center">
          <Bot className="h-6 w-6 text-blue-400" />
          <h2 className="ml-2 text-lg font-semibold text-white">AI Financial Assistant</h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Tell me about your expenses and I'll help track them!
        </p>
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 border-b border-slate-700">
        <div className="space-y-2">
          {mockSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-slate-900 rounded-lg p-3 border border-slate-700"
            >
              <div className="flex items-start">
                <div className={`
                  p-1 rounded mr-2 mt-0.5
                  ${suggestion.type === 'alert' ? 'bg-red-500/20 text-red-400' : ''}
                  ${suggestion.type === 'suggestion' ? 'bg-blue-500/20 text-blue-400' : ''}
                  ${suggestion.type === 'opportunity' ? 'bg-green-500/20 text-green-400' : ''}
                `}>
                  <Sparkles className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-medium text-white mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[80%] rounded-lg p-3 text-sm
              ${msg.sender === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-900 text-slate-100 border border-slate-700'
              }
            `}>
              {msg.sender === 'ai' && (
                <div className="flex items-center mb-2">
                  <Bot className="h-4 w-4 text-blue-400 mr-2" />
                  <span className="text-xs text-slate-400">AI Assistant</span>
                </div>
              )}
              <p>{msg.text}</p>
              {msg.action && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                  <div className="flex items-center text-green-400">
                    <Plus className="h-3 w-3 mr-1" />
                    Action: {msg.action.type.replace('_', ' ')}
                  </div>
                  {msg.action.type === 'add_expense' && (
                    <div className="text-slate-300 mt-1">
                      Amount: ${msg.action.data.amount}<br/>
                      Category: {msg.action.data.category}
                    </div>
                  )}
                  {msg.action.type === 'add_budget' && (
                    <div className="text-slate-300 mt-1">
                      Budget: ${msg.action.data.amount}<br/>
                      Category: {msg.action.data.category}
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-slate-400 mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Buttons */}
      <div className="p-4 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setMessage("I spent $15 on lunch today")}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-3 rounded-lg transition-colors"
          >
            Add Lunch Expense
          </button>
          <button
            onClick={() => setMessage("Add $500 budget for groceries")}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-3 rounded-lg transition-colors"
          >
            Set Budget
          </button>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Try: 'I spent $10 on lunch today'"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

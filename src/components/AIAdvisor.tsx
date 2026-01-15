'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Content } from '@google/genai';
import { Bot, Send, Sparkles, TrendingUp, Trash2, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { gemini } from '@/lib/gemini';
import ChatChart, { ChatChartData } from '@/components/ChatChart';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  functionCalled?: string | null;
  functionResult?: {
    success?: boolean;
    message?: string;
    chartData?: ChatChartData;
    [key: string]: unknown;
  };
  chartData?: ChatChartData;
}

const quickActions = [
  {
    id: '1',
    title: 'Analyze Spending',
    icon: <TrendingUp className="h-3 w-3 mr-1" />,
    query: 'Show me my spending summary for this month',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: '2',
    title: 'Check Budgets',
    icon: <Sparkles className="h-3 w-3 mr-1" />,
    query: 'How am I doing with my budgets?',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: '3',
    title: 'Recent Expenses',
    icon: <Zap className="h-3 w-3 mr-1" />,
    query: 'What are my biggest expenses this month?',
    color: 'from-amber-500 to-orange-500'
  }
];

interface AIAdvisorProps {
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
}

export default function AIAdvisor({ onClose, onExpand, isExpanded }: AIAdvisorProps = {}) {
  const router = useRouter();
  const { reloadBudgets, reloadExpenses, setAiExpenseToast } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [message, setMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Content[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getUserName = () => {
    if (!user) return 'there';
    return user.user_metadata?.display_name || user.email?.split('@')[0] || 'there';
  };

  // Get user-specific localStorage keys
  const getStorageKey = (key: string) => {
    return user?.id ? `${key}_${user.id}` : key;
  };

  // Load chat history from localStorage when user changes
  useEffect(() => {
    if (!user?.id) return;

    const savedMessages = localStorage.getItem(getStorageKey('ai_chat_history'));
    const savedHistory = localStorage.getItem(getStorageKey('ai_conversation_history'));

    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      // Convert string timestamps back to Date objects and filter out messages without text
      const hydratedMessages = parsedMessages
        .filter((msg: { text?: string }) => msg.text) // Only include messages with text
        .map((msg: { text: string; sender: 'user' | 'ai'; timestamp: string | Date;[key: string]: unknown }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      setMessages(hydratedMessages);
    } else {
      // Initial greeting if no history for this user
      setMessages([
        {
          id: '1',
          text: `Hello ${getUserName()}! 👋 I'm your AI financial assistant powered by Gemini.\n\n**Here's what I can help you with:**\n\n💰 **Spending Analysis** - View your spending patterns and trends\n📊 **Budget Tracking** - Check your budget status and get alerts\n📝 **Expense Management** - Add, update, or review expenses\n🎯 **Financial Goals** - Track progress toward your goals\n💳 **Recent Transactions** - See your latest expenses\n💡 **Smart Insights** - Get personalized financial advice\n\nTry asking: "Show me my spending summary" or "How am I doing with my budgets?"`,
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    }

    if (savedHistory) {
      setConversationHistory(JSON.parse(savedHistory));
    } else {
      setConversationHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      localStorage.setItem(getStorageKey('ai_chat_history'), JSON.stringify(messages));
    }
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, user?.id]);

  // Save conversation history (context) to localStorage
  useEffect(() => {
    if (conversationHistory.length > 0 && user?.id) {
      localStorage.setItem(getStorageKey('ai_conversation_history'), JSON.stringify(conversationHistory));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationHistory, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClearChat = () => {
    setShowClearChatModal(true);
  };

  const confirmClearChat = () => {
    localStorage.removeItem(getStorageKey('ai_chat_history'));
    localStorage.removeItem(getStorageKey('ai_conversation_history'));
    setMessages([{
      id: Date.now().toString(),
      text: `Hello ${getUserName()}! 👋 I'm your AI financial assistant powered by Gemini.\n\n**Here's what I can help you with:**\n\n💰 **Spending Analysis** - View your spending patterns and trends\n📊 **Budget Tracking** - Check your budget status and get alerts\n📝 **Expense Management** - Add, update, or review expenses\n🎯 **Financial Goals** - Track progress toward your goals\n💳 **Recent Transactions** - See your latest expenses\n💡 **Smart Insights** - Get personalized financial advice\n\nTry asking: "Show me my spending summary" or "How am I doing with my budgets?"`,
      sender: 'ai',
      timestamp: new Date()
    }]);
    setConversationHistory([]);
    setShowClearChatModal(false);
  };

  const formatMessage = (text: string) => {
    // Safety check for undefined or null text
    if (!text || typeof text !== 'string') {
      return <span>Loading...</span>;
    }

    // Split by lines to handle list items
    const lines = text.split('\n');

    return lines.map((line, lineIndex) => {
      // Handle list items starting with "* " or "- "
      if (line.trim().match(/^[\*\-]\s/)) {
        const content = line.trim().substring(2);
        return (
          <div key={lineIndex} className="flex items-start ml-2 mb-1">
            <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0"></span>
            <span>{formatText(content)}</span>
          </div>
        );
      }

      // Handle empty lines
      if (!line.trim()) {
        return <div key={lineIndex} className="h-2"></div>;
      }

      // Standard lines
      return (
        <div key={lineIndex} className="mb-1">
          {formatText(line)}
        </div>
      );
    });
  };

  const formatText = (text: string) => {
    // Safety check for undefined or null text
    if (!text || typeof text !== 'string') {
      return <span></span>;
    }

    // First split by double asterisks for bold
    const boldParts = text.split(/(\*\*[^\*]+\*\*)/g);

    return boldParts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`bold-${index}`} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }

      // Then split by single asterisks for italics within non-bold parts
      // We look for *text* that doesn't start or end with another * (to avoid matching inside **)
      const italicParts = part.split(/(\*[^\*]+\*)/g);

      return (
        <span key={`group-${index}`}>
          {italicParts.map((subPart, subIndex) => {
            if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
              return <em key={`italic-${index}-${subIndex}`} className="italic text-white/90">{subPart.slice(1, -1)}</em>;
            }
            return <span key={`text-${index}-${subIndex}`}>{subPart}</span>;
          })}
        </span>
      );
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');
    setIsTyping(true);

    try {
      // Call Gemini with function calling, passing the selected month from UI
      const response = await gemini.chat(currentMessage, user.id, conversationHistory, selectedMonth);

      // Replace conversation history with the full history from Gemini (includes thought signatures)
      if (response.history && Array.isArray(response.history)) {
        setConversationHistory(response.history);
      }

      // Extract chart data from function result if present
      const chartData = response.functionResult?.chartData as ChatChartData | undefined;

      // Create AI response message
      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: response.text || 'I received your message but couldn\'t generate a proper response. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        functionCalled: response.functionCalled,
        functionResult: response.functionResult,
        chartData: chartData
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      // Reload data if functions were called that modify data
      if (response.functionCalled?.includes('create_expense')) {
        await reloadExpenses();
        await reloadBudgets();

        // Get created expenses from function result for toast
        const createdExpenses = response.functionResult?.createdExpenses as Array<{ description: string; amount: number; currency: string; date: string }> | undefined;
        const expenseTotal = response.functionResult?.expenseTotal as number | undefined;
        const earliestDate = response.functionResult?.earliestExpenseDate as string | undefined;

        if (createdExpenses && createdExpenses.length > 0 && earliestDate) {
          // Set toast in context - expenses page will display it
          setAiExpenseToast({
            show: true,
            count: createdExpenses.length,
            total: expenseTotal || 0,
            currency: createdExpenses[0]?.currency || 'USD',
            expenses: createdExpenses.slice(0, 5), // Max 5 for display
            earliestDate: earliestDate
          });

          // Switch to the expense month if different from currently selected
          const expenseMonth = earliestDate.substring(0, 7); // YYYY-MM
          if (selectedMonth !== expenseMonth && selectedMonth !== 'all') {
            setSelectedMonth(expenseMonth);
          }

          // Navigate to expenses page after a brief delay
          setTimeout(() => {
            router.push('/expenses');
          }, 300);
        }
      } else if (response.functionCalled?.includes('delete_expenses')) {
        await reloadExpenses();
        await reloadBudgets();
      } else if (response.functionCalled === 'create_budget') {
        await reloadBudgets();
      }

    } catch (error) {
      console.error('Error processing message:', error);
      setIsTyping(false);
      const errorResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: "Sorry, I'm having trouble connecting to the AI service. Please check your connection or API key.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  return (
    <div className="glass backdrop-blur-[60px] border border-[var(--glass-border)] flex flex-col h-full shadow-2xl relative overflow-hidden transition-all duration-300 rounded-3xl">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--card-bg)] backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] blur-md opacity-50 rounded-full"></div>
              <div className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] p-2.5 rounded-full relative shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--accent-success)] border-2 border-[var(--background)] rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3">
              <h2 className="text-s font-bold text-[var(--text-primary)] tracking-wide whitespace-nowrap">WalletAI Assistant</h2>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">Powered by Gemini</p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleClearChat}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] p-2 rounded-lg transition-all duration-300 liquid-button"
              title="Clear Chat History"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {onExpand && (
              <button
                onClick={onExpand}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] p-2 rounded-lg transition-all duration-300 liquid-button"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] px-2 py-2 rounded-lg transition-all duration-300 liquid-button font-medium text-sm"
                title="Minimize"
              >
                —
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 pb-2 z-10 flex-shrink-0">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {quickActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => setMessage(action.query)}
              className="flex-shrink-0 flex items-center bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] rounded-full px-3 py-1.5 transition-all duration-300 group liquid-button shadow-lg animate-slide-in-right"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${action.color}`}>
                {action.icon}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] whitespace-nowrap ml-1">
                {action.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {/* AI Avatar (Left) */}
            {msg.sender === 'ai' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] flex items-center justify-center shadow-lg mt-1">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}

            {/* Message Bubble */}
            <div className={`
              max-w-3xl rounded-2xl px-4 py-3 text-sm shadow-lg transition-all duration-300
              ${msg.sender === 'user'
                ? 'glass-card text-[var(--text-primary)] rounded-tr-sm'
                : 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] text-white rounded-tl-sm'
              }
            `}>
              <div className={`leading-relaxed ${msg.sender === 'ai' ? 'text-white font-medium' : ''}`}>
                {msg.text ? formatMessage(msg.text) : <span className={msg.sender === 'user' ? 'text-[var(--text-tertiary)]' : 'text-white/70'}>Loading response...</span>}
              </div>
              {/* Render chart if present */}
              {msg.chartData && (
                <ChatChart chartData={msg.chartData} />
              )}
            </div>

            {/* User Avatar (Right) */}
            {msg.sender === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg mt-1">
                <div className="h-4 w-4 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-3 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] flex items-center justify-center shadow-lg mt-1">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="inline-flex glass-card text-[var(--text-primary)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-[var(--card-bg)] backdrop-blur-md border-t border-[var(--glass-border)] z-10 flex-shrink-0">
        <div className="flex items-center space-x-2 group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask WalletAI anything..."
            className="flex-1 glass-card border border-[var(--card-border)] rounded-2xl px-4 py-3.5 text-[var(--text-primary)] text-sm placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all shadow-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isTyping}
            className="flex-shrink-0 p-3 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] hover:scale-105 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg liquid-button"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {/* AI can make mistakes. Verify financial data. */}
          </p>
        </div>
      </div>

      {/* Clear Chat Confirmation Modal - Rendered via portal to center on screen */}
      {showClearChatModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Clear Chat History</h3>
            </div>

            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to clear the chat history? This will remove all messages and start a fresh conversation.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearChatModal(false)}
                className="flex-1 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold border border-[var(--card-border)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
              >
                Clear
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

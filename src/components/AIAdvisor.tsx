'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, TrendingUp, Trash2, MoreHorizontal, Zap } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { useMonth } from '@/context/MonthContext';
import { gemini } from '@/lib/gemini';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  functionCalled?: string | null;
  functionResult?: {
    success?: boolean;
    message?: string;
    [key: string]: unknown;
  };
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

export default function AIAdvisor() {
  const { reloadBudgets } = useFinance();
  const { user } = useAuth();
  const { selectedMonth } = useMonth();
  const [message, setMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; parts: Array<{ text?: string; [key: string]: unknown }> }>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
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
        .map((msg: { text: string; sender: 'user' | 'ai'; timestamp: string | Date; [key: string]: unknown }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      setMessages(hydratedMessages);
    } else {
      // Initial greeting if no history for this user
      setMessages([
        {
          id: '1',
          text: `Hello ${getUserName()}! 👋 I'm your AI financial assistant. \n\nI can help you track expenses, analyze spending, and manage budgets. Try asking: "What did I spend on groceries?"`,
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
    if (confirm('Are you sure you want to clear the chat history?')) {
      localStorage.removeItem(getStorageKey('ai_chat_history'));
      localStorage.removeItem(getStorageKey('ai_conversation_history'));
      setMessages([{
        id: Date.now().toString(),
        text: `Chat cleared! How can I help you, ${getUserName()}?`,
        sender: 'ai',
        timestamp: new Date()
      }]);
      setConversationHistory([]);
    }
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
            <span>{formatBold(content)}</span>
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
          {formatBold(line)}
        </div>
      );
    });
  };

  const formatBold = (text: string) => {
    // Safety check for undefined or null text
    if (!text || typeof text !== 'string') {
      return <span></span>;
    }

    // Split by double asterisks for bold
    const parts = text.split(/(\*\*[^\*]+\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
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

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: currentMessage }] },
        { role: 'model', parts: [{ text: response.text }] }
      ]);

      // Create AI response message
      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: response.text || 'I received your message but couldn\'t generate a proper response. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        functionCalled: response.functionCalled,
        functionResult: response.functionResult
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      // Reload data if functions were called that modify data
      if (response.functionCalled === 'create_expense' || response.functionCalled === 'create_budget') {
        await reloadBudgets();
        // Trigger a page reload to show new data
        setTimeout(() => window.location.reload(), 1500);
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
    <div className="glass backdrop-blur-[60px] border-l border-[var(--glass-border)] flex flex-col h-screen shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--card-bg)] backdrop-blur-sm z-10">
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
              <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">FinAI Assistant</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearChat}
              className="text-[var(--text-secondary)] hover:text-[var(--accent-error)] p-1.5 hover:bg-[var(--sidebar-hover)] rounded-lg transition-all duration-300 liquid-button"
              title="Clear Chat History"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 hover:bg-[var(--sidebar-hover)] rounded-lg transition-all duration-300 liquid-button">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 pb-2 z-10">
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
              flex-1 rounded-2xl px-4 py-3 text-sm shadow-lg transition-all duration-300
              ${msg.sender === 'user'
                ? 'glass-card text-[var(--text-primary)] rounded-tr-sm'
                : 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] text-white rounded-tl-sm'
              }
            `}>
              <div className={`leading-relaxed ${msg.sender === 'ai' ? 'text-white font-medium' : ''}`}>
                {msg.text ? formatMessage(msg.text) : <span className={msg.sender === 'user' ? 'text-[var(--text-tertiary)]' : 'text-white/70'}>Loading response...</span>}
              </div>

              {/* Function Call Result (kept for functionality, styled to match) */}
              {msg.functionCalled && (
                <div className={`mt-3 pt-3 border-t ${msg.sender === 'ai' ? 'border-[var(--text-tertiary)]' : 'border-white/20'}`}>
                  <div className="flex items-center text-[10px] uppercase tracking-wider mb-1 text-white/70">
                    <Zap className="h-3 w-3 mr-1 text-yellow-300" />
                    Action Executed
                  </div>
                  <div className="rounded-md p-2 text-xs font-mono bg-white/10 text-white/80">
                    {msg.functionCalled}
                    {msg.functionResult && (
                      <span className="ml-2 text-white/70">
                        {msg.functionResult.success ? '✓' : '•'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className={`
                text-[10px] mt-1 text-right opacity-60
                ${msg.sender === 'user' ? 'text-white/80' : 'text-[var(--text-tertiary)]'}
              `}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* User Avatar (Right) */}
            {msg.sender === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] flex items-center justify-center shadow-lg mt-1">
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
            <div className="flex-1 glass-card text-[var(--text-primary)] rounded-2xl rounded-tl-sm px-4 py-4 shadow-lg">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-[var(--card-bg)] backdrop-blur-md border-t border-[var(--glass-border)] z-10">
        <div className="flex items-center space-x-2 group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask FinAI anything..."
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
            AI can make mistakes. Verify financial data.
          </p>
        </div>
      </div>
    </div>
  );
}

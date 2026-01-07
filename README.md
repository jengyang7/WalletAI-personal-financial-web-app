
# WalletAI: AI-powered Personal Finance Web App

https://walletai-app.vercel.app/

WalletAI is a smart personal finance tracker that goes beyond simple spreadsheets. It act as a financial advisor, allowing users to interact with their financial data using natural language. Instead of just seeing a list of numbers, users can ask, "How much did I spend on shopping last weekend?" or "How many times have I ordered food delivery for the past 3 months?" and get instant, intelligent responses and charts.

## 📖 High-Level Overview

Managing personal finances often involves tedious manual entry and complex mental math to understand where money is actually going. WalletAI solves this by combining a modern dashboard with a conversational AI interface.

Key Features:

- **AI Conversational Insights**: Chat with your finance data. Ask questions like "Show me my top 10 biggest expenses for the last 6 months" and get an immediate answer.

- **Text to Visual Data**: The AI can generate dynamic charts (bar, line, pie) based on user requirement within the chat interface(e.g. "Visualize my spending trend for the last 6 months").

- **Smart Categorization**: Expenses are automatically categorized and can be semantically searched (e.g., searching for "coffee" finds Starbucks transactions).

- **Multi-Currency Support**: Handles transactions in different currencies and normalizes them to your preferred display currency.

- **Budgeting & Goals**: Set monthly budgets and track savings goals with real-time progress updates.

## 💡 Background
This is a personal project born out of a desire to make financial literacy more accessible.

I built WalletAI because I found existing finance apps either too rigid (requiring strict manual inputs) or too passive (just showing graphs without context). I wanted to explore how Large Language Models (LLMs) could bridge the gap between raw data and actionable advice. By integrating RAG (Retrieval-Augmented Generation), this project allows the AI to "know" my specific financial context, turning a standard ledger into a proactive financial assistant.

## 🛠️ How It's Made
This project utilizes a modern full-stack architecture focusing on performance and type safety.

**Core Stack:**
* **Framework:** [Next.js 15](https://nextjs.org/) (App Router) – for server-side rendering and API routes.
* **Language:** [TypeScript](https://www.typescriptlang.org/) – ensuring code reliability and maintainability.
* **UI/Styling:** [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), and [Lucide React](https://lucide.dev/) for icons.
* **Visualization:** [Recharts](https://recharts.org/) – for rendering the AI-generated financial charts.

**Backend & AI:**
* **Database:** [Supabase](https://supabase.com/) (PostgreSQL) – handles data storage, authentication, and vector embeddings.
* **AI Logic:** [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) – Integration with **Gemini 2.5 Flash**.
* **RAG Implementation:** Uses `gemini-embedding-001` to generate vector embeddings for transaction descriptions, enabling semantic search (e.g., "Starbucks" matches "Coffee").

## 🔜 Future Roadmap


**To-Do / Roadmap:**
* **Unit Tests:** Implement comprehensive test coverage for utility functions.
* **Receipt Scanning:** Add OCR to automatically parse uploaded receipts into expenses.
* **Mobile App:** Develop mobile app for iOS and Android platform.

## 🚀 Cloning & Running the Project

Follow these steps to get WalletAI running locally.

### 1. Prerequisites
* Node.js (v18.17.0 or later recommended for Next.js 15)
* npm or pnpm

### 2. Clone the Repository
```bash
git clone [https://github.com/jengyang7/WalletAI-personal-financial-web-app.git]
cd walletai
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Setup
You need to set up environment variables for Supabase and Google Gemini.
Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

Open `.env.local` and add the following keys:

```env
# Supabase Configuration (Get these from your Supabase Project Settings)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API (Get this from Google AI Studio)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 5. Database Setup (Supabase)
This project requires a specific table structure in Supabase. You will need to create the following tables in your Supabase SQL editor:
* `profiles` / `user_settings`
* `expenses` (must include an `embedding` vector column)
* `budgets`
* `income`
* `holdings`
* `subscriptions`

*(Note: Ensure the `vector` extension is enabled in your Supabase instance for semantic search to work.)*

### 6. Run the Application
Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
```
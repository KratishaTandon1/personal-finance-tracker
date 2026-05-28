# WealthFlow | Smart Personal Finance Tracker

WealthFlow is a sleek, glassmorphic, and high-performance web application designed for students and young professionals to monitor budgets, track incomes/expenses, and gain insights into their spending habits.

It features a dual-persistence layer that automatically syncs with a **Supabase PostgreSQL database** when configured, and falls back seamlessly to **browser LocalStorage** when running offline or in demo mode. Evaluators will get a 100% functional experience out-of-the-box.

---

## 🌟 Features Implemented

### 1. Core Features (Mandatory)
* **Authentication & Authorization**: Secure signup and login screens with password validation. Runs in Secure Cloud mode with Supabase Auth or local sandboxed sessions.
* **Transaction Ledger (CRUD)**: Add, read, update, and delete income and expense records with customizable dates and descriptions.
* **Income & Expense Categorization**: Color-coded categorization (Salary, Investments, Freelance, Food, Rent, Transportation, Leisure, Shopping, Health).
* **Overview Dashboard**:
  - Net balance, total inflow, and total outflow calculation widgets.
  - Interactive, dynamic SVG monthly income vs. expense comparison chart.
  - Interactive SVG expense distribution doughnut chart with dynamic legends.
* **Search & Filters**: Real-time filters by transaction type (income/expense), category, and date-range, paired with direct description keyword search.

### 2. Advanced "Wow-Factor" Features
* **WealthyAI Conversational Advisor**: Ask our client-side AI financial analyst chat assistant for spending breakdowns, budget updates, and customized savings strategies.
* **Financial Wellness Score Gauge (300-850)**: An interactive speedometer dial that calculates a financial health rating based on savings rate, budgets, consistency, and active targets.
* **Interactive Savings Goals Tracker**: Configure long-term targets, contribute capital from your net balance, and review countdowns and funding percentages.
* **Recurring Subscriptions & Bill Planner**: Track recurring bills (utilities, subscriptions, rent) with active countdown calendars and a one-click payment logger.
* **Dynamic Budget Goals**: Category-specific budget tracker. Visual rings/bars that fill up and glow red if a category's expenses exceed its limit.
* **Gamified Achievements Room**: Earn unlockable badges representing positive financial habits (e.g., *Saver Mindset*, *First Step*, *Budget Planner*, *Wealth Builder*, *Budget Master*).
* **Dynamic Currency Switching**: Instantly toggle your entire wallet and dashboard view between USD ($), EUR (€), and INR (₹).
* **Data Backup (Export & Import)**: Download a structured JSON snapshot of your data, or upload a backup file to sync across devices.
* **Automatic LocalStorage Fallback**: If Supabase credentials are not provided or the network is blocked, the application automatically mounts in local demo mode, keeping the app completely interactive.

---

## 🛠️ Tech Stack Used

* **Frontend**: React (Vite) for fast compiling and hot-reloads.
* **Styling**: Modern Custom Vanilla CSS with variables, CSS grid/flexbox layouts, responsive design, and glassmorphism.
* **Database & Auth**: Supabase Client-side SDK (PostgreSQL database).
* **Icons**: Lucide React.
* **Charts**: Pure React SVGs for high-performance responsive renderings.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ is recommended).

### Installation
1. Clone the repository and navigate to the directory:
   ```bash
   cd personal-finance-tracker
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Run the development server locally:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## ☁️ Supabase Cloud Configuration (Optional)

To enable secure cloud sync, follow these quick steps:

1. Create a free account at [Supabase](https://supabase.com/).
2. Create a new project and retrieve your API keys from **Project Settings > API**:
   - `Project API URL`
   - `anon public` key
3. Create a `.env` file in the root of this project and paste your keys:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Open the **SQL Editor** in your Supabase dashboard and run the following script to create your tables:

```sql
-- 1. Create Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  currency text default 'USD'::text
);

alter table public.profiles enable row level security;
create policy "Users can view their own profile." on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- 2. Create Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric not null check (amount > 0),
  date date default current_date not null,
  description text,
  created_at timestamp with time zone default now() not null
);

alter table public.transactions enable row level security;
create policy "Users can manage their own transactions." on public.transactions for all using (auth.uid() = user_id);

-- 3. Create Budgets Table
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  limit_amount numeric not null check (limit_amount >= 0),
  period text default 'monthly'::text,
  unique (user_id, category)
);

alter table public.budgets enable row level security;
create policy "Users can manage their own budgets." on public.budgets for all using (auth.uid() = user_id);

-- 4. Create Goals Table
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric default 0 not null check (current_amount >= 0),
  category text not null,
  target_date date not null,
  created_at timestamp with time zone default now() not null
);

alter table public.goals enable row level security;
create policy "Users can manage their own goals." on public.goals for all using (auth.uid() = user_id);

-- 5. Create Subscriptions Table
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount numeric not null check (amount > 0),
  category text not null,
  billing_date integer not null check (billing_date >= 1 and billing_date <= 31),
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

alter table public.subscriptions enable row level security;
create policy "Users can manage their own subscriptions." on public.subscriptions for all using (auth.uid() = user_id);
```

---

## 📦 Deployment Instructions

This application is ready to deploy on **Vercel** or **Netlify**:
1. Push your code to a public GitHub repository.
2. Connect the repository to your Vercel/Netlify dashboard.
3. Configure your Environment Variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the deployment settings if using Cloud Mode.
4. Deploy!

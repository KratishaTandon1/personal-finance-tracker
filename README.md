# WealthFlow | Premium Personal Finance Tracker & Wealth Suite

WealthFlow is a sleek, modern, glassmorphic, and high-performance financial intelligence web application designed to help users track transactions, manage category budgets, scan receipts, model debt payoff strategies, plan currency exchanges, and forecast retirement targets.

It features a **dual-persistence engine** that automatically syncs with a **Supabase PostgreSQL database** when configured, and falls back to a **fully functional local sandboxed state** (via browser `LocalStorage`) if offline or unconfigured.

---

## 🌟 Key Application Features

### 1. Unified Overview Dashboard
* **Dynamic Analytics**: Live calculations of Net Balance, Total Inflow, and Total Outflow.
* **Interactive SVG Charts**: 
  * **Income vs. Expense**: Fully responsive side-by-side SVG comparisons.
  * **Expense Breakdown**: Visual SVG doughnut chart with interactive legends.
  * **Predictive 3-Month Trendline**: Renders a dotted future forecasting curve based on historical monthly averages.
* **Financial Runway Tracker**: Automatically calculates exactly how many months your current net balance will last based on your historical cash burn rate.
* **Speedometer Wellness Score (300-850)**: A styled gauge dashboard that rates your financial health in real-time based on savings rates, budget discipline, and goals consistency.

### 2. OCR Receipt Scanner (Tesseract.js)
* **One-Click Auto-Fill**: Scan paper receipts or digital invoice images using the embedded **Tesseract OCR engine**. It automatically extracts date details, payment categories, and purchase amounts, pre-populating your new ledger modals.

### 3. Category Budgets & Alert System
* **Smart Alert Rings**: Set monthly spending limits for individual categories (Food, Rent, Shopping, Bills, etc.). If you exceed 80% of a budget, the dashboard labels turn yellow. If you exceed 100%, the category progress bar turns neon red and logs a budget breach alert.

### 4. 5-in-1 Wealth Suite Command Center
Accessible directly via the **Wealth Planner** tab:
1. **Compounding Horizons**: Projections up to 30 years with adjustable interest sliders and interactive growth SVGs.
2. **FIRE Milestones (Financial Independence, Retire Early)**: Calculates Standard, Lean, and Fat FIRE targets based on your burn rate, predicting the exact age you can retire early.
3. **Asset Class Rebalancer**: Set target percentages across Stocks, Bonds, Cash, and Crypto, review deviancy guides, and get automated Buy/Sell recommendations alongside historical drawdown logs.
4. **Debt Strategist**: Input active loans, set monthly payoff extra boosters, compare **Snowball vs. Avalanche** amortization speeds, and view interest-saved calendars.
5. **FX Leakage Optimizer**: Model currency conversions (USD, EUR, INR) to compare card fees, wire charges, and Wise transfer costs.

### 5. Resilient Auth & Offline Integration
* **Instant Sandbox Toggle**: A mode-switch button allowing users to instantly swap between Cloud SQL database syncing and Local Cache offline sessions.
* **4.5-Second Fail-Safe**: A startup timeout prevents loading screens from freezing if Supabase connection fails or encounters slow latency. It automatically moves the session into Local Storage mode seamlessly.
* **Data Backup**: Export a JSON file of your entire offline cache, or import a backup to sync assets between different browser installations.

---

## 🛠️ Technology Stack

* **Frontend**: React 19 (Vite)
* **Styling**: Custom CSS variables, responsive design, animations, and glassmorphic layers.
* **Database & Auth**: Supabase JS SDK (Postgres DB)
* **OCR Scanning**: Tesseract.js client parsing.
* **Graphics**: Pure React SVGs (no heavy external chart libraries).

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
   Open `http://localhost:5173` (or the port specified in terminal) in your browser.

---

## ☁️ Supabase Cloud Configuration (Optional)

To enable secure cloud sync, follow these quick steps:

1. Create a free account at [Supabase](https://supabase.com/).
2. Create a new project and retrieve your credentials from **Project Settings > API**:
   * `Project API URL`
   * `anon public` key
3. Create a `.env` file in the root of the project and paste your keys:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Open the **SQL Editor** in your Supabase dashboard, click **New Query**, paste the script below, and click **Run**:

<details>
<summary><b>Click to Expand Database Schema Script</b></summary>

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
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

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
</details>

---

## 🧪 Comprehensive Testing Guide

<details>
<summary><b>1. Testing the Local Sandbox Mode (No Config)</b></summary>

* **Setup**: Ensure the `.env` file does not exist or has empty Supabase values.
* **Sign In/Up**: Visit the app. You will see a `Database: Offline (Local Cache)` warning.
* **Test**: Enter any mock email (e.g. `test@wealthflow.com`) and password. Click Login or Register. You will immediately be authenticated locally.
* **Verify**: Add a few transactions or goals. Refresh the page. Because everything is stored in the browser's `LocalStorage` (sandboxed per email), your items remain saved across sessions.
</details>

<details>
<summary><b>2. Testing the Supabase Cloud Mode</b></summary>

* **Setup**: Follow the **Supabase Cloud Configuration** steps above.
* **Sign In/Up**: Open the page. The warning will read `Database: Connected`.
* **Registration / Verification Email**: Fill in the registration form. On success, the app displays a confirmation panel reminding you to verify your email.
* **Verification Check**: Open your inbox, click the confirmation link sent by Supabase. You will automatically be logged in and can access the central dashboard.
</details>

<details>
<summary><b>3. Testing the OCR Receipt Scanner</b></summary>

* **Action**: Click **New Entry** (or the floating `+` button) to open the transaction dialog.
* **Scan**: Click **Scan Receipt** at the top right of the modal.
* **Upload**: Choose any invoice or receipt image (JPG, PNG). Tesseract will initialize, show a loader, and extract transaction contents.
* **Verify**: The form fields (`Amount`, `Category`, `Date`, and `Description`) will automatically pre-fill with the values parsed from the receipt.
</details>

<details>
<summary><b>4. Testing the 5-in-1 Wealth Command Center</b></summary>

* **Location**: Click **Wealth Planner** in the sidebar.
* **Compounding Horizons**: Drag the slider to 30 years and verify that the compounding interest curve graphs and numerical totals update instantly.
* **FIRE Retirement Calculator**: Adjust the monthly contribution sliders. Verify that standard vs fat FIRE milestones calculate target figures based on your average transaction expense history.
* **Asset Class Allocator**: Add holdings, change target allocation percentages (e.g., Stocks: 60%, Cash: 40%). Renders target vs. actual SVG doughnut charts and highlights deviation alerts.
* **Debt Payoff strategizer**: Add 2-3 debts (e.g. Credit Card 1: $1200 at 22%, Loan 2: $4000 at 6%). Toggle between **Avalanche** (highest rate first) and **Snowball** (lowest balance first). Check payoff dates.
* **FX Leakage Analyzer**: Input a transaction amount and look at Wise transfer costs compared to Bank Wires.
</details>

<details>
<summary><b>5. Testing Backups & Portability</b></summary>

* **Export**: Head to the **Transactions** ledger tab. Click **Export Backup (JSON)**. It downloads a snapshot files formatted as `finance_backup_[Date].json`.
* **Import**: Delete a transaction or switch browser sessions. Click **Import Backup (JSON)**, select the file, and confirm. All records (including goals, subscriptions, and category budgets) restore instantly.
</details>

---

## 📦 Deployment Instructions

This project is configured for one-click deployments on platforms like **Render**, **Vercel**, or **Netlify**:
1. Push this project to your GitHub repository.
2. In your deployment dashboard (e.g., Render Web Services or Vercel static sites), set the following:
   * **Build Command**: `npm run build`
   * **Publish Directory**: `dist`
3. Add Environment Variables: If using Supabase Cloud, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.
4. Deploy!

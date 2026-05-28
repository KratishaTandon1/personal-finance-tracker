import React, { useState } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  PieChart, 
  Target, 
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Shield
} from 'lucide-react';

export const Dashboard = ({ onNavigate }) => {
  const { 
    transactions, 
    budgets, 
    currency, 
    aiTips, 
    achievements, 
    updateBudget,
    getWellnessScore
  } = useFinance();

  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'budgets' | 'achievements'
  
  // Quick Add Budget state
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetCat, setBudgetCat] = useState('food');
  const [budgetAmount, setBudgetAmount] = useState('');

  // 1. Currency formatting helper
  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 2. Compute Totals
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // 3. Financial Wellness Score Calculations
  const score = getWellnessScore();
  const scorePct = (score - 300) / 550;
  const scoreCirc = 2 * Math.PI * 26; // 163.3
  const scoreOffset = scoreCirc - (scorePct * scoreCirc);
  
  let scoreLabel = 'Fair';
  let scoreColor = '#F59E0B'; // Amber
  if (score >= 750) { scoreLabel = 'Excellent'; scoreColor = '#10B981'; }
  else if (score >= 650) { scoreLabel = 'Good'; scoreColor = '#06B6D4'; }
  else if (score < 500) { scoreLabel = 'Needs Work'; scoreColor = '#EF4444'; }

  // 4. Category distribution (Expenses)
  const categoryTotals = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const categoryData = Object.keys(categoryTotals).map(cat => {
    const info = CATEGORIES.expense.find(c => c.id === cat) || { name: cat, color: '#6B7280' };
    return {
      id: cat,
      name: info.name,
      amount: categoryTotals[cat],
      color: info.color,
      percentage: totalExpense > 0 ? (categoryTotals[cat] / totalExpense) * 100 : 0
    };
  }).sort((a, b) => b.amount - a.amount);

  // 5. Bar Chart & Forecasting Projection calculation
  const getMonthlyDataWithForecast = () => {
    const months = [];
    const now = new Date();
    
    // Last 6 actual months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      months.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        label,
        income: 0,
        expense: 0,
        isForecast: false
      });
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const tMonth = tDate.getMonth();
      const tYear = tDate.getFullYear();
      
      const match = months.find(m => m.monthIndex === tMonth && m.year === tYear);
      if (match) {
        if (t.type === 'income') match.income += t.amount;
        if (t.type === 'expense') match.expense += t.amount;
      }
    });

    // Compute average monthly income and expense for projection
    const activeExpenseMonths = months.filter(m => m.expense > 0);
    const avgExpense = activeExpenseMonths.length > 0
      ? activeExpenseMonths.reduce((sum, m) => sum + m.expense, 0) / activeExpenseMonths.length
      : totalExpense / 6 || 100; // default minimum baseline

    const activeIncomeMonths = months.filter(m => m.income > 0);
    const avgIncome = activeIncomeMonths.length > 0
      ? activeIncomeMonths.reduce((sum, m) => sum + m.income, 0) / activeIncomeMonths.length
      : totalIncome / 6 || 150;

    // Append 3 forecasted months
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleString('default', { month: 'short' }) + '*';
      // Simulate simple projection with slight inflation for expense
      months.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        label,
        income: avgIncome,
        expense: avgExpense * (1 + (i * 0.035)), // 3.5% inflation increase per month
        isForecast: true
      });
    }

    return { months, avgExpense };
  };

  const { months: monthlyData, avgExpense } = getMonthlyDataWithForecast();
  const maxMonthlyVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 500);

  // 6. Financial Runway Calculations
  let runwayMonths = 0;
  if (netBalance > 0) {
    if (avgExpense > 0) {
      runwayMonths = netBalance / avgExpense;
    } else {
      runwayMonths = Infinity;
    }
  }

  let runwayStatusLabel = 'No Inflow Surplus';
  let runwayStatusColor = 'var(--color-expense)';
  let runwayStatusDesc = 'Balance is negative or expenses consume all assets.';
  
  if (netBalance > 0) {
    if (runwayMonths >= 6) {
      runwayStatusLabel = 'Excellent Cushion';
      runwayStatusColor = 'var(--color-income)';
      runwayStatusDesc = 'Secure reserve pool. Recommended: invest surplus.';
    } else if (runwayMonths >= 3) {
      runwayStatusLabel = 'Moderate Cushion';
      runwayStatusColor = '#f59e0b';
      runwayStatusDesc = 'Standard reserve buffer. Maintain tight budgeting.';
    } else {
      runwayStatusLabel = 'Critical Buffer';
      runwayStatusColor = 'var(--color-expense)';
      runwayStatusDesc = 'Under 3-month survival. Cut immediate outflows.';
    }
  }

  // 7. SVG Doughnut Chart parameters (Expenses breakdown)
  const radius = 50;
  const strokeWidth = 14;
  const circ = 2 * Math.PI * radius; // ~314.16
  let accumulatedPercent = 0;

  const handleBudgetSubmit = (e) => {
    e.preventDefault();
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) return;
    updateBudget(budgetCat, budgetAmount);
    setBudgetAmount('');
    setShowBudgetForm(false);
  };

  // Compile line points for SVG expense trend path
  const actualPoints = [];
  const forecastPoints = [];
  monthlyData.forEach((data, idx) => {
    const xCenter = 42 + idx * 62;
    const barWidth = 18;
    const expTopX = xCenter + 3 + barWidth / 2;
    const expTopY = 200 - ((data.expense / maxMonthlyVal) * 180);
    
    if (!data.isForecast) {
      actualPoints.push(`${expTopX},${expTopY}`);
      if (idx === 5) {
        forecastPoints.push(`${expTopX},${expTopY}`);
      }
    } else {
      forecastPoints.push(`${expTopX},${expTopY}`);
    }
  });

  const actualPathD = actualPoints.length > 0 ? `M ${actualPoints.join(' L ')}` : '';
  const forecastPathD = forecastPoints.length > 0 ? `M ${forecastPoints.join(' L ')}` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Stat Summary Cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        
        {/* Card 1: Wellness Score Radial Gauge */}
        <div className="stat-card balance" style={{ gridColumn: 'span 1' }}>
          <div className="stat-card-header">
            <span>Wellness Rating</span>
            <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
              <Target size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginY: '6px', paddingY: '4px' }}>
            <div style={{ position: 'relative', width: '58px', height: '58px', flexShrink: 0 }}>
              <svg width="58" height="58" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" fill="transparent" stroke="var(--color-border)" strokeWidth="5" />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="transparent"
                  stroke={scoreColor}
                  strokeWidth="5"
                  strokeDasharray={scoreCirc}
                  strokeDashoffset={scoreOffset}
                  transform="rotate(-90 30 30)"
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', fontWeight: 'bold' }}>
                {score}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: scoreColor }}>{scoreLabel}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Financial Health Score</div>
            </div>
          </div>
          <div className="stat-card-footer">
            Range: 300 to 850
          </div>
        </div>

        {/* Card 2: Financial Runway Indicator */}
        <div className="stat-card balance">
          <div className="stat-card-header">
            <span>Financial Runway</span>
            <div className="stat-card-icon" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
              <Shield size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '700', color: runwayStatusColor }}>
              {runwayMonths === Infinity ? '∞' : runwayMonths.toFixed(1)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Months</span>
          </div>
          <div style={{ fontSize: '11px', color: runwayStatusColor, fontWeight: 'bold', marginTop: '2px' }}>
            {runwayStatusLabel}
          </div>
          <div className="stat-card-footer" style={{ marginTop: '4px', fontSize: '10px', lineHeight: '1.2' }}>
            {runwayStatusDesc}
          </div>
        </div>

        {/* Card 3: Net Balance */}
        <div className="stat-card balance">
          <div className="stat-card-header">
            <span>Net Balance</span>
            <div className="stat-card-icon">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-card-val" style={{ color: netBalance >= 0 ? 'var(--text-primary)' : 'var(--color-expense)', marginTop: '4px' }}>
            {formatMoney(netBalance)}
          </div>
          <div className="stat-card-footer">
            {netBalance >= 0 ? 'Surplus wealth generated' : 'Overdraft risk - check budget'}
          </div>
        </div>

        {/* Card 4: Total Inflow */}
        <div className="stat-card income">
          <div className="stat-card-header">
            <span>Total Inflow</span>
            <div className="stat-card-icon">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="stat-card-val" style={{ color: 'var(--color-income)' }}>
            {formatMoney(totalIncome)}
          </div>
          <div className="stat-card-footer">
            From {incomes.length} revenue sources
          </div>
        </div>

        {/* Card 5: Total Outflow */}
        <div className="stat-card expense">
          <div className="stat-card-header">
            <span>Total Outflow</span>
            <div className="stat-card-icon">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="stat-card-val" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(totalExpense)}
          </div>
          <div className="stat-card-footer">
            Across {expenses.length} payments
          </div>
        </div>

      </div>

      {/* 3. Charts Section */}
      <div className="panels-grid">
        
        {/* Panel Left: Monthly Performance (Bar Chart with Projection Line Overlay) */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <TrendingUp size={18} />
                Financial Forecasting
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>6 Months Actual + 3 Months Predictive Projection</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trend Line: Outflow Curve</span>
          </div>
          
          <div className="chart-container" style={{ height: '300px', paddingBottom: '30px' }}>
            <svg width="100%" height="100%" viewBox="0 0 600 260" preserveAspectRatio="none">
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                const y = 20 + r * 180;
                return (
                  <g key={idx}>
                    <line x1="40" y1={y} x2="580" y2={y} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="32" y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                      {formatMoney(maxMonthlyVal * (1 - r)).split('.')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Draw Bars */}
              {monthlyData.map((data, idx) => {
                const xCenter = 42 + idx * 62;
                const barWidth = 18;
                
                // Income Bar
                const incHeight = (data.income / maxMonthlyVal) * 180;
                const incY = 200 - incHeight;
                
                // Expense Bar
                const expHeight = (data.expense / maxMonthlyVal) * 180;
                const expY = 200 - expHeight;

                return (
                  <g key={idx}>
                    {/* Income Rect */}
                    <rect 
                      x={xCenter - barWidth/2 - 2} 
                      y={incY} 
                      width={barWidth} 
                      height={incHeight > 0 ? incHeight : 2} 
                      rx="3" 
                      fill="url(#incomeGrad)"
                      fillOpacity={data.isForecast ? 0.25 : 0.8}
                      stroke={data.isForecast ? "rgba(16,185,129,0.5)" : "none"}
                      strokeDasharray={data.isForecast ? "2 2" : "none"}
                      style={{ transition: 'all 0.5s ease-out' }}
                    />
                    {/* Expense Rect */}
                    <rect 
                      x={xCenter + barWidth/2 + 2} 
                      y={expY} 
                      width={barWidth} 
                      height={expHeight > 0 ? expHeight : 2} 
                      rx="3" 
                      fill="url(#expenseGrad)"
                      fillOpacity={data.isForecast ? 0.25 : 0.8}
                      stroke={data.isForecast ? "rgba(239,68,68,0.5)" : "none"}
                      strokeDasharray={data.isForecast ? "2 2" : "none"}
                      style={{ transition: 'all 0.5s ease-out' }}
                    />
                    {/* Month Label */}
                    <text x={xCenter + 2} y="225" fill={data.isForecast ? "var(--color-accent)" : "var(--text-secondary)"} fontSize="11" textAnchor="middle" fontWeight="500">
                      {data.label}
                    </text>
                  </g>
                );
              })}

              {/* Dotted/Solid Trend Curve Overlay */}
              {actualPathD && (
                <path 
                  d={actualPathD} 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.45)" 
                  strokeWidth="2.5" 
                />
              )}
              {forecastPathD && (
                <path 
                  d={forecastPathD} 
                  fill="none" 
                  stroke="var(--color-accent)" 
                  strokeWidth="2.5" 
                  strokeDasharray="4 4" 
                />
              )}

              {/* Data points vertices on the curve */}
              {monthlyData.map((data, idx) => {
                const xCenter = 42 + idx * 62;
                const barWidth = 18;
                const expTopX = xCenter + 3 + barWidth / 2;
                const expTopY = 200 - ((data.expense / maxMonthlyVal) * 180);
                
                return (
                  <circle 
                    key={idx} 
                    cx={expTopX} 
                    cy={expTopY} 
                    r="4" 
                    fill={data.isForecast ? "#090d16" : "rgba(255, 255, 255, 0.9)"} 
                    stroke={data.isForecast ? "var(--color-accent)" : "var(--color-expense)"} 
                    strokeWidth="2" 
                  />
                );
              })}
              
              <line x1="40" y1="200" x2="580" y2="200" stroke="var(--color-border)" strokeWidth="1.5" />
            </svg>
            
            {/* Chart Legend */}
            <div style={{ display: 'flex', gap: '16px', position: 'absolute', bottom: '0', right: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-income)', borderRadius: '2px' }}></span>
                Inflow
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-expense)', borderRadius: '2px' }}></span>
                Outflow
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '15px', height: '0', borderTop: '2px dotted var(--color-accent)' }}></span>
                Predictive Outflow Curve (*)
              </div>
            </div>
          </div>
        </div>

        {/* Panel Right: Expense Distribution (Doughnut Chart) */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <PieChart size={18} />
              Category Spend
            </h3>
          </div>
          
          <div className="chart-container" style={{ flexDirection: 'column', height: '300px' }}>
            {totalExpense === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                  <PieChart size={32} style={{ color: 'var(--color-border)' }} />
                </div>
                <span>No expense transactions logged</span>
              </div>
            ) : (
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '16px' }}>
                
                {/* SVG Doughnut */}
                <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}>
                  <svg width="150" height="150" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r={radius} fill="transparent" stroke="var(--color-border)" strokeWidth={strokeWidth} />
                    {categoryData.map((item, idx) => {
                      const pct = item.amount / totalExpense;
                      const strokeLength = pct * circ;
                      const strokeOffset = circ - strokeLength + (accumulatedPercent * circ);
                      accumulatedPercent += pct;

                      return (
                        <circle
                          key={idx}
                          cx="70"
                          cy="70"
                          r={radius}
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                          strokeDashoffset={strokeOffset}
                          transform="rotate(-90 70 70)"
                          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                        />
                      );
                    })}
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Spent</div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>
                      {formatMoney(totalExpense).split('.')[0]}
                    </div>
                  </div>
                </div>

                {/* Categories List (Mini-Legend) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {categoryData.slice(0, 4).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }}></span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontWeight: '600' }}>{item.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                  {categoryData.length > 4 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', cursor: 'pointer' }} onClick={() => onNavigate('transactions')}>
                      +{categoryData.length - 4} more categories <ChevronRight size={10} style={{ display: 'inline' }} />
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Triple Panel: Insights, Category Budgets, Achievements */}
      <div className="panel" style={{ minHeight: '340px' }}>
        <div className="auth-tabs" style={{ marginBottom: '24px', maxWidth: '380px' }}>
          <button 
            type="button" 
            className={`auth-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            <Lightbulb size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            AI Coach ({aiTips.length})
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${activeTab === 'budgets' ? 'active' : ''}`}
            onClick={() => setActiveTab('budgets')}
          >
            <Target size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Budgets ({Object.keys(budgets).length})
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            <Award size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Badges ({achievements.length})
          </button>
        </div>

        {/* TAB 1: COACH INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="coach-container">
            {aiTips.map((tip, idx) => {
              const borderColors = {
                danger: 'var(--color-expense)',
                warning: '#f59e0b',
                success: 'var(--color-income)',
                info: 'var(--color-accent)'
              };
              
              const iconObj = {
                danger: <AlertTriangle size={18} style={{ color: 'var(--color-expense)', flexShrink: 0 }} />,
                warning: <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />,
                success: <CheckCircle2 size={18} style={{ color: 'var(--color-income)', flexShrink: 0 }} />,
                info: <Info size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              };

              return (
                <div key={idx} className={`coach-tip-card ${tip.type}`}>
                  {iconObj[tip.type] || <Info size={18} />}
                  <span>{tip.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: BUDGETS SUMMARY */}
        {activeTab === 'budgets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Set savings thresholds for specific expense categories.</span>
              <button 
                type="button" 
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setShowBudgetForm(!showBudgetForm)}
              >
                {showBudgetForm ? 'Hide Form' : 'Set Budget Limit'}
              </button>
            </div>

            {showBudgetForm && (
              <form onSubmit={handleBudgetSubmit} className="filter-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', margin: 0, padding: '16px' }}>
                <div className="filter-group">
                  <label htmlFor="budgetCat">Category</label>
                  <select 
                    id="budgetCat"
                    className="select-field" 
                    value={budgetCat}
                    onChange={(e) => setBudgetCat(e.target.value)}
                  >
                    {CATEGORIES.expense.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label htmlFor="budgetAmt">Limit Amount</label>
                  <input 
                    id="budgetAmt"
                    type="number" 
                    placeholder="e.g. 500" 
                    className="input-field" 
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 20px', alignSelf: 'flex-end' }}>
                  Save
                </button>
              </form>
            )}

            {Object.keys(budgets).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
                No active category budgets set yet. Click "Set Budget Limit" above to configure.
              </div>
            ) : (
              <div className="budget-list">
                {Object.keys(budgets).map((cat) => {
                  const limit = budgets[cat];
                  const spent = expenses
                    .filter(e => e.category === cat)
                    .reduce((sum, e) => sum + e.amount, 0);
                  
                  const ratio = limit > 0 ? spent / limit : 0;
                  const pct = Math.min(ratio * 100, 100);
                  
                  let fillStatus = 'safe';
                  if (ratio >= 1) fillStatus = 'danger';
                  else if (ratio >= 0.8) fillStatus = 'warning';

                  const info = CATEGORIES.expense.find(c => c.id === cat) || { name: cat, color: '#6B7280' };

                  return (
                    <div key={cat} className="budget-item">
                      <div className="budget-item-header">
                        <span className="budget-cat-name">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: info.color }}></span>
                          {info.name}
                        </span>
                        <span className="budget-cat-values">
                          {spent > limit && (
                            <span style={{ color: 'var(--color-expense)', marginRight: '8px', fontSize: '11px', fontWeight: '600' }}>
                              ⚠️ Exceeded by {formatMoney(spent - limit).split('.')[0]}
                            </span>
                          )}
                          <strong>{formatMoney(spent).split('.')[0]}</strong>{' '}
                          <span className="limit">/ {formatMoney(limit)}</span>
                        </span>
                      </div>
                      <div className="budget-track">
                        <div 
                          className={`budget-fill ${fillStatus}`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACHIEVEMENTS / GAMIFICATION */}
        {activeTab === 'achievements' && (
          <div className="achievements-grid">
            {achievements.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
                Add financial records to begin earning awards!
              </div>
            ) : (
              achievements.map((badge) => (
                <div key={badge.id} className="badge-card">
                  <div className="badge-icon-wrapper" style={{ borderColor: badge.color }}>
                    <Award size={24} style={{ color: badge.color }} />
                  </div>
                  <div className="badge-title">{badge.title}</div>
                  <div className="badge-desc">{badge.desc}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { Send, Bot, User, Loader, Sparkles } from 'lucide-react';

export const WealthyAI = () => {
  const { transactions, budgets, currency, achievements } = useFinance();
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am WealthyAI, your personal financial advisor. I can analyze your transactions, check budget goals, and suggest savings plans. Try asking me:\n\n• 'How can I save more?'\n• 'Analyze my spending'\n• 'Check my budget statuses'",
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Currency helper
  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val).toFixed(2)}`;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input.trim();
    const newUserMsg = { sender: 'user', text: userQuery, time: new Date() };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsThinking(true);

    // Simulate AI thinking delay for realism
    setTimeout(() => {
      const responseText = processQuery(userQuery.toLowerCase());
      setMessages(prev => [...prev, { sender: 'ai', text: responseText, time: new Date() }]);
      setIsThinking(false);
    }, 7500 / 10 + 100); // ~850ms response delay
  };

  // Local Rule Engine matching queries
  const processQuery = (query) => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');
    
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Response 1: Spending Analysis
    if (query.includes('analyze') || query.includes('spend') || query.includes('expense') || query.includes('outflow')) {
      if (expenses.length === 0) {
        return "I don't see any expense transactions logged in your ledger yet. Add some expense logs and I will compute category distributions!";
      }

      const catTotals = {};
      expenses.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
      });

      let response = `Here is your spending analysis. Total Outflow: ${formatMoney(totalExpense)}.\n\n`;
      response += "Category Breakdown:\n";
      
      Object.keys(catTotals).forEach(cat => {
        const info = CATEGORIES.expense.find(c => c.id === cat) || { name: cat };
        const pct = ((catTotals[cat] / totalExpense) * 100).toFixed(0);
        response += `• ${info.name}: ${formatMoney(catTotals[cat])} (${pct}%)\n`;
      });

      // Give specific insights based on highest category
      const topCatKey = Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b);
      const topCatName = CATEGORIES.expense.find(c => c.id === topCatKey)?.name || topCatKey;
      
      if (topCatKey === 'food') {
        response += "\n💡 WealthyAI Insight: Food & Dining is your largest expenditure. Try meal-prepping or skipping delivery twice a week to trim up to 15% off this category.";
      } else if (topCatKey === 'rent') {
        response += "\n💡 WealthyAI Insight: Rent constitutes a large fixed expense. Look into sub-letting or utility cost reductions to offset this fixed charge.";
      } else if (topCatKey === 'leisure') {
        response += "\n💡 WealthyAI Insight: Entertainment spending is currently high. Consider auditing unused subscriptions and adopting a '24-hour rule' before making non-essential purchases.";
      }

      return response;
    }

    // Response 2: Savings Advice
    if (query.includes('save') || query.includes('savings') || query.includes('saving tips')) {
      if (totalIncome === 0) {
        return "To calculate a savings blueprint, please log an income source first. Once logged, I will calculate your savings rate.";
      }

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      
      let response = `Financial Health check:\n`;
      response += `• Monthly Inflow: ${formatMoney(totalIncome)}\n`;
      response += `• Monthly Outflow: ${formatMoney(totalExpense)}\n`;
      response += `• Net Savings: ${formatMoney(netBalance)}\n`;
      response += `• Savings Rate: ${savingsRate.toFixed(0)}%\n\n`;

      if (savingsRate < 10) {
        response += "⚠️ Advice: Your savings rate is below the recommended 20%. Try the 50/30/20 rule: allocate 50% for Needs, 30% for Wants, and route 20% directly to Savings before spending anything.";
      } else if (savingsRate >= 30) {
        response += "🏆 Fantastic! Your savings rate is excellent. Consider investing these surpluses into Index Funds or compounding accounts to maximize wealth growth.";
      } else {
        response += "👍 Solid progress! You are maintaining a healthy reserve. Try setting up an automated micro-transfer of $20/week to build a larger emergency cushion.";
      }

      return response;
    }

    // Response 3: Budget check
    if (query.includes('budget') || query.includes('limit') || query.includes('threshold')) {
      const budgetKeys = Object.keys(budgets);
      if (budgetKeys.length === 0) {
        return "You haven't configured any category budgets yet. Head over to the Dashboard or click the Budgets panel to set spending targets.";
      }

      let response = "Active Budget Health check:\n\n";
      let exceeded = false;

      budgetKeys.forEach(cat => {
        const limit = budgets[cat];
        const spent = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
        const catName = CATEGORIES.expense.find(c => c.id === cat)?.name || cat;

        if (spent > limit) {
          response += `🔴 ${catName}: ${formatMoney(spent)} spent / ${formatMoney(limit)} limit (Exceeded by ${formatMoney(spent - limit)}!)\n`;
          exceeded = true;
        } else if (spent >= limit * 0.8) {
          response += `🟡 ${catName}: ${formatMoney(spent)} spent / ${formatMoney(limit)} limit (Warning: Near threshold!)\n`;
        } else {
          response += `🟢 ${catName}: ${formatMoney(spent)} spent / ${formatMoney(limit)} limit (Safe)\n`;
        }
      });

      if (exceeded) {
        response += "\n💡 WealthyAI Tip: You have breached active category limits. Try locking temporary card access or reviewing transactions under exceeded categories.";
      }

      return response;
    }

    // Response 4: Net worth / Balance
    if (query.includes('balance') || query.includes('net worth') || query.includes('income') || query.includes('inflow')) {
      return `Ledger Summary:\n\n` + 
             `• Total Earned: ${formatMoney(totalIncome)}\n` + 
             `• Total Spent: ${formatMoney(totalExpense)}\n` + 
             `• Net Balance: ${formatMoney(netBalance)}\n\n` +
             `You have logged ${transactions.length} transaction entries.`;
    }

    // Response 5: Achievements / Badges
    if (query.includes('achievement') || query.includes('badge') || query.includes('award')) {
      if (achievements.length === 0) {
        return "You haven't unlocked any financial badges yet. Try logging transactions, setting budgets, and maintaining positive savings to unlock trophies.";
      }

      let response = `You have unlocked ${achievements.length} financial badges:\n\n`;
      achievements.forEach(a => {
        response += `• ⭐ **${a.title}**: ${a.desc}\n`;
      });
      return response;
    }

    // Response 6: Generic Financial Advice fallback (tips library)
    const financialTips = [
      "Rule of 72: Divide 72 by your expected interest rate to calculate how many years it will take to double your investments.",
      "Emergency Fund rule: Aim to accumulate 3 to 6 months of fixed expenses in a liquid high-yield account before starting riskier investments.",
      "Compound Interest is the 8th wonder of the world. Investing small amounts in your 20s yields vastly larger wealth than starting in your 30s.",
      "Avoid lifestyle inflation. When you get a raise, route at least 50% of the increase directly to automated savings/investments.",
      "Rent/Mortgage rule: Ensure your housing costs do not exceed 30% of your gross monthly take-home pay."
    ];

    const randomTip = financialTips[Math.floor(Math.random() * financialTips.length)];
    return `I'm not sure how to answer that specific prompt, but here is a financial coaching suggestion:\n\n"${randomTip}"\n\n*(You can ask me about 'spending analysis', 'budget statuses', or 'saving tips'!)*`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      
      {/* AI Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px var(--color-primary-glow)' }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>WealthyAI Advisor</div>
            <div style={{ fontSize: '11px', color: 'var(--color-income)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-income)', borderRadius: '50%', display: 'inline-block' }}></span>
              Online Ledger Analyzer
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
          <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
          Local Context Engine
        </div>
      </div>

      {/* Chat Messages Log */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, index) => {
          const isAi = msg.sender === 'ai';
          return (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                maxWidth: '80%', 
                alignSelf: isAi ? 'flex-start' : 'flex-end',
                flexDirection: isAi ? 'row' : 'row-reverse' 
              }}
            >
              {/* Avatar */}
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: isAi ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)' : 'rgba(255,255,255,0.08)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  fontSize: '12px'
                }}
              >
                {isAi ? <Bot size={16} /> : <User size={16} />}
              </div>

              {/* Message Bubble */}
              <div 
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: isAi ? '0 var(--radius-md) var(--radius-md) var(--radius-md)' : 'var(--radius-md) 0 var(--radius-md) var(--radius-md)', 
                  backgroundColor: isAi ? 'rgba(255,255,255,0.03)' : 'var(--color-primary-glow)',
                  border: '1px solid',
                  borderColor: isAi ? 'var(--color-border)' : 'rgba(139, 92, 246, 0.2)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line',
                  color: 'var(--text-primary)'
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
              <Bot size={16} />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>WealthyAI is auditing your transactions...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message input Form */}
      <form onSubmit={handleSend} style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.1)', display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Ask AI e.g., 'Analyze spending' or 'Check budgets'..."
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isThinking}
          style={{ flex: 1, paddingY: '10px' }}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isThinking || !input.trim()}
          style={{ width: 'auto', padding: '10px 18px', flexShrink: 0 }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

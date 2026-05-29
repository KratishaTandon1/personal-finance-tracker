import React, { useState } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { CustomSelect } from './CustomSelect';
import { Calendar, Trash2, Zap, Clock, Plus, AlertCircle } from 'lucide-react';

export const Subscriptions = () => {
  const { subscriptions, addSubscription, deleteSubscription, paySubscription, currency } = useFinance();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('utilities');
  const [billingDate, setBillingDate] = useState('1'); // Default to 1st of month

  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val).toFixed(2)}`;
  };

  const handleCreateSub = (e) => {
    e.preventDefault();
    const dayNum = parseInt(billingDate);
    if (!name.trim() || !amount || isNaN(dayNum) || dayNum < 1 || dayNum > 31) return;

    addSubscription(name.trim(), amount, category, dayNum);
    
    setName('');
    setAmount('');
    setBillingDate('1');
    setShowAddForm(false);
  };

  // Calculates how many days until the next occurrence of a billing day of the month
  const getDaysUntilDue = (dueDay) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let targetDate = new Date(currentYear, currentMonth, dueDay);
    
    // If the date has already passed this month, the next occurrence is next month
    if (currentDay > dueDay) {
      targetDate = new Date(currentYear, currentMonth + 1, dueDay);
    }
    
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const isNearDue = (dueDay) => {
    const today = new Date();
    const currentDay = today.getDate();
    
    if (dueDay >= currentDay) {
      return (dueDay - currentDay) <= 3;
    } else {
      // Due next month, check days remaining
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const targetDate = new Date(currentYear, currentMonth + 1, dueDay);
      today.setHours(0,0,0,0);
      targetDate.setHours(0,0,0,0);
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Monitor subscriptions, recurring expenses, and automated billing dates.
        </span>
        <button 
          type="button"
          className="btn-primary" 
          style={{ width: 'auto', padding: '10px 18px', fontSize: '14px' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={16} /> {showAddForm ? 'Hide Form' : 'Add Recurring Bill'}
        </button>
      </div>

      {/* Add Subscription Form */}
      {showAddForm && (
        <form onSubmit={handleCreateSub} className="panel filter-panel" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '16px', margin: 0 }}>
          <div className="filter-group">
            <label htmlFor="subName">Bill Name</label>
            <input 
              id="subName"
              type="text" 
              placeholder="e.g. Netflix, Spotify, Gym, Rent..." 
              className="input-field"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="filter-group">
            <label htmlFor="subAmt">Amount</label>
            <input 
              id="subAmt"
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              className="input-field"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              required 
            />
          </div>
          <div className="filter-group">
            <label htmlFor="subCat">Category</label>
            <CustomSelect 
              id="subCat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORIES.expense.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="subDay">Day of Month (1-31)</label>
            <input 
              id="subDay"
              type="number" 
              min="1" 
              max="31" 
              placeholder="15" 
              className="input-field"
              value={billingDate} 
              onChange={(e) => setBillingDate(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 20px', alignSelf: 'flex-end' }}>
            Add
          </button>
        </form>
      )}

      {/* Grid of Subscriptions */}
      {subscriptions.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Calendar size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.6 }} />
          <h3>No recurring bills configured</h3>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Save your recurring subscriptions above to track due dates and auto-log monthly billing.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {subscriptions.map((sub) => {
            const dueDaysText = getDaysUntilDue(sub.billing_date);
            const isNear = isNearDue(sub.billing_date) || dueDaysText === 'Due today' || dueDaysText === 'Due tomorrow';
            
            const info = CATEGORIES.expense.find(c => c.id === sub.category) || { color: '#9CA3AF', name: sub.category };

            return (
              <div 
                key={sub.id} 
                className="panel" 
                style={{ 
                  padding: '20px', 
                  border: isNear ? '1.5px solid var(--color-expense)' : '1px solid var(--color-border)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  position: 'relative'
                }}
              >
                
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{sub.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: info.color }}></span>
                      {info.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-expense)' }}>
                      {formatMoney(sub.amount)}
                    </span>
                    <button 
                      type="button"
                      className="btn-icon delete" 
                      title="Remove subscription"
                      onClick={() => deleteSubscription(sub.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Due status details */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '12px', 
                    backgroundColor: isNear ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.02)', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: isNear ? 'rgba(239,68,68,0.2)' : 'var(--color-border)',
                    color: isNear ? 'var(--color-expense)' : 'var(--text-secondary)'
                  }}
                >
                  {isNear ? <AlertCircle size={14} style={{ animation: 'pulse-glow 1.5s infinite', borderRadius: '50%' }} /> : <Clock size={14} />}
                  <span style={{ fontWeight: isNear ? '600' : 'normal' }}>
                    {dueDaysText} (Day {sub.billing_date} of month)
                  </span>
                </div>

                {/* Pay & Log button */}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    fontSize: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    borderColor: isNear ? 'var(--color-expense)' : 'var(--color-border)' 
                  }}
                  onClick={() => paySubscription(sub.id)}
                >
                  <Zap size={12} style={{ color: 'var(--color-accent)' }} />
                  Record Payment (Log Expense)
                </button>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

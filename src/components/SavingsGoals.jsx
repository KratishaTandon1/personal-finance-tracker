import React, { useState } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { CustomSelect } from './CustomSelect';
import { Target, Trash2, Calendar, PlusCircle, Plus, Check } from 'lucide-react';

export const SavingsGoals = () => {
  const { goals, addGoal, deleteGoal, contributeToGoal, currency } = useFinance();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('savings');
  const [targetDate, setTargetDate] = useState('');
  const [contributions, setContributions] = useState({}); // { goalId: amount }

  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount || !targetDate) return;
    
    addGoal(title.trim(), targetAmount, category, targetDate);
    
    setTitle('');
    setTargetAmount('');
    setTargetDate('');
    setShowAddForm(false);
  };

  const handleContributeSubmit = (e, goalId) => {
    e.preventDefault();
    const amount = contributions[goalId];
    if (!amount || parseFloat(amount) <= 0) return;

    contributeToGoal(goalId, amount);
    setContributions(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleContributionChange = (goalId, value) => {
    setContributions(prev => ({ ...prev, [goalId]: value }));
  };

  const getDaysRemaining = (dateStr) => {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (isNaN(diffDays)) return 'No target date';
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    return `${diffDays} days left`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Plan for the future by allocating savings targets.
        </span>
        <button 
          type="button"
          className="btn-primary" 
          style={{ width: 'auto', padding: '10px 18px', fontSize: '14px' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={16} /> {showAddForm ? 'Hide Form' : 'New Savings Goal'}
        </button>
      </div>

      {/* Add New Goal Form */}
      {showAddForm && (
        <form onSubmit={handleCreateGoal} className="panel filter-panel" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '16px', margin: 0 }}>
          <div className="filter-group">
            <label htmlFor="goalTitle">Goal Title</label>
            <input 
              id="goalTitle"
              type="text" 
              placeholder="e.g. Dream Car, Emergency Fund..." 
              className="input-field"
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
            />
          </div>
          <div className="filter-group">
            <label htmlFor="goalAmt">Target Amount</label>
            <input 
              id="goalAmt"
              type="number" 
              placeholder="e.g. 5000" 
              className="input-field"
              value={targetAmount} 
              onChange={(e) => setTargetAmount(e.target.value)} 
              required 
            />
          </div>
          <div className="filter-group">
            <label htmlFor="goalCat">Funding Source Tag</label>
            <CustomSelect 
              id="goalCat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'savings', label: 'General Savings' },
                { value: 'investments', label: 'Investments' },
                { value: 'leisure', label: 'Leisure Fund' }
              ]}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="goalDate">Target Date</label>
            <input 
              id="goalDate"
              type="date" 
              className="input-field"
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 20px', alignSelf: 'flex-end' }}>
            Create
          </button>
        </form>
      )}

      {/* Goals Card Grid */}
      {goals.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Target size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.6 }} />
          <h3>No savings goals created</h3>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Set your first savings goal using the button above to begin tracking target milestones.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {goals.map((goal) => {
            const current = goal.current_amount || 0;
            const target = goal.target_amount || 1;
            const ratio = current / target;
            const pct = Math.min(Math.floor(ratio * 100), 100);
            
            const isCompleted = current >= target;
            const daysLeft = getDaysRemaining(goal.target_date);
            const isOverdue = daysLeft === 'Overdue';

            return (
              <div 
                key={goal.id} 
                className="panel" 
                style={{ 
                  padding: '24px', 
                  position: 'relative', 
                  border: isCompleted ? '1.5px solid var(--color-income)' : '1px solid var(--color-border)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px' 
                }}
              >
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: isCompleted ? 'var(--color-income)' : 'var(--text-primary)' }}>
                      {goal.title}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tag: {goal.category}
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="btn-icon delete" 
                    title="Remove goal"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress Meter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600' }}>{pct}% Funded</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{formatMoney(current).split('.')[0]}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>/ {formatMoney(target).split('.')[0]}</span>
                    </span>
                  </div>
                  <div className="budget-track">
                    <div 
                      className={`budget-fill ${isCompleted ? 'safe' : 'warning'}`} 
                      style={{ width: `${pct}%`, background: isCompleted ? 'linear-gradient(90deg, var(--color-income) 0%, #059669 100%)' : 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 100%)' }}
                    ></div>
                  </div>
                </div>

                {/* Date Limit Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isOverdue ? 'var(--color-expense)' : isCompleted ? 'var(--color-income)' : 'var(--text-secondary)' }}>
                  <Calendar size={13} />
                  <span>Target: {goal.target_date} ({daysLeft})</span>
                  {isCompleted && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 'bold', marginLeft: 'auto' }}>
                      <Check size={10} /> Saved!
                    </span>
                  )}
                </div>

                {/* Contribution Inline Form */}
                {!isCompleted && (
                  <form 
                    onSubmit={(e) => handleContributeSubmit(e, goal.id)} 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: '8px', 
                      borderTop: '1px solid var(--color-border)', 
                      paddingTop: '16px' 
                    }}
                  >
                    <input 
                      type="number" 
                      placeholder="Add funds..." 
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      value={contributions[goal.id] || ''}
                      onChange={(e) => handleContributionChange(goal.id, e.target.value)}
                      required
                    />
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ width: 'auto', padding: '8px 14px', fontSize: '13px', display: 'flex', gap: '4px', alignItems: 'center' }}
                    >
                      <PlusCircle size={14} /> Save
                    </button>
                  </form>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { 
  TrendingUp, 
  Flame, 
  PieChart, 
  CreditCard, 
  DollarSign, 
  HelpCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Shield,
  Info
} from 'lucide-react';

const RISK_PRESETS = [
  { id: 'conservative', name: 'Conservative', rate: 4, desc: 'Bonds & Cash (Low risk)', color: '#10b981' },
  { id: 'moderate', name: 'Moderate Balanced', rate: 7, desc: 'Index Funds & Treasuries', color: '#06b6d4' },
  { id: 'aggressive', name: 'Aggressive Growth', rate: 11, desc: 'Global Equities & Tech stocks', color: '#8b5cf6' }
];

export const WealthSuite = () => {
  const { currency, transactions } = useFinance();
  const [activeSubTab, setActiveSubTab] = useState('compounding'); // 'compounding' | 'fire' | 'assets' | 'debts' | 'fx'

  // Format Helper
  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Math.round(val).toLocaleString()}`;
  };

  const getSymbol = () => {
    return currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
  };

  // ==========================================================================
  // TAB 1: COMPOUNDING HORIZONS STATE & LOGIC
  // ==========================================================================
  const [principal, setPrincipal] = useState(10000);
  const [contribution, setContribution] = useState(500);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(30);
  const [activeRisk, setActiveRisk] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const compoundingChartRef = useRef(null);

  const handleRiskClick = (preset) => {
    setActiveRisk(preset.id);
    setRate(preset.rate);
  };

  const compoundingData = useMemo(() => {
    const list = [];
    let balance = principal;
    let totalContributed = principal;
    const monthlyRate = (rate / 100) / 12;

    list.push({ year: 0, contributions: totalContributed, wealth: balance, interest: 0 });

    for (let y = 1; y <= years; y++) {
      for (let m = 1; m <= 12; m++) {
        balance = balance * (1 + monthlyRate) + contribution;
        totalContributed += contribution;
      }
      list.push({
        year: y,
        contributions: totalContributed,
        wealth: balance,
        interest: Math.max(0, balance - totalContributed)
      });
    }
    return list;
  }, [principal, contribution, rate, years]);

  const maxCompoundingVal = useMemo(() => {
    return Math.max(...compoundingData.map(d => d.wealth), 1000);
  }, [compoundingData]);

  // SVG parameters
  const svgW = 500;
  const svgH = 220;
  const padding = { top: 15, right: 15, bottom: 30, left: 65 };

  const compoundingCoords = useMemo(() => {
    const coords = [];
    const len = compoundingData.length;
    if (len === 0) return coords;
    const graphWidth = svgW - padding.left - padding.right;
    const graphHeight = svgH - padding.top - padding.bottom;

    compoundingData.forEach((d, idx) => {
      const x = padding.left + (idx / (len - 1)) * graphWidth;
      const yWealth = padding.top + graphHeight - (d.wealth / maxCompoundingVal) * graphHeight;
      const yContr = padding.top + graphHeight - (d.contributions / maxCompoundingVal) * graphHeight;
      coords.push({ x, yWealth, yContr, data: d });
    });
    return coords;
  }, [compoundingData, maxCompoundingVal]);

  const wealthPath = useMemo(() => {
    if (compoundingCoords.length === 0) return '';
    return compoundingCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yWealth}`).join(' ');
  }, [compoundingCoords]);

  const contrPath = useMemo(() => {
    if (compoundingCoords.length === 0) return '';
    return compoundingCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yContr}`).join(' ');
  }, [compoundingCoords]);

  const wealthAreaPath = useMemo(() => {
    if (compoundingCoords.length === 0) return '';
    const first = compoundingCoords[0];
    const last = compoundingCoords[compoundingCoords.length - 1];
    return `${wealthPath} L ${last.x} ${svgH - padding.bottom} L ${first.x} ${svgH - padding.bottom} Z`;
  }, [compoundingCoords, wealthPath]);

  const handleCompoundingMouseMove = (e) => {
    if (!compoundingChartRef.current || compoundingCoords.length === 0) return;
    const rect = compoundingChartRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const graphWidth = svgW - padding.left - padding.right;
    const relativeX = ((mouseX / rect.width) * svgW) - padding.left;
    const pct = Math.max(0, Math.min(relativeX / graphWidth, 1));
    const index = Math.round(pct * (compoundingData.length - 1));
    setHoveredIndex(index);
    setMousePos({
      x: (mouseX / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  const activeHoverData = hoveredIndex !== null ? compoundingCoords[hoveredIndex] : null;


  // ==========================================================================
  // TAB 2: FIRE RETIREMENT CALCULATOR STATE & LOGIC
  // ==========================================================================
  // Calculate default annual expense from ledger
  const computedAnnualExpense = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    // Find average monthly and scale to year
    if (transactions.length === 0) return 40000;
    const uniqueMonths = new Set(transactions.map(t => t.date.slice(0, 7))).size || 1;
    return Math.round((totalExp / uniqueMonths) * 12) || 40000;
  }, [transactions]);

  // Calculated default net balance
  const computedNetBalance = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return Math.max(0, income - expense);
  }, [transactions]);

  const [fireCurrentAge, setFireCurrentAge] = useState(30);
  const [fireExpenses, setFireExpenses] = useState(computedAnnualExpense);
  const [fireSavings, setFireSavings] = useState(computedNetBalance || 15000);
  const [fireContrib, setFireContrib] = useState(1500);
  const [fireRate, setFireRate] = useState(8);

  // recalculate local sliders if global context shifts initially
  useEffect(() => {
    if (computedAnnualExpense) setFireExpenses(computedAnnualExpense);
    if (computedNetBalance) setFireSavings(computedNetBalance);
  }, [computedAnnualExpense, computedNetBalance]);

  const fireTarget = fireExpenses * 25; // 4% rule
  const leanFireTarget = fireExpenses * 0.75 * 25; // 25% lower expenses
  const fatFireTarget = fireExpenses * 1.5 * 25; // 50% luxury expenses

  const fireProjection = useMemo(() => {
    let balance = fireSavings;
    const rateFactor = fireRate / 100;
    let leanAge = null;
    let standardAge = null;
    let fatAge = null;
    let timeline = [];

    timeline.push({ age: fireCurrentAge, balance });

    for (let y = 1; y <= 60; y++) {
      balance = balance * (1 + rateFactor) + (fireContrib * 12);
      const age = fireCurrentAge + y;
      timeline.push({ age, balance });

      if (balance >= leanFireTarget && !leanAge) leanAge = age;
      if (balance >= fireTarget && !standardAge) standardAge = age;
      if (balance >= fatFireTarget && !fatAge) fatAge = age;
    }

    return { leanAge, standardAge, fatAge, timeline };
  }, [fireCurrentAge, fireExpenses, fireSavings, fireContrib, fireRate, fireTarget, leanFireTarget, fatFireTarget]);


  // ==========================================================================
  // TAB 3: PORTFOLIO ASSET ALLOCATOR STATE & LOGIC
  // ==========================================================================
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('wealth_suite_assets');
    return saved ? JSON.parse(saved) : [
      { id: 'stocks', name: 'US Equities', target: 50, actual: 12000, color: '#8b5cf6' },
      { id: 'bonds', name: 'Global Bonds', target: 25, actual: 4000, color: '#06b6d4' },
      { id: 'crypto', name: 'CryptoAssets', target: 10, actual: 3000, color: '#ec4899' },
      { id: 'cash', name: 'Cash/Money Market', target: 15, actual: 1000, color: '#10b981' }
    ];
  });

  const saveAssets = (newAssets) => {
    setAssets(newAssets);
    localStorage.setItem('wealth_suite_assets', JSON.stringify(newAssets));
  };

  const [newAssetLabel, setNewAssetLabel] = useState('');
  const [newAssetTarget, setNewAssetTarget] = useState('');
  const [newAssetActual, setNewAssetActual] = useState('');

  const totalActualAssetVal = useMemo(() => {
    return assets.reduce((sum, a) => sum + a.actual, 0);
  }, [assets]);

  const totalTargetPct = useMemo(() => {
    return assets.reduce((sum, a) => sum + Number(a.target), 0);
  }, [assets]);

  const rebalancingPlan = useMemo(() => {
    if (totalActualAssetVal === 0) return [];
    return assets.map(asset => {
      const actualPct = (asset.actual / totalActualAssetVal) * 100;
      const targetVal = (asset.target / 100) * totalActualAssetVal;
      const gapVal = targetVal - asset.actual;
      return {
        ...asset,
        actualPct,
        targetVal,
        gapVal,
        action: gapVal > 0 ? 'Buy' : gapVal < 0 ? 'Sell' : 'Hold'
      };
    });
  }, [assets, totalActualAssetVal]);

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!newAssetLabel || !newAssetTarget || !newAssetActual) return;
    const targetVal = parseFloat(newAssetTarget);
    const actualVal = parseFloat(newAssetActual);
    if (isNaN(targetVal) || isNaN(actualVal)) return;

    const colors = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[assets.length % colors.length];

    const newAsset = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAssetLabel.trim(),
      target: targetVal,
      actual: actualVal,
      color
    };

    saveAssets([...assets, newAsset]);
    setNewAssetLabel('');
    setNewAssetTarget('');
    setNewAssetActual('');
  };

  const handleDeleteAsset = (id) => {
    saveAssets(assets.filter(a => a.id !== id));
  };


  // ==========================================================================
  // TAB 4: DEBT SNOWBALL VS. AVALANCHE PLANNER
  // ==========================================================================
  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('wealth_suite_debts');
    return saved ? JSON.parse(saved) : [
      { id: 'card1', name: 'Credit Card debt', balance: 3500, rate: 18.9, minPayment: 100 },
      { id: 'car', name: 'Auto Financing', balance: 14000, rate: 5.5, minPayment: 280 },
      { id: 'student', name: 'College Loans', balance: 22000, rate: 4.5, minPayment: 210 }
    ];
  });

  const saveDebts = (newDebts) => {
    setDebts(newDebts);
    localStorage.setItem('wealth_suite_debts', JSON.stringify(newDebts));
  };

  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtBalance, setNewDebtBalance] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');
  const [extraPayment, setExtraPayment] = useState(250);

  const [debtStrategy, setDebtStrategy] = useState('avalanche'); // 'avalanche' | 'snowball'

  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebtName || !newDebtBalance || !newDebtRate || !newDebtMin) return;
    const balanceVal = parseFloat(newDebtBalance);
    const rateVal = parseFloat(newDebtRate);
    const minVal = parseFloat(newDebtMin);
    if (isNaN(balanceVal) || isNaN(rateVal) || isNaN(minVal)) return;

    const newDebt = {
      id: Math.random().toString(36).substr(2, 9),
      name: newDebtName.trim(),
      balance: balanceVal,
      rate: rateVal,
      minPayment: minVal
    };

    saveDebts([...debts, newDebt]);
    setNewDebtName('');
    setNewDebtBalance('');
    setNewDebtRate('');
    setNewDebtMin('');
  };

  const handleDeleteDebt = (id) => {
    saveDebts(debts.filter(d => d.id !== id));
  };

  // Simulates monthly payoff schedules
  const debtSimResults = useMemo(() => {
    if (debts.length === 0) return null;

    const runSimulation = (strategy) => {
      // Deep clone debt list
      let activeDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
      let totalInterest = 0;
      let month = 0;
      let history = [];

      const totalMinPayments = activeDebts.reduce((sum, d) => sum + d.minPayment, 0);
      let monthlyBudget = totalMinPayments + extraPayment;

      // Limit safety to avoid infinite loops
      while (activeDebts.some(d => d.currentBalance > 0) && month < 360) {
        month++;
        
        // 1. Sort active remaining debts based on chosen payoff strategy
        if (strategy === 'avalanche') {
          // Sort by highest interest rate descending
          activeDebts.sort((a, b) => b.rate - a.rate);
        } else {
          // Sort by lowest remaining balance ascending (Snowball)
          activeDebts.sort((a, b) => a.currentBalance - b.currentBalance);
        }

        let availableExtra = extraPayment;
        let monthlyPaymentsThisMonth = {};

        // 2. Add monthly interest first
        activeDebts.forEach(d => {
          if (d.currentBalance > 0) {
            const interest = d.currentBalance * ((d.rate / 100) / 12);
            totalInterest += interest;
            d.currentBalance += interest;
          }
        });

        // 3. First apply minimum payments to all remaining debts
        activeDebts.forEach(d => {
          if (d.currentBalance > 0) {
            const pay = Math.min(d.currentBalance, d.minPayment);
            d.currentBalance -= pay;
            monthlyPaymentsThisMonth[d.id] = pay;
            // If we paid less than minimum because it reached $0, add difference back to extra booster pool
            if (pay < d.minPayment) {
              availableExtra += (d.minPayment - pay);
            }
          } else {
            // Freed up minimum payment is routed to our extra booster pool
            availableExtra += d.minPayment;
            monthlyPaymentsThisMonth[d.id] = 0;
          }
        });

        // 4. Apply snowball booster to top prioritized debt
        const targetDebt = activeDebts.find(d => d.currentBalance > 0);
        if (targetDebt && availableExtra > 0) {
          const extraPay = Math.min(targetDebt.currentBalance, availableExtra);
          targetDebt.currentBalance -= extraPay;
          monthlyPaymentsThisMonth[targetDebt.id] += extraPay;
        }

        history.push({
          month,
          balances: activeDebts.map(d => ({ id: d.id, name: d.name, balance: d.currentBalance }))
        });
      }

      return { totalInterest, monthsToPayoff: month, history };
    };

    const avalanche = runSimulation('avalanche');
    const snowball = runSimulation('snowball');

    return { avalanche, snowball };
  }, [debts, extraPayment]);


  // ==========================================================================
  // TAB 5: FX LEAKAGE fee optimizer STATE & LOGIC
  // ==========================================================================
  const [fxAmount, setFxAmount] = useState(2500);
  const [fxFrom, setFxFrom] = useState('USD');
  const [fxTo, setFxTo] = useState('EUR');

  const exchangeRates = {
    USD: { EUR: 0.92, INR: 83.25, USD: 1 },
    EUR: { USD: 1.09, INR: 90.50, EUR: 1 },
    INR: { USD: 0.012, EUR: 0.011, INR: 1 }
  };

  const conversionOptions = useMemo(() => {
    const rate = exchangeRates[fxFrom]?.[fxTo] || 1;
    const baseValue = fxAmount * rate;

    // Platform charge profiles
    const options = [
      { id: 'wise', name: 'Wise transfer', rate: 0.005, flat: 2, speed: '1-2 Days' },
      { id: 'wire', name: 'Standard Bank Wire', rate: 0.001, flat: 35, speed: '3-5 Days' },
      { id: 'cc', name: 'Credit/Debit Card (3% fee)', rate: 0.03, flat: 0, speed: 'Instant' },
      { id: 'crypto', name: 'Digital Asset Bridge', rate: 0.012, flat: 1.50, speed: '10 Mins' }
    ];

    return options.map(opt => {
      const fee = (fxAmount * opt.rate) + opt.flat;
      const netReceived = (fxAmount - fee) * rate;
      return {
        ...opt,
        fee,
        netReceived,
        feePct: (fee / fxAmount) * 100
      };
    }).sort((a, b) => a.fee - b.fee);
  }, [fxAmount, fxFrom, fxTo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Navigation header */}
      <div className="auth-tabs" style={{ maxWidth: '650px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)' }}>
        <button 
          type="button" 
          className={`auth-tab-btn ${activeSubTab === 'compounding' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('compounding')}
          style={{ fontSize: '12px', padding: '10px 8px' }}
        >
          <TrendingUp size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Compounding Horizons
        </button>
        <button 
          type="button" 
          className={`auth-tab-btn ${activeSubTab === 'fire' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('fire')}
          style={{ fontSize: '12px', padding: '10px 8px' }}
        >
          <Flame size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          FIRE Milestones
        </button>
        <button 
          type="button" 
          className={`auth-tab-btn ${activeSubTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('assets')}
          style={{ fontSize: '12px', padding: '10px 8px' }}
        >
          <PieChart size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Asset rebalancer
        </button>
        <button 
          type="button" 
          className={`auth-tab-btn ${activeSubTab === 'debts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('debts')}
          style={{ fontSize: '12px', padding: '10px 8px' }}
        >
          <CreditCard size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Debt avalanche
        </button>
        <button 
          type="button" 
          className={`auth-tab-btn ${activeSubTab === 'fx' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('fx')}
          style={{ fontSize: '12px', padding: '10px 8px' }}
        >
          <DollarSign size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          FX Leakage
        </button>
      </div>

      {/* ==========================================================================
         SUB-TAB 1: COMPOUNDING HORIZONS PANELS
         ========================================================================== */}
      {activeSubTab === 'compounding' && (
        <div className="panels-grid compounding-grid">
          {/* Controls */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel-header">
              <h3 className="panel-title">
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
                Horizon Parameters
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Risk Profiles</label>
              <div className="risk-presets-grid">
                {RISK_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`btn-secondary ${activeRisk === preset.id ? 'active' : ''}`}
                    style={{
                      padding: '8px 6px',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      alignItems: 'center',
                      background: activeRisk === preset.id ? `${preset.color}22` : 'rgba(255,255,255,0.01)',
                      borderColor: activeRisk === preset.id ? preset.color : 'var(--color-border)',
                      color: activeRisk === preset.id ? preset.color : 'var(--text-secondary)'
                    }}
                    onClick={() => handleRiskClick(preset)}
                  >
                    <strong>{preset.name}</strong>
                    <span>{preset.rate}% CAGR</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="principal-in">Initial Principal</label>
                  <strong>{formatMoney(principal)}</strong>
                </div>
                <input
                  id="principal-in"
                  type="range"
                  min="0"
                  max="250000"
                  step="5000"
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  value={principal}
                  onChange={(e) => { setPrincipal(Number(e.target.value)); setActiveRisk(''); }}
                />
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="contrib-in">Monthly Contribution</label>
                  <strong>{formatMoney(contribution)}/mo</strong>
                </div>
                <input
                  id="contrib-in"
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                />
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="rate-in">Expected Return (CAGR)</label>
                  <strong>{rate}%</strong>
                </div>
                <input
                  id="rate-in"
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  style={{ width: '100%', accentColor: 'var(--color-income)' }}
                  value={rate}
                  onChange={(e) => { setRate(Number(e.target.value)); setActiveRisk(''); }}
                />
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="years-in">Horizon Period</label>
                  <strong>{years} Years</strong>
                </div>
                <input
                  id="years-in"
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  style={{ width: '100%', accentColor: '#ec4899' }}
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Results Graphic */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel-header">
              <h3 className="panel-title">Horizons Projections</h3>
              <span style={{ fontSize: '11px', backgroundColor: 'var(--color-accent-glow)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                Compounded Monthly
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Capital Put In</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {formatMoney(compoundingData[compoundingData.length - 1].contributions)}
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.04)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <div style={{ fontSize: '10px', color: '#06b6d4', textTransform: 'uppercase', fontWeight: 'bold' }}>End Wealth Value</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#06b6d4', marginTop: '4px' }}>
                  {formatMoney(compoundingData[compoundingData.length - 1].wealth)}
                </div>
              </div>
            </div>

            {/* SVG Compounding Chart */}
            <div 
              style={{ position: 'relative', width: '100%', height: '220px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--color-border)', cursor: 'crosshair', userSelect: 'none' }}
              onMouseMove={handleCompoundingMouseMove}
              onMouseLeave={() => setHoveredIndex(null)}
              ref={compoundingChartRef}
            >
              <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wealthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                  const y = padding.top + r * (svgH - padding.top - padding.bottom);
                  return (
                    <g key={idx}>
                      <line x1={padding.left} y1={y} x2={svgW - padding.right} y2={y} stroke="var(--color-border)" strokeWidth="0.8" strokeDasharray="3 3" />
                      <text x={padding.left - 8} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                        {formatMoney(maxCompoundingVal * (1 - r))}
                      </text>
                    </g>
                  );
                })}

                {[0, Math.floor(years / 2), years].map((yVal, idx) => {
                  const graphW = svgW - padding.left - padding.right;
                  const x = padding.left + (idx / 2) * graphW;
                  return (
                    <text key={idx} x={x} y={svgH - 8} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                      Year {yVal}
                    </text>
                  );
                })}

                {contrPath && <path d={contrPath} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3" />}
                {wealthAreaPath && <path d={wealthAreaPath} fill="url(#wealthAreaGrad)" />}
                {wealthPath && <path d={wealthPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />}

                {activeHoverData && (
                  <line x1={activeHoverData.x} y1={padding.top} x2={activeHoverData.x} y2={svgH - padding.bottom} stroke="var(--color-primary)" strokeWidth="1.5" />
                )}

                <line x1={padding.left} y1={svgH - padding.bottom} x2={svgW - padding.right} y2={svgH - padding.bottom} stroke="var(--color-border)" strokeWidth="1.2" />
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgH - padding.bottom} stroke="var(--color-border)" strokeWidth="1.2" />
              </svg>

              {activeHoverData && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${Math.min(mousePos.y, 45)}%`,
                    left: `${mousePos.x > 50 ? mousePos.x - 38 : mousePos.x + 4}%`,
                    backgroundColor: '#111726',
                    border: '1px solid var(--color-primary)',
                    borderRadius: '6px',
                    padding: '8px',
                    pointerEvents: 'none',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    minWidth: '140px',
                    zIndex: 10
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px', marginBottom: '2px' }}>
                    Year {activeHoverData.data.year}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Savings:</span>
                    <span style={{ color: '#fff', fontWeight: '600' }}>{formatMoney(activeHoverData.data.contributions)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span style={{ color: '#06b6d4' }}>Wealth:</span>
                    <span style={{ color: '#06b6d4', fontWeight: '700' }}>{formatMoney(activeHoverData.data.wealth)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span style={{ color: 'var(--color-income)' }}>Interest:</span>
                    <span style={{ color: 'var(--color-income)', fontWeight: '600' }}>{formatMoney(activeHoverData.data.interest)}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '12px', height: '1.5px', borderBottom: '1.5px dashed var(--text-muted)', display: 'inline-block' }}></span>
                Total Deposits
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '12px', height: '2.5px', backgroundColor: '#06b6d4', display: 'inline-block' }}></span>
                Compound Growth
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         SUB-TAB 2: FIRE RETIREMENT CALCULATOR PANELS
         ========================================================================== */}
      {activeSubTab === 'fire' && (
        <div className="panels-grid fire-grid">
          {/* Controls */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel-header">
              <h3 className="panel-title">
                <Flame size={18} style={{ color: '#ef4444' }} />
                FIRE Parameters
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="fire-age">Current Age</label>
                  <strong>{fireCurrentAge} Years Old</strong>
                </div>
                <input
                  id="fire-age"
                  type="range"
                  min="18"
                  max="65"
                  step="1"
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  value={fireCurrentAge}
                  onChange={(e) => setFireCurrentAge(Number(e.target.value))}
                />
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="fire-exp">Annual Lifestyle Expenses</label>
                  <strong>{formatMoney(fireExpenses)}/yr</strong>
                </div>
                <input
                  id="fire-exp"
                  type="range"
                  min="10000"
                  max="200000"
                  step="2500"
                  style={{ width: '100%', accentColor: 'var(--color-expense)' }}
                  value={fireExpenses}
                  onChange={(e) => setFireExpenses(Number(e.target.value))}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Ledger baseline: {formatMoney(computedAnnualExpense)}/yr
                </span>
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="fire-sav">Current Nest Egg</label>
                  <strong>{formatMoney(fireSavings)}</strong>
                </div>
                <input
                  id="fire-sav"
                  type="range"
                  min="0"
                  max="1000000"
                  step="5000"
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                  value={fireSavings}
                  onChange={(e) => setFireSavings(Number(e.target.value))}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Ledger Net Cash: {formatMoney(computedNetBalance)}
                </span>
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="fire-cont">Monthly Asset Accumulation</label>
                  <strong>{formatMoney(fireContrib)}/mo</strong>
                </div>
                <input
                  id="fire-cont"
                  type="range"
                  min="0"
                  max="15000"
                  step="100"
                  style={{ width: '100%', accentColor: 'var(--color-income)' }}
                  value={fireContrib}
                  onChange={(e) => setFireContrib(Number(e.target.value))}
                />
              </div>

              <div className="filter-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <label htmlFor="fire-rate">Growth Yield (CAGR)</label>
                  <strong>{fireRate}%</strong>
                </div>
                <input
                  id="fire-rate"
                  type="range"
                  min="2"
                  max="15"
                  step="0.5"
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  value={fireRate}
                  onChange={(e) => setFireRate(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel-header">
              <h3 className="panel-title">FIRE Milestones</h3>
            </div>

            {/* Target Cards */}
            <div className="fire-milestone-cards">
              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Lean FIRE</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{formatMoney(leanFireTarget)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {fireProjection.leanAge ? `Age ${fireProjection.leanAge} 🎉` : 'horizon >60 yrs'}
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.15)', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#06b6d4', textTransform: 'uppercase', fontWeight: 'bold' }}>Standard FIRE</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#06b6d4', marginTop: '2px' }}>{formatMoney(fireTarget)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {fireProjection.standardAge ? `Age ${fireProjection.standardAge} 🚀` : 'horizon >60 yrs'}
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Fat FIRE</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#8b5cf6', marginTop: '2px' }}>{formatMoney(fatFireTarget)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {fireProjection.fatAge ? `Age ${fireProjection.fatAge} 👑` : 'horizon >60 yrs'}
                </div>
              </div>
            </div>

            {/* Simulated Progression bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Timeline Progress Bars</h4>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Lean FIRE (75% expenses)</span>
                  <strong>{fireProjection.leanAge ? `Target Reached at Age ${fireProjection.leanAge}` : 'Accumulating...'}</strong>
                </div>
                <div className="budget-track" style={{ height: '8px' }}>
                  <div 
                    className="budget-fill safe" 
                    style={{ width: fireProjection.leanAge ? '100%' : `${Math.min((fireSavings / leanFireTarget) * 100, 100)}%`, background: '#10b981' }}
                  ></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Standard FIRE (100% expenses)</span>
                  <strong>{fireProjection.standardAge ? `Target Reached at Age ${fireProjection.standardAge}` : 'Accumulating...'}</strong>
                </div>
                <div className="budget-track" style={{ height: '8px' }}>
                  <div 
                    className="budget-fill safe" 
                    style={{ width: fireProjection.standardAge ? '100%' : `${Math.min((fireSavings / fireTarget) * 100, 100)}%`, background: '#06b6d4' }}
                  ></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Fat FIRE (150% expenses)</span>
                  <strong>{fireProjection.fatAge ? `Target Reached at Age ${fireProjection.fatAge}` : 'Accumulating...'}</strong>
                </div>
                <div className="budget-track" style={{ height: '8px' }}>
                  <div 
                    className="budget-fill safe" 
                    style={{ width: fireProjection.fatAge ? '100%' : `${Math.min((fireSavings / fatFireTarget) * 100, 100)}%`, background: '#8b5cf6' }}
                  ></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16,185,129,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)', marginTop: '8px' }}>
              <Flame size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>FIRE Strategy</strong>: Set aside {formatMoney(fireContrib)} per month inside assets yielding {fireRate}% to hit your target in {fireProjection.standardAge ? `${fireProjection.standardAge - fireCurrentAge} years` : 'over 60 years'}.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         SUB-TAB 3: ASSET ALLOCATOR & REBALANCER PANELS
         ========================================================================== */}
      {activeSubTab === 'assets' && (
        <div className="panels-grid assets-grid">
          {/* Allocations Table */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-header" style={{ marginBottom: '8px' }}>
              <h3 className="panel-title">Asset Class Allocator</h3>
              <span style={{ fontSize: '11px', color: totalTargetPct === 100 ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: 'bold' }}>
                Target: {totalTargetPct}% / 100%
              </span>
            </div>

            <div className="tx-table-container" style={{ margin: 0 }}>
              <table className="tx-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ height: '36px' }}>
                    <th style={{ padding: '8px 12px' }}>Class</th>
                    <th style={{ padding: '8px 12px' }}>Target %</th>
                    <th style={{ padding: '8px 12px' }}>Holdings</th>
                    <th style={{ padding: '8px 12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id} className="tx-row" style={{ height: '42px' }}>
                      <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: asset.color }}></span>
                        {asset.name}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '12px', width: '60px', background: 'rgba(0,0,0,0.2)' }}
                          value={asset.target}
                          onChange={(e) => {
                            const newTarget = parseFloat(e.target.value) || 0;
                            saveAssets(assets.map(a => a.id === asset.id ? { ...a, target: newTarget } : a));
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '12px', width: '100px', background: 'rgba(0,0,0,0.2)' }}
                          value={asset.actual}
                          onChange={(e) => {
                            const newActual = parseFloat(e.target.value) || 0;
                            saveAssets(assets.map(a => a.id === asset.id ? { ...a, actual: newActual } : a));
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <button 
                          type="button" 
                          className="btn-icon delete" 
                          onClick={() => handleDeleteAsset(asset.id)}
                          style={{ padding: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Add Asset Form */}
            <form onSubmit={handleAddAsset} className="quick-add-form">
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="asset-name">Asset Name</label>
                <input 
                  id="asset-name"
                  type="text" 
                  placeholder="e.g. ETFs" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newAssetLabel} 
                  onChange={(e) => setNewAssetLabel(e.target.value)} 
                  required 
                />
              </div>
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="asset-target">Target %</label>
                <input 
                  id="asset-target"
                  type="number" 
                  placeholder="25" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newAssetTarget} 
                  onChange={(e) => setNewAssetTarget(e.target.value)} 
                  required 
                />
              </div>
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="asset-actual">Holdings</label>
                <input 
                  id="asset-actual"
                  type="number" 
                  placeholder="1000" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newAssetActual} 
                  onChange={(e) => setNewAssetActual(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 12px', height: '33px' }}>
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Rebalancing recommendations & Donut chart */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-header">
              <h3 className="panel-title">Rebalancing Actions</h3>
            </div>

            {totalTargetPct !== 100 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239,68,68,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)', fontSize: '11px', color: 'var(--color-expense)' }}>
                <AlertTriangle size={14} />
                <span>Allocation sum is {totalTargetPct}%. Adjust target percentages to sum to exactly 100%.</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rebalancingPlan.map((plan, idx) => {
                const gapColor = plan.gapVal > 0 ? 'var(--color-income)' : plan.gapVal < 0 ? 'var(--color-expense)' : 'var(--text-muted)';
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: plan.color }}></span>
                      <strong>{plan.name}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({plan.actualPct.toFixed(0)}% actual)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: gapColor, fontWeight: 'bold' }}>
                        {plan.gapVal > 0 ? `+${formatMoney(plan.gapVal)}` : plan.gapVal < 0 ? `-${formatMoney(Math.abs(plan.gapVal))}` : 'Bal'}
                      </span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: plan.action === 'Buy' ? 'rgba(16,185,129,0.1)' : plan.action === 'Sell' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: plan.action === 'Buy' ? '#10b981' : plan.action === 'Sell' ? '#ef4444' : 'var(--text-muted)', fontWeight: 'bold' }}>
                        {plan.action}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Backtester presets */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
              <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>Asset Mix Backtester Simulator</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ fontSize: '11px', padding: '6px' }}
                  onClick={() => alert(`Backtester: During the 2008 Financial Crisis, this asset allocation would have experienced a peak drawdown of approximately -22.4% with a recovery period of 19 months.`)}
                >
                  📉 2008 Crash drawdown
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ fontSize: '11px', padding: '6px' }}
                  onClick={() => alert(`Backtester: During the 2021 Crypto Rally, this asset allocation would have experienced an annualized gain of +18.7% due to your targeted allocation weighting.`)}
                >
                  🚀 2021 Bull Market gain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         SUB-TAB 4: DEBT SNOWBALL VS. AVALANCHE PLANNER
         ========================================================================== */}
      {activeSubTab === 'debts' && (
        <div className="panels-grid debts-grid">
          {/* Debts Table */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-header" style={{ marginBottom: '8px' }}>
              <h3 className="panel-title">
                <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
                Outstanding Liabilities
              </h3>
            </div>

            <div className="tx-table-container" style={{ margin: 0 }}>
              <table className="tx-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ height: '36px' }}>
                    <th style={{ padding: '8px 12px' }}>Debt Name</th>
                    <th style={{ padding: '8px 12px' }}>Balance</th>
                    <th style={{ padding: '8px 12px' }}>Interest Rate</th>
                    <th style={{ padding: '8px 12px' }}>Min Pay</th>
                    <th style={{ padding: '8px 12px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map(debt => (
                    <tr key={debt.id} className="tx-row" style={{ height: '42px' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{debt.name}</td>
                      <td style={{ padding: '8px 12px' }}>{formatMoney(debt.balance)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-expense)', fontWeight: '600' }}>{debt.rate}%</td>
                      <td style={{ padding: '8px 12px' }}>{formatMoney(debt.minPayment)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <button 
                          type="button" 
                          className="btn-icon delete" 
                          onClick={() => handleDeleteDebt(debt.id)}
                          style={{ padding: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Add Debt Form */}
            <form onSubmit={handleAddDebt} className="quick-add-debt-form">
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="debt-name">Name</label>
                <input 
                  id="debt-name"
                  type="text" 
                  placeholder="e.g. Visa" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newDebtName} 
                  onChange={(e) => setNewDebtName(e.target.value)} 
                  required 
                />
              </div>
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="debt-bal">Balance</label>
                <input 
                  id="debt-bal"
                  type="number" 
                  placeholder="2500" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newDebtBalance} 
                  onChange={(e) => setNewDebtBalance(e.target.value)} 
                  required 
                />
              </div>
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="debt-rate">Rate %</label>
                <input 
                  id="debt-rate"
                  type="number" 
                  placeholder="18" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newDebtRate} 
                  onChange={(e) => setNewDebtRate(e.target.value)} 
                  required 
                />
              </div>
              <div className="filter-group">
                <label style={{ fontSize: '10px' }} htmlFor="debt-min">Min Pay</label>
                <input 
                  id="debt-min"
                  type="number" 
                  placeholder="50" 
                  className="input-field" 
                  style={{ padding: '6px 10px', fontSize: '12px' }} 
                  value={newDebtMin} 
                  onChange={(e) => setNewDebtMin(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 12px', height: '33px' }}>
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Debt Strategy Selector & Results */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-header">
              <h3 className="panel-title">Strategy Comparison</h3>
            </div>

            <div className="filter-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <label htmlFor="snowball-booster" style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>Snowball Payoff Booster</label>
                <strong>+{formatMoney(extraPayment)}/mo</strong>
              </div>
              <input
                id="snowball-booster"
                type="range"
                min="0"
                max="2000"
                step="50"
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
              />
            </div>

            {/* Toggle tabs */}
            <div className="auth-tabs" style={{ margin: '8px 0', border: '1px solid var(--color-border)' }}>
              <button 
                type="button" 
                className={`auth-tab-btn ${debtStrategy === 'avalanche' ? 'active' : ''}`}
                onClick={() => setDebtStrategy('avalanche')}
              >
                ⚡ Debt Avalanche (High Rate)
              </button>
              <button 
                type="button" 
                className={`auth-tab-btn ${debtStrategy === 'snowball' ? 'active' : ''}`}
                onClick={() => setDebtStrategy('snowball')}
              >
                ⛄ Debt Snowball (Low Balance)
              </button>
            </div>

            {debtSimResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Time to Debt-Free</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {debtSimResults[debtStrategy].monthsToPayoff === 360 ? '30+ Years' : `${debtSimResults[debtStrategy].monthsToPayoff} Months`}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--color-expense)', textTransform: 'uppercase', fontWeight: 'bold' }}>Interest Cost Paid</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-expense)', marginTop: '4px' }}>
                      {formatMoney(debtSimResults[debtStrategy].totalInterest)}
                    </div>
                  </div>
                </div>

                {/* Head-to-Head analysis block */}
                {debtSimResults.avalanche && debtSimResults.snowball && (
                  <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.01)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>⚡ Strategy Assessment:</div>
                    <div>
                      {debtSimResults.avalanche.totalInterest < debtSimResults.snowball.totalInterest ? (
                        <span>
                          <strong>Avalanche</strong> is your optimal plan. It will save you <strong>{formatMoney(debtSimResults.snowball.totalInterest - debtSimResults.avalanche.totalInterest)}</strong> in interest cost and make you debt-free <strong>{Math.max(0, debtSimResults.snowball.monthsToPayoff - debtSimResults.avalanche.monthsToPayoff)} months</strong> faster compared to Snowball.
                        </span>
                      ) : (
                        <span>
                          <strong>Snowball</strong> performs best in this configuration. It will save you <strong>{formatMoney(debtSimResults.avalanche.totalInterest - debtSimResults.snowball.totalInterest)}</strong> in interest cost.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Add your active liabilities above to calculate optimal payoff paths.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
         SUB-TAB 5: FX LEAKAGE fee optimizer PANELS
         ========================================================================== */}
      {activeSubTab === 'fx' && (
        <div className="panels-grid fx-grid">
          {/* Transfer Calculator */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-header">
              <h3 className="panel-title">FX Cost Converter</h3>
            </div>

            <div className="filter-group" style={{ margin: 0 }}>
              <label htmlFor="fx-amount-in">Send Amount</label>
              <input
                id="fx-amount-in"
                type="number"
                className="input-field"
                placeholder="2500"
                value={fxAmount}
                onChange={(e) => setFxAmount(Math.max(1, parseFloat(e.target.value) || 0))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px' }}>
              <div className="filter-group">
                <label htmlFor="fx-from-select">From</label>
                <select 
                  id="fx-from-select"
                  className="select-field" 
                  value={fxFrom} 
                  onChange={(e) => setFxFrom(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
                <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
              </div>

              <div className="filter-group">
                <label htmlFor="fx-to-select">To</label>
                <select 
                  id="fx-to-select"
                  className="select-field" 
                  value={fxTo} 
                  onChange={(e) => setFxTo(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(6,182,212,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.1)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <Info size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span>
                <strong>Mid-market rate</strong>: 1 {fxFrom} = {exchangeRates[fxFrom]?.[fxTo]} {fxTo}. Standard bank transfers layer hidden margins on top of this rate.
              </span>
            </div>
          </div>

          {/* Platform comparison list */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-header">
              <h3 className="panel-title">FX Leakage Comparison</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conversionOptions.map((opt, idx) => {
                const isBest = idx === 0;
                const rate = exchangeRates[fxFrom]?.[fxTo] || 1;
                const convertedSymbol = fxTo === 'EUR' ? '€' : fxTo === 'INR' ? '₹' : '$';
                
                return (
                  <div 
                    key={opt.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      backgroundColor: isBest ? 'rgba(16,185,129,0.02)' : 'rgba(255,255,255,0.01)', 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      border: isBest ? '1px solid #10b981' : '1px solid var(--color-border)',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{opt.name}</strong>
                        {isBest && (
                          <span style={{ fontSize: '9px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                            Optimal
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Speed: {opt.speed} | Total Fees: {getSymbol()}{opt.fee.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '14px', color: isBest ? 'var(--color-income)' : 'var(--text-primary)' }}>
                        {convertedSymbol}{Math.round(opt.netReceived).toLocaleString()}
                      </strong>
                      <span style={{ fontSize: '9px', color: 'var(--color-expense)', fontWeight: '600', display: 'block', marginTop: '2px' }}>
                        -{opt.feePct.toFixed(1)}% leakage
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default WealthSuite;

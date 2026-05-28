import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { TransactionsList } from './components/TransactionsList';
import { TransactionModal } from './components/TransactionModal';
import { SavingsGoals } from './components/SavingsGoals';
import { Subscriptions } from './components/Subscriptions';
import { WealthyAI } from './components/WealthyAI';
import { WealthSuite } from './components/WealthSuite';
import { 
  LayoutDashboard, 
  List, 
  LogOut, 
  Menu, 
  X, 
  Database, 
  WifiOff, 
  Plus, 
  Coins,
  Target,
  Calendar,
  Bot,
  TrendingUp,
  Link
} from 'lucide-react';

const AppInner = () => {
  const { user, loading, storageMode, logout, currency, setCurrency, activeToast } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'transactions' | 'goals' | 'subscriptions' | 'chat' | 'wealth'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTxData, setEditTxData] = useState(null);
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading ledger system...</div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // 1. If not logged in, render Auth screen (with toast notification support)
  if (!user) {
    return (
      <>
        <Auth />
        {activeToast && (
          <div className="toast-container">
            <div className={`toast ${activeToast.type}`}>
              <span>{activeToast.message}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. Open Add transaction modal
  const handleOpenAddModal = () => {
    setEditTxData(null);
    setIsModalOpen(true);
  };

  // 3. Open Edit transaction modal
  const handleOpenEditModal = (tx) => {
    setEditTxData(tx);
    setIsModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Coins size={22} style={{ color: 'var(--color-accent)' }} />
          <span>WealthFlow</span>
        </div>
        
        <div className="sidebar-menu">
          <div 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </div>
          
          <div 
            className={`sidebar-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}
          >
            <List size={18} />
            Transactions
          </div>

          <div 
            className={`sidebar-item ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => { setActiveTab('goals'); setIsSidebarOpen(false); }}
          >
            <Target size={18} />
            Savings Goals
          </div>

          <div 
            className={`sidebar-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('subscriptions'); setIsSidebarOpen(false); }}
          >
            <Calendar size={18} />
            Recurring Bills
          </div>

          <div 
            className={`sidebar-item ${activeTab === 'wealth' ? 'active' : ''}`}
            onClick={() => { setActiveTab('wealth'); setIsSidebarOpen(false); }}
          >
            <TrendingUp size={18} />
            Wealth Planner
          </div>

          <div 
            className={`sidebar-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
          >
            <Bot size={18} />
            WealthyAI Chat
          </div>
        </div>

        <div className="sidebar-footer">
          {/* Currency Preference Selector */}
          <div className="filter-group" style={{ marginBottom: '8px' }}>
            <label htmlFor="currency-select" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wallet Currency</label>
            <select
              id="currency-select"
              className="select-field"
              style={{ padding: '6px 10px', fontSize: '12px', background: 'rgba(0,0,0,0.3)' }}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          <div className="user-badge">
            <div className="user-avatar">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <div className="user-email">{user.email}</div>
              <span className={`storage-mode-pill ${storageMode}`}>
                {storageMode === 'supabase' ? (
                  <>
                    <Database size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Cloud SQL
                  </>
                ) : (
                  <>
                    <WifiOff size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Local Cache
                  </>
                )}
              </span>
            </div>
          </div>
          
          <button 
            type="button"
            className="sidebar-item" 
            style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', marginTop: '4px' }}
            onClick={logout}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              type="button"
              className="mobile-nav-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar menu"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="header-title">
              <h1>
                {activeTab === 'dashboard' && 'Overview Dashboard'}
                {activeTab === 'transactions' && 'Transaction History'}
                {activeTab === 'goals' && 'Savings Targets'}
                {activeTab === 'subscriptions' && 'Recurring Bills'}
                {activeTab === 'wealth' && 'Wealth & Retirement Planner'}
                {activeTab === 'chat' && 'WealthyAI Financial Advisor'}
              </h1>
            </div>
          </div>

          <div className="header-actions">
            <button 
              type="button"
              className="btn-primary" 
              style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}
              onClick={handleOpenAddModal}
            >
              <Plus size={16} /> New Entry
            </button>
          </div>
        </header>

        <div className="content-body">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'transactions' && (
            <TransactionsList 
              onEditTransaction={handleOpenEditModal} 
              onOpenAddModal={handleOpenAddModal}
            />
          )}
          {activeTab === 'goals' && <SavingsGoals />}
          {activeTab === 'subscriptions' && <Subscriptions />}
          {activeTab === 'wealth' && <WealthSuite />}
          {activeTab === 'chat' && <WealthyAI />}
        </div>
      </main>

      {/* Floating Add Button for quick access */}
      <button 
        type="button"
        className="fab-btn" 
        onClick={handleOpenAddModal}
        title="Add transaction"
      >
        <Plus size={24} />
      </button>

      {/* Dialog Modals */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditTxData(null); }}
        transactionToEdit={editTxData}
      />

      {/* Toast Notification */}
      {activeToast && (
        <div className="toast-container">
          <div className={`toast ${activeToast.type}`}>
            <span>{activeToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <FinanceProvider>
      <AppInner />
    </FinanceProvider>
  );
}

export default App;

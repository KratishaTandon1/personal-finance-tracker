import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Mail, Lock, Loader, Database, WifiOff } from 'lucide-react';

export const Auth = () => {
  const { login, signup, storageMode } = useFinance();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Lock size={26} />
          </div>
          <h2>WealthFlow</h2>
          <p>Sleek & Smart Personal Finance Tracker</p>
        </div>

        {storageMode === 'local' ? (
          <div className="auth-demo-banner">
            <WifiOff size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Local Demo Mode Active</strong>
              <br />
              Supabase credentials not found. Your accounts and data will be saved locally in this browser. Perfect for offline evaluation!
            </div>
          </div>
        ) : (
          <div className="auth-demo-banner" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <Database size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Cloud Mode (Supabase Connected)</strong>
              <br />
              Connected to secure PostgreSQL database. Your records are synced in real-time.
            </div>
          </div>
        )}

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="coach-tip-card danger" style={{ padding: '12px 16px', margin: 0 }}>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <p>Evaluating? You can register a mock email instantly.</p>
          ) : (
            <p>Signing up will create a new sandboxed wallet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

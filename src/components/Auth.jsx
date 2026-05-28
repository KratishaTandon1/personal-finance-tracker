import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Mail, Lock, Loader, Database, WifiOff } from 'lucide-react';

export const Auth = () => {
  const { login, signup, storageMode, showToast, resetPassword } = useFinance();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (authView === 'forgot') {
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }
      try {
        await resetPassword(email);
        setAuthView('login');
      } catch (err) {
        console.error(err);
        const errMsg = err.message || 'Failed to send password reset email. Please try again.';
        setError(errMsg);
        if (showToast) showToast(errMsg, 'danger');
      } finally {
        setLoading(false);
      }
      return;
    }

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
      if (authView === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
        if (storageMode === 'supabase') {
          setAuthView('verify');
        }
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.message || 'Authentication failed. Please try again.';
      setError(errMsg);
      if (showToast) showToast(errMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            {authView === 'verify' ? <Mail size={26} /> : <Lock size={26} />}
          </div>
          <h2>{authView === 'verify' ? 'Confirm Email' : 'WealthFlow'}</h2>
          <p>{authView === 'verify' ? 'Activation link sent' : 'Sleek & Smart Personal Finance Tracker'}</p>
        </div>

        {authView === 'verify' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              We have sent a verification link to <strong>{email}</strong>.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Please check your inbox (including your spam or promotions folder) and click the link to activate your account.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '8px' }}
              onClick={() => { setAuthView('login'); setError(''); }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
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

        {authView !== 'forgot' ? (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${authView === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthView('login'); setError(''); }}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authView === 'signup' ? 'active' : ''}`}
              onClick={() => { setAuthView('signup'); setError(''); }}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Reset Password Link</span>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Enter your registered email below to receive a password reset link.
            </p>
          </div>
        )}

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

          {authView !== 'forgot' && (
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
          )}

          {authView === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                onClick={() => { setAuthView('forgot'); setError(''); }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Working...
              </>
            ) : (
              authView === 'login' ? 'Sign In' : authView === 'signup' ? 'Create Account' : 'Send Reset Link'
            )}
          </button>

          {authView === 'forgot' && (
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                onClick={() => { setAuthView('login'); setError(''); }}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </form>

        <div className="auth-footer">
          {authView === 'login' ? (
            <p>Evaluating? You can register a mock email instantly.</p>
          ) : authView === 'signup' ? (
            <p>Signing up will create a new sandboxed wallet.</p>
          ) : (
            <p>A link will be sent to confirm and reset your credentials.</p>
          )}
        </div>
      </>
    )}
  </div>
</div>
  );
};

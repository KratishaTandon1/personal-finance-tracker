import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Lock, Loader, Shield } from 'lucide-react';

export const ResetPassword = () => {
  const { updatePassword, showToast } = useFinance();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(password);
    } catch (err) {
      console.error(err);
      const errMsg = err.message || 'Failed to reset password. Please try again.';
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
            <Shield size={26} />
          </div>
          <h2>Reset Password</h2>
          <p>Choose a secure new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="coach-tip-card danger" style={{ padding: '12px 16px', margin: 0 }}>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="new-password">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="new-password"
                type="password"
                placeholder="New password (min 6 chars)"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

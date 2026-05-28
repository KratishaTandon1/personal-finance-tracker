import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

const FinanceContext = createContext();

// Pre-defined transaction categories
export const CATEGORIES = {
  income: [
    { id: 'salary', name: 'Salary', icon: 'Briefcase', color: '#10B981' },
    { id: 'freelance', name: 'Freelance', icon: 'Laptop', color: '#3B82F6' },
    { id: 'investments', name: 'Investments', icon: 'TrendingUp', color: '#8B5CF6' },
    { id: 'other-income', name: 'Other Income', icon: 'PlusCircle', color: '#6B7280' }
  ],
  expense: [
    { id: 'food', name: 'Food & Dining', icon: 'Utensils', color: '#EF4444' },
    { id: 'rent', name: 'Rent & Housing', icon: 'Home', color: '#F59E0B' },
    { id: 'utilities', name: 'Utilities & Bills', icon: 'Zap', color: '#6366F1' },
    { id: 'transport', name: 'Transportation', icon: 'Car', color: '#06B6D4' },
    { id: 'leisure', name: 'Entertainment & Leisure', icon: 'Film', color: '#EC4899' },
    { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#10B981' },
    { id: 'health', name: 'Health & Wellness', icon: 'Heart', color: '#EF4444' },
    { id: 'other-expense', name: 'Other Expenses', icon: 'HelpCircle', color: '#6B7280' }
  ]
};

export const FinanceProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({}); // format: { category: limit_amount }
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState(isSupabaseConfigured ? 'supabase' : 'local');
  const [achievements, setAchievements] = useState([]);
  const [aiTips, setAiTips] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);
  const [goals, setGoals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isRecovering, setIsRecovering] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('type=recovery');
  });

  const showToast = (message, type = 'info') => {
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    setActiveToast({ message, type });
    const id = setTimeout(() => {
      setActiveToast(null);
    }, 4000);
    setToastTimeoutId(id);
  };

  // 1. AUTHENTICATION & INITIAL LOADING
  useEffect(() => {
    const initializeAuth = async () => {
      if (storageMode === 'supabase') {
        try {
          // Check current session
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (session) {
            setUser(session.user);
            await loadUserData(session.user.id);
          } else {
            setUser(null);
            setLoading(false);
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              setIsRecovering(true);
            }
            if (session) {
              setUser(session.user);
              await loadUserData(session.user.id);
            } else {
              setUser(null);
              setTransactions([]);
              setBudgets({});
              setGoals([]);
              setSubscriptions([]);
              setLoading(false);
            }
          });

          return () => subscription.unsubscribe();
        } catch (err) {
          console.error('Supabase Auth error. Falling back to local storage auth:', err);
          setStorageMode('local');
          loadLocalAuth();
        }
      } else {
        loadLocalAuth();
      }
    };

    initializeAuth();
  }, [storageMode]);

  const loadLocalAuth = () => {
    const localUserJson = localStorage.getItem('finance_user');
    if (localUserJson) {
      try {
        const localUser = JSON.parse(localUserJson);
        setUser(localUser);
        loadLocalData(localUser.id);
      } catch (e) {
        setUser(null);
        setLoading(false);
      }
    } else {
      setUser(null);
      setLoading(false);
    }
  };

  // 2. DATA LOADERS
  const loadUserData = async (userId) => {
    setLoading(true);
    try {
      // Load Profile (currency/budget)
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (pError && pError.code !== 'PGRST116') throw pError;

      if (profile) {
        setCurrency(profile.currency || 'USD');
      } else {
        // Create profile if not exists
        await supabase.from('profiles').insert([{ id: userId, currency: 'USD' }]);
      }

      // Load Transactions
      const { data: txs, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (tError) throw tError;
      setTransactions(txs || []);

      // Load Budgets
      const { data: bgts, error: bError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);

      if (bError) throw bError;
      const budgetMap = {};
      bgts?.forEach(b => {
        budgetMap[b.category] = Number(b.limit_amount);
      });
      setBudgets(budgetMap);

      // Load Goals (Supabase fallback checked)
      try {
        const { data: gls } = await supabase.from('goals').select('*').eq('user_id', userId);
        setGoals(gls || []);
      } catch (e) { console.warn('Supabase goals load failed', e); }

      // Load Subscriptions (Supabase fallback checked)
      try {
        const { data: sbs } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
        setSubscriptions(sbs || []);
      } catch (e) { console.warn('Supabase subscriptions load failed', e); }

    } catch (err) {
      console.error('Failed to load database content. Running in local storage fallback:', err);
      // Fallback to local storage loading
      loadLocalData(userId);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = (userId) => {
    // Load local transactions
    const txsJson = localStorage.getItem(`finance_txs_${userId}`);
    setTransactions(txsJson ? JSON.parse(txsJson) : []);

    // Load local budgets
    const bgtsJson = localStorage.getItem(`finance_budgets_${userId}`);
    setBudgets(bgtsJson ? JSON.parse(bgtsJson) : {});

    // Load local preferences
    const curr = localStorage.getItem(`finance_currency_${userId}`);
    if (curr) setCurrency(curr);

    // Load local goals
    const goalsJson = localStorage.getItem(`finance_goals_${userId}`);
    setGoals(goalsJson ? JSON.parse(goalsJson) : []);

    // Load local subscriptions
    const subsJson = localStorage.getItem(`finance_subs_${userId}`);
    setSubscriptions(subsJson ? JSON.parse(subsJson) : []);

    setLoading(false);
  };

  // Run dynamic analysis whenever transactions or budgets update
  useEffect(() => {
    if (user) {
      runAchievementChecks();
      generateAiTips();
    }
  }, [transactions, budgets, user]);

  // 3. AUTH ACTIONS
  const login = async (email, password) => {
    setLoading(true);
    if (storageMode === 'supabase') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        throw error;
      }
      showToast('Welcome back!', 'success');
      return data.user;
    } else {
      // Mock Local Login
      const usersJson = localStorage.getItem('finance_mock_users');
      const users = usersJson ? JSON.parse(usersJson) : [];
      const matchedUser = users.find(u => u.email === email && u.password === password);
      
      if (!matchedUser) {
        setLoading(false);
        throw new Error('Invalid email or password');
      }

      const activeUser = { id: matchedUser.id, email: matchedUser.email };
      localStorage.setItem('finance_user', JSON.stringify(activeUser));
      setUser(activeUser);
      loadLocalData(activeUser.id);
      showToast('Logged in successfully!', 'success');
      return activeUser;
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    if (storageMode === 'supabase') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setLoading(false);
        throw error;
      }
      showToast('Verification email sent or account created!', 'success');
      return data.user;
    } else {
      // Mock Local Signup
      const usersJson = localStorage.getItem('finance_mock_users');
      const users = usersJson ? JSON.parse(usersJson) : [];
      if (users.some(u => u.email === email)) {
        setLoading(false);
        throw new Error('Email already registered');
      }

      const newUser = { id: Math.random().toString(36).substr(2, 9), email, password };
      users.push(newUser);
      localStorage.setItem('finance_mock_users', JSON.stringify(users));

      const activeUser = { id: newUser.id, email: newUser.email };
      localStorage.setItem('finance_user', JSON.stringify(activeUser));
      setUser(activeUser);
      loadLocalData(activeUser.id);
      showToast('Account registered successfully!', 'success');
      return activeUser;
    }
  };

  const logout = async () => {
    setLoading(true);
    showToast('Signed out successfully.', 'info');
    if (storageMode === 'supabase') {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('finance_user');
      setUser(null);
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setSubscriptions([]);
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    setLoading(true);
    if (storageMode === 'supabase') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      setLoading(false);
      if (error) throw error;
      showToast('Password reset link sent to your email!', 'success');
    } else {
      setLoading(false);
      showToast('Local Mode: Reset link simulated!', 'success');
    }
  };

  const updatePassword = async (newPassword) => {
    setLoading(true);
    if (storageMode === 'supabase') {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      if (error) throw error;
      setIsRecovering(false);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, null, window.location.pathname);
      }
      showToast('Password updated successfully! You are now logged in.', 'success');
    } else {
      setLoading(false);
      setIsRecovering(false);
      showToast('Local Mode: Password updated successfully!', 'success');
    }
  };

  // 4. TRANSACTION ACTIONS
  const addTransaction = async (tx) => {
    const newTx = {
      ...tx,
      amount: Number(tx.amount),
      user_id: user.id,
      created_at: new Date().toISOString()
    };

    // Calculate budget status & trigger toast
    if (newTx.type === 'expense') {
      const limit = budgets[newTx.category];
      if (limit) {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === newTx.category)
          .reduce((sum, t) => sum + t.amount, 0);
        const newSpent = spent + newTx.amount;
        const catName = CATEGORIES.expense.find(c => c.id === newTx.category)?.name || newTx.category;

        if (newSpent > limit && spent <= limit) {
          showToast(`⚠️ Budget Alert: You have exceeded your budget for ${catName}!`, 'danger');
        } else if (newSpent > limit) {
          showToast(`⚠️ Budget Alert: You are over budget by ${(newSpent - limit).toFixed(0)} in ${catName}!`, 'danger');
        } else {
          showToast('Expense recorded successfully.', 'success');
        }
      } else {
        showToast('Expense recorded successfully.', 'success');
      }
    } else {
      showToast('Income recorded successfully.', 'success');
    }

    if (storageMode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([newTx])
          .select()
          .single();

        if (error) throw error;
        setTransactions(prev => [data, ...prev]);
      } catch (err) {
        console.error('Supabase write failed, writing locally:', err);
        saveTxLocally(newTx);
      }
    } else {
      saveTxLocally(newTx);
    }
  };

  const saveTxLocally = (tx) => {
    const localTx = { ...tx, id: tx.id || Math.random().toString(36).substr(2, 9) };
    const updated = [localTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem(`finance_txs_${user.id}`, JSON.stringify(updated));
  };

  const editTransaction = async (id, updatedFields) => {
    const updatedFieldsFormatted = {
      ...updatedFields,
      amount: Number(updatedFields.amount)
    };
    showToast('Transaction updated successfully.', 'success');

    if (storageMode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .update(updatedFieldsFormatted)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        setTransactions(prev => prev.map(t => t.id === id ? data : t));
      } catch (err) {
        console.error('Supabase update failed, updating locally:', err);
        updateTxLocally(id, updatedFieldsFormatted);
      }
    } else {
      updateTxLocally(id, updatedFieldsFormatted);
    }
  };

  const updateTxLocally = (id, fields) => {
    const updated = transactions.map(t => t.id === id ? { ...t, ...fields } : t);
    setTransactions(updated);
    localStorage.setItem(`finance_txs_${user.id}`, JSON.stringify(updated));
  };

  const deleteTransaction = async (id) => {
    showToast('Transaction deleted.', 'info');
    if (storageMode === 'supabase') {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Supabase delete failed, deleting locally:', err);
        deleteTxLocally(id);
      }
    } else {
      deleteTxLocally(id);
    }
  };

  const deleteTxLocally = (id) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem(`finance_txs_${user.id}`, JSON.stringify(updated));
  };

  // 5. BUDGET ACTIONS
  const updateBudget = async (category, limitAmount) => {
    const numericLimit = Number(limitAmount);
    const catName = CATEGORIES.expense.find(c => c.id === category)?.name || category;
    showToast(`Budget limit set for ${catName} at ${numericLimit}.`, 'success');
    
    if (storageMode === 'supabase') {
      try {
        // Upsert budget
        const { error } = await supabase
          .from('budgets')
          .upsert({
            user_id: user.id,
            category,
            limit_amount: numericLimit,
            period: 'monthly'
          }, { onConflict: 'user_id,category' });

        if (error) throw error;
        setBudgets(prev => ({ ...prev, [category]: numericLimit }));
      } catch (err) {
        console.error('Supabase budget upsert failed, saving locally:', err);
        saveBudgetLocally(category, numericLimit);
      }
    } else {
      saveBudgetLocally(category, numericLimit);
    }
  };

  const saveBudgetLocally = (category, limit) => {
    const updated = { ...budgets, [category]: limit };
    setBudgets(updated);
    localStorage.setItem(`finance_budgets_${user.id}`, JSON.stringify(updated));
  };

  const deleteBudget = async (category) => {
    if (storageMode === 'supabase') {
      try {
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('user_id', user.id)
          .eq('category', category);

        if (error) throw error;
        setBudgets(prev => {
          const clone = { ...prev };
          delete clone[category];
          return clone;
        });
      } catch (err) {
        console.error('Supabase budget delete failed, deleting locally:', err);
        deleteBudgetLocally(category);
      }
    } else {
      deleteBudgetLocally(category);
    }
  };

  const deleteBudgetLocally = (category) => {
    setBudgets(prev => {
      const clone = { ...prev };
      delete clone[category];
      localStorage.setItem(`finance_budgets_${user.id}`, JSON.stringify(clone));
      return clone;
    });
  };

  // 6. BACKUP & DATA EXPORT/IMPORT
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      transactions,
      budgets,
      goals,
      subscriptions,
      currency,
      exportedAt: new Date().toISOString()
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `finance_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importData = async (jsonData) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
        throw new Error('Invalid file format. Missing transactions.');
      }

      // Add to local / Supabase
      if (storageMode === 'supabase') {
        const txsToInsert = parsed.transactions.map(t => ({
          type: t.type,
          category: t.category,
          amount: Number(t.amount),
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || '',
          user_id: user.id
        }));

        const { error } = await supabase.from('transactions').insert(txsToInsert);
        if (error) throw error;

        // Upsert budgets
        if (parsed.budgets) {
          for (const category of Object.keys(parsed.budgets)) {
            await supabase.from('budgets').upsert({
              user_id: user.id,
              category,
              limit_amount: Number(parsed.budgets[category]),
              period: 'monthly'
            }, { onConflict: 'user_id,category' });
          }
        }

        // Import goals
        if (parsed.goals) {
          for (const goal of parsed.goals) {
            await supabase.from('goals').upsert({
              id: goal.id,
              user_id: user.id,
              title: goal.title,
              target_amount: Number(goal.target_amount),
              current_amount: Number(goal.current_amount),
              category: goal.category,
              target_date: goal.target_date
            });
          }
        }

        // Import subs
        if (parsed.subscriptions) {
          for (const sub of parsed.subscriptions) {
            await supabase.from('subscriptions').upsert({
              id: sub.id,
              user_id: user.id,
              name: sub.name,
              amount: Number(sub.amount),
              category: sub.category,
              billing_date: Number(sub.billing_date),
              is_active: sub.is_active
            });
          }
        }

        await loadUserData(user.id);
      } else {
        const cleanTxs = parsed.transactions.map(t => ({
          id: t.id || Math.random().toString(36).substr(2, 9),
          type: t.type,
          category: t.category,
          amount: Number(t.amount),
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || '',
          user_id: user.id,
          created_at: t.created_at || new Date().toISOString()
        }));

        const mergedTxs = [...cleanTxs, ...transactions].filter(
          (value, index, self) => self.findIndex(t => t.id === value.id) === index
        );

        const mergedBudgets = { ...budgets, ...(parsed.budgets || {}) };
        const mergedGoals = [...(parsed.goals || []), ...goals].filter(
          (value, index, self) => self.findIndex(g => g.id === value.id) === index
        );
        const mergedSubs = [...(parsed.subscriptions || []), ...subscriptions].filter(
          (value, index, self) => self.findIndex(s => s.id === value.id) === index
        );

        setTransactions(mergedTxs);
        setBudgets(mergedBudgets);
        setGoals(mergedGoals);
        setSubscriptions(mergedSubs);

        localStorage.setItem(`finance_txs_${user.id}`, JSON.stringify(mergedTxs));
        localStorage.setItem(`finance_budgets_${user.id}`, JSON.stringify(mergedBudgets));
        localStorage.setItem(`finance_goals_${user.id}`, JSON.stringify(mergedGoals));
        localStorage.setItem(`finance_subs_${user.id}`, JSON.stringify(mergedSubs));
      }
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // 7. GOALS ACTIONS
  const addGoal = async (title, targetAmount, category, targetDate) => {
    const newGoal = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      title,
      target_amount: Number(targetAmount),
      current_amount: 0,
      category,
      target_date: targetDate,
      created_at: new Date().toISOString()
    };

    if (storageMode === 'supabase') {
      try {
        const { data, error } = await supabase.from('goals').insert([newGoal]).select().single();
        if (error) throw error;
        setGoals(prev => [data, ...prev]);
      } catch (err) {
        console.warn('Supabase insert goal failed, saving locally:', err);
        saveGoalLocally(newGoal);
      }
    } else {
      saveGoalLocally(newGoal);
    }
    showToast(`Savings goal "${title}" created!`, 'success');
  };

  const saveGoalLocally = (goal) => {
    const updated = [goal, ...goals];
    setGoals(updated);
    localStorage.setItem(`finance_goals_${user.id}`, JSON.stringify(updated));
  };

  const deleteGoal = async (id) => {
    showToast('Savings goal deleted.', 'info');
    if (storageMode === 'supabase') {
      try {
        await supabase.from('goals').delete().eq('id', id);
        setGoals(prev => prev.filter(g => g.id !== id));
      } catch (err) {
        console.warn('Supabase delete goal failed, deleting locally:', err);
        deleteGoalLocally(id);
      }
    } else {
      deleteGoalLocally(id);
    }
  };

  const deleteGoalLocally = (id) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    localStorage.setItem(`finance_goals_${user.id}`, JSON.stringify(updated));
  };

  const contributeToGoal = async (id, amount) => {
    const numericAmt = Number(amount);
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const updatedCurrent = Number(goal.current_amount) + numericAmt;

    // 1. Create a transaction for contribution
    const txPayload = {
      type: 'expense',
      category: 'other-expense',
      amount: numericAmt,
      date: new Date().toISOString().split('T')[0],
      description: `Savings goal contribution: ${goal.title}`
    };
    await addTransaction(txPayload);

    // 2. Update the goal current_amount
    if (storageMode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('goals')
          .update({ current_amount: updatedCurrent })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        setGoals(prev => prev.map(g => g.id === id ? data : g));
      } catch (err) {
        console.warn('Supabase update goal contribution failed, updating locally:', err);
        updateGoalLocally(id, updatedCurrent);
      }
    } else {
      updateGoalLocally(id, updatedCurrent);
    }
    showToast(`Contributed ${numericAmt} to "${goal.title}"!`, 'success');
  };

  const updateGoalLocally = (id, currentAmt) => {
    const updated = goals.map(g => g.id === id ? { ...g, current_amount: currentAmt } : g);
    setGoals(updated);
    localStorage.setItem(`finance_goals_${user.id}`, JSON.stringify(updated));
  };

  // 8. SUBSCRIPTIONS ACTIONS
  const addSubscription = async (name, amount, category, billingDate) => {
    const newSub = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      name,
      amount: Number(amount),
      category,
      billing_date: Number(billingDate) || 1, // Day of month (1-31)
      is_active: true,
      created_at: new Date().toISOString()
    };

    if (storageMode === 'supabase') {
      try {
        const { data, error } = await supabase.from('subscriptions').insert([newSub]).select().single();
        if (error) throw error;
        setSubscriptions(prev => [data, ...prev]);
      } catch (err) {
        console.warn('Supabase insert sub failed, saving locally:', err);
        saveSubLocally(newSub);
      }
    } else {
      saveSubLocally(newSub);
    }
    showToast(`Recurring bill "${name}" added!`, 'success');
  };

  const saveSubLocally = (sub) => {
    const updated = [sub, ...subscriptions];
    setSubscriptions(updated);
    localStorage.setItem(`finance_subs_${user.id}`, JSON.stringify(updated));
  };

  const deleteSubscription = async (id) => {
    showToast('Recurring bill removed.', 'info');
    if (storageMode === 'supabase') {
      try {
        await supabase.from('subscriptions').delete().eq('id', id);
        setSubscriptions(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.warn('Supabase delete sub failed, deleting locally:', err);
        deleteSubLocally(id);
      }
    } else {
      deleteSubLocally(id);
    }
  };

  const deleteSubLocally = (id) => {
    const updated = subscriptions.filter(s => s.id !== id);
    setSubscriptions(updated);
    localStorage.setItem(`finance_subs_${user.id}`, JSON.stringify(updated));
  };

  const paySubscription = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    // Log transaction
    const txPayload = {
      type: 'expense',
      category: sub.category,
      amount: sub.amount,
      date: new Date().toISOString().split('T')[0],
      description: `Recurring payment: ${sub.name}`
    };
    await addTransaction(txPayload);
  };

  // 7. RULE ENGINE FOR GAMIFIED ACHIEVEMENTS
  const runAchievementChecks = () => {
    const list = [];
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');

    // Achievement 1: First Step
    if (transactions.length > 0) {
      list.push({
        id: 'first-step',
        title: 'First Step',
        desc: 'Log your first transaction.',
        icon: 'Award',
        color: '#3B82F6'
      });
    }

    // Achievement 2: Saver Mindset
    if (incomes.some(i => i.amount >= 1000)) {
      list.push({
        id: 'saver-mindset',
        title: 'Saver Mindset',
        desc: 'Log a single income transaction over 1,000.',
        icon: 'TrendingUp',
        color: '#10B981'
      });
    }

    // Achievement 3: Category King
    if (Object.keys(budgets).length >= 3) {
      list.push({
        id: 'category-king',
        title: 'Budget Planner',
        desc: 'Set custom budgets for at least 3 categories.',
        icon: 'PieChart',
        color: '#8B5CF6'
      });
    }

    // Achievement 4: Wealth Builder
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;
    if (netSavings >= 5000) {
      list.push({
        id: 'wealth-builder',
        title: 'Wealth Builder',
        desc: 'Accumulate over 5,000 in net positive savings.',
        icon: 'Shield',
        color: '#F59E0B'
      });
    }

    // Achievement 5: Budget Master (if they have budgets and stay under them)
    if (Object.keys(budgets).length > 0) {
      const exceeded = Object.keys(budgets).some(cat => {
        const catSpent = expenses
          .filter(e => e.category === cat)
          .reduce((sum, e) => sum + e.amount, 0);
        return catSpent > budgets[cat];
      });

      if (!exceeded && transactions.length >= 5) {
        list.push({
          id: 'budget-master',
          title: 'Budget Master',
          desc: 'Keep all category spendings well within set budgets.',
          icon: 'CheckCircle',
          color: '#EC4899'
        });
      }
    }

    setAchievements(list);
  };

  // 8. DYNAMIC AI SAVINGS COACH INSIGHTS
  const generateAiTips = () => {
    const tips = [];
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    if (transactions.length === 0) {
      tips.push({
        type: 'info',
        message: 'Welcome! Add your first income or expense to generate financial coach advice.'
      });
      setAiTips(tips);
      return;
    }

    // Tip 1: Overall Budget Warning
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, i) => sum + i.amount, 0);
      
    if (totalIncome > 0) {
      const burnRate = (totalExpense / totalIncome) * 100;
      if (burnRate > 80) {
        tips.push({
          type: 'warning',
          message: `Alert: You've spent ${burnRate.toFixed(0)}% of your total income. Try pausing non-essential shopping to build reserves.`
        });
      } else if (burnRate < 40 && expenses.length > 0) {
        tips.push({
          type: 'success',
          message: `Superb! You're saving ${(100 - burnRate).toFixed(0)}% of your income. Consider routing some of these savings to investments.`
        });
      }
    }

    // Tip 2: Category Limit Warning
    Object.keys(budgets).forEach(cat => {
      const limit = budgets[cat];
      const spent = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
      const ratio = spent / limit;

      const catName = CATEGORIES.expense.find(c => c.id === cat)?.name || cat;

      if (ratio >= 1.0) {
        tips.push({
          type: 'danger',
          message: `Budget Exceeded: You have spent ${spent} in ${catName}, surpassing your budget limit of ${limit}!`
        });
      } else if (ratio >= 0.8) {
        tips.push({
          type: 'warning',
          message: `Budget Warning: You have used ${(ratio * 100).toFixed(0)}% of your ${limit} budget for ${catName}.`
        });
      }
    });

    // Tip 3: Categorized Savings Focus
    const catTotals = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    let topCategory = null;
    let maxSpend = 0;
    Object.keys(catTotals).forEach(cat => {
      if (catTotals[cat] > maxSpend) {
        maxSpend = catTotals[cat];
        topCategory = cat;
      }
    });

    if (topCategory && maxSpend > 0) {
      const catName = CATEGORIES.expense.find(c => c.id === topCategory)?.name || topCategory;
      const pct = totalExpense > 0 ? ((maxSpend / totalExpense) * 100).toFixed(0) : 0;
      if (pct > 30) {
        tips.push({
          type: 'info',
          message: `Insight: ${catName} is your largest expense category, making up ${pct}% of your total outflow. Cooking at home or scaling down transit costs could yield fast savings.`
        });
      }
    }

    setAiTips(tips);
  };

  const getWellnessScore = () => {
    let score = 300;
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    // 1. Savings Rate (up to 200 points)
    if (totalIncome > 0) {
      const savingsRate = (totalIncome - totalExpense) / totalIncome;
      if (savingsRate >= 0.4) score += 200;
      else if (savingsRate >= 0.2) score += 150;
      else if (savingsRate >= 0.1) score += 100;
      else if (savingsRate >= 0) score += 50;
    }

    // 2. Budget Adherence (up to 150 points)
    const budgetCategories = Object.keys(budgets);
    if (budgetCategories.length > 0) {
      let exceededCount = 0;
      budgetCategories.forEach(cat => {
        const spent = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
        if (spent > budgets[cat]) exceededCount++;
      });
      if (exceededCount === 0) score += 150;
      else if (exceededCount === 1) score += 80;
      else if (exceededCount === 2) score += 40;
    } else {
      score += 75; // neutral bump if no budgets set
    }

    // 3. Goals Progress (up to 100 points)
    if (goals.length > 0) {
      const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
      const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
      if (totalTarget > 0) {
        const progress = totalCurrent / totalTarget;
        score += Math.min(Math.floor(progress * 100), 100);
      }
    } else {
      score += 30; // small neutral bump
    }

    // 4. Tracking Consistency (up to 100 points)
    if (transactions.length >= 15) score += 100;
    else if (transactions.length >= 8) score += 75;
    else if (transactions.length >= 3) score += 50;
    else if (transactions.length > 0) score += 25;

    return Math.min(score, 850);
  };

  return (
    <FinanceContext.Provider value={{
      user,
      transactions,
      budgets,
      currency,
      loading,
      storageMode,
      setStorageMode,
      achievements,
      aiTips,
      activeToast,
      showToast,
      goals,
      addGoal,
      deleteGoal,
      contributeToGoal,
      subscriptions,
      addSubscription,
      deleteSubscription,
      paySubscription,
      getWellnessScore,
      login,
      signup,
      logout,
      resetPassword,
      updatePassword,
      isRecovering,
      setIsRecovering,
      addTransaction,
      editTransaction,
      deleteTransaction,
      updateBudget,
      deleteBudget,
      exportData,
      importData,
      setCurrency
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);

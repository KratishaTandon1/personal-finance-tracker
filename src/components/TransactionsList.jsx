import React, { useState } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  Upload, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export const TransactionsList = ({ onEditTransaction, onOpenAddModal }) => {
  const { 
    transactions, 
    deleteTransaction, 
    currency, 
    exportData, 
    importData 
  } = useFinance();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Backup file state
  const [importStatus, setImportStatus] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // 1. Currency formatting helper
  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 2. Clear Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterCategory('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // 3. Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description
      ? tx.description.toLowerCase().includes(searchTerm.toLowerCase())
      : searchTerm === '';
      
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && tx.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && tx.date <= endDate;
    }

    return matchesSearch && matchesType && matchesCategory && matchesDate;
  });

  // 4. Paginate
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 5. Backup upload handler
  const handleImportFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus({ type: 'loading', msg: 'Importing data...' });
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = await importData(event.target.result);
      if (result.success) {
        setImportStatus({ type: 'success', msg: 'Backup imported successfully!' });
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus({ type: 'error', msg: `Import failed: ${result.error}` });
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Action Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            className="btn-primary" 
            style={{ width: 'auto', padding: '10px 18px', fontSize: '14px' }}
            onClick={onOpenAddModal}
          >
            <Plus size={16} /> Add Transaction
          </button>
          
          <button 
            type="button"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={exportData}
          >
            <Download size={14} /> Backup JSON
          </button>

          <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
            <Upload size={14} /> Import JSON
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={handleImportFileChange}
            />
          </label>
        </div>

        {importStatus && (
          <div className={`coach-tip-card ${importStatus.type === 'loading' ? 'info' : importStatus.type}`} style={{ padding: '8px 16px', margin: 0, fontSize: '12px' }}>
            <span>{importStatus.msg}</span>
          </div>
        )}
      </div>

      {/* 2. Filter Grid Panel */}
      <div className="filter-panel">
        <div className="filter-group">
          <label htmlFor="search">Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              id="search"
              type="text" 
              placeholder="Search memo..." 
              className="input-field" 
              style={{ paddingLeft: '34px', paddingY: '8px', fontSize: '13px' }}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="type">Type</label>
          <select 
            id="type"
            className="select-field" 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setFilterCategory('all'); setCurrentPage(1); }}
          >
            <option value="all">All Transactions</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="cat">Category</label>
          <select 
            id="cat"
            className="select-field" 
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Categories</option>
            {filterType !== 'expense' && CATEGORIES.income.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {filterType !== 'income' && CATEGORIES.expense.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label htmlFor="start">Start Date</label>
            <input 
              id="start"
              type="date" 
              className="input-field" 
              style={{ padding: '8px 10px', fontSize: '12px' }}
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div>
            <label htmlFor="end">End Date</label>
            <input 
              id="end"
              type="date" 
              className="input-field" 
              style={{ padding: '8px 10px', fontSize: '12px' }}
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Reset filters shortcut if filters are active */}
      {(searchTerm || filterType !== 'all' || filterCategory !== 'all' || startDate || endDate) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-12px' }}>
          <button 
            type="button" 
            className="btn-icon" 
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
            onClick={handleResetFilters}
          >
            <Filter size={12} /> Clear Filter Criteria
          </button>
        </div>
      )}

      {/* 3. Transaction Table List */}
      <div className="panel">
        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '16px' }}>No records found</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your filters or search keyword, or log a new transaction.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="tx-table-container">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Memo</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th style={{ width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx) => {
                    const isInc = tx.type === 'income';
                    const categoryList = isInc ? CATEGORIES.income : CATEGORIES.expense;
                    const catInfo = categoryList.find(c => c.id === tx.category) || { name: tx.category, color: '#9CA3AF' };

                    return (
                      <tr key={tx.id} className="tx-row">
                        <td>{tx.date}</td>
                        <td>
                          <div className="tx-category-tag">
                            <span className="category-dot" style={{ backgroundColor: catInfo.color }}></span>
                            <span>{catInfo.name}</span>
                          </div>
                        </td>
                        <td style={{ color: tx.description ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {tx.description || 'n/a'}
                        </td>
                        <td>
                          <span className={`tx-type-badge ${tx.type}`}>
                            {isInc ? 'Inflow' : 'Outflow'}
                          </span>
                        </td>
                        <td>
                          <span className={`amount-text ${tx.type}`}>
                            {isInc ? '+' : '-'}{formatMoney(tx.amount)}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              type="button"
                              className="btn-icon edit" 
                              title="Edit transaction"
                              onClick={() => onEditTransaction(tx)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              type="button"
                              className="btn-icon delete" 
                              title="Delete transaction"
                              onClick={() => deleteTransaction(tx.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <span>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} items
                </span>
                
                <div className="pagination-buttons">
                  <button 
                    type="button"
                    className="btn-secondary" 
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Prev
                  </button>
                  <button 
                    type="button"
                    className="btn-secondary" 
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

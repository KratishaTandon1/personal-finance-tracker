import React, { useState, useEffect } from 'react';
import { useFinance, CATEGORIES } from '../context/FinanceContext';
import { X } from 'lucide-react';
import Tesseract from 'tesseract.js';

export const TransactionModal = ({ isOpen, onClose, transactionToEdit }) => {
  const { addTransaction, editTransaction, currency } = useFinance();
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [customFileUrl, setCustomFileUrl] = useState(null);

  const formatMoney = (val) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '$';
    return `${symbol}${Number(val).toFixed(2)}`;
  };

  const SAMPLE_RECEIPTS = [
    { id: 'starbucks', name: 'Starbucks Coffee', amount: 14.50, category: 'food', date: new Date().toISOString().split('T')[0], url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80', desc: 'Cappuccino & Muffin' },
    { id: 'uber', name: 'Uber Ride', amount: 32.40, category: 'transport', date: new Date().toISOString().split('T')[0], url: 'https://images.unsplash.com/photo-1510605395823-530474d7490f?w=400&q=80', desc: 'Trip to Airport' },
    { id: 'walmart', name: 'Walmart Store', amount: 118.20, category: 'shopping', date: new Date().toISOString().split('T')[0], url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&q=80', desc: 'Household groceries' }
  ];

  // Pre-fill fields if we are editing an existing transaction
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
      setAmount(transactionToEdit.amount);
      setDate(transactionToEdit.date);
      setDescription(transactionToEdit.description || '');
    } else {
      setType('expense');
      setCategory(CATEGORIES.expense[0]?.id || '');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
    }
    setError('');
    setShowScanner(false);
    setScanResult(null);
    setSelectedSample(null);
    setCustomFileUrl(null);
    setScanProgress('');
  }, [transactionToEdit, isOpen]);

  // Update default category when transaction type changes
  useEffect(() => {
    if (!transactionToEdit && isOpen) {
      const defaultCat = CATEGORIES[type][0]?.id || '';
      setCategory(defaultCat);
    }
  }, [type, transactionToEdit, isOpen]);

  if (!isOpen) return null;

  // Heuristic parser for raw text extracted from OCR
  const parseReceiptText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // 1. Merchant Heuristic (Look for non-numeric lines in first 6 lines)
    let merchant = 'Unknown Merchant';
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      if (
        !/\d{4,}/.test(line) && 
        !/date|time|tax|tel|invoice|phone|bill|ship|to:|due:|cagr|cushion|cushon/i.test(line) && 
        line.length > 3
      ) {
        merchant = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
        // Capitalize words nicely
        merchant = merchant.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        break;
      }
    }

    // 2. Amount Heuristic
    const cleanNumber = (str) => {
      let s = str.replace(/[$€₹\s]/g, '');
      if (/\.\d{2}$/.test(s)) {
        s = s.replace(/,/g, ''); // strip thousand separator commas
      } else if (/,\d{2}$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.'); // swap European format
      }
      return parseFloat(s);
    };

    // Gather all lines containing keywords "total", "balance due", "due", "subtotal", "amt", "payment"
    const keywordLines = lines.filter(l => /total|due|balance|sub\s*total|payment|amount/i.test(l));
    let amountCandidates = [];

    keywordLines.forEach(line => {
      const matches = line.match(/\b\d+[\d\s\.,]*\b/g) || [];
      matches.forEach(m => {
        const val = cleanNumber(m);
        if (!isNaN(val) && val > 0 && !line.includes('%') && val < 100000) {
          amountCandidates.push(val);
        }
      });
    });

    let amount = 0.00;
    if (amountCandidates.length > 0) {
      amount = Math.max(...amountCandidates);
    } else {
      // Fallback: search entire document for numbers matching \d+[\.,]\d{2}
      const genericRegex = /(?:[$€₹]|\b)\s*(\d+[\.,]\d{2})\b/g;
      let match;
      const allAmounts = [];
      while ((match = genericRegex.exec(text)) !== null) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(val) && val > 0 && val < 5000) {
          allAmounts.push(val);
        }
      }
      if (allAmounts.length > 0) {
        const sorted = allAmounts.sort((a, b) => b - a);
        amount = sorted[0];
      }
    }

    // 3. Date Heuristic
    const extractDate = (text) => {
      // Numeric formats: MM/DD/YYYY, YYYY-MM-DD
      const dateRegex = /\b(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})\b/;
      const match = dateRegex.exec(text);
      if (match) {
        const part1 = match[1];
        const part2 = match[2];
        const part3 = match[3];
        if (part1.length === 4) {
          return `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
        } else if (part3.length === 4) {
          return `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
      }

      // Word month formats: "05 Aug 2026", "August 5, 2026"
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthRegex = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i;
      const textMatch = monthRegex.exec(text);
      if (textMatch) {
        const day = textMatch[1].padStart(2, '0');
        const monthStr = textMatch[2].toLowerCase();
        const year = textMatch[3];
        const monthIdx = monthNames.indexOf(monthStr) + 1;
        const month = monthIdx.toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      const monthFirstRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b,?\s+(\d{4})\b/i;
      const textMatch2 = monthFirstRegex.exec(text);
      if (textMatch2) {
        const monthStr = textMatch2[1].toLowerCase();
        const day = textMatch2[2].padStart(2, '0');
        const year = textMatch2[3];
        const monthIdx = monthNames.indexOf(monthStr) + 1;
        const month = monthIdx.toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return new Date().toISOString().split('T')[0];
    };

    const dateStr = extractDate(text);

    // 4. Category Heuristic
    let category = 'shopping';
    const textLower = text.toLowerCase();
    const mappings = {
      food: ['starbucks', 'coffee', 'cafe', 'restaurant', 'food', 'dining', 'grill', 'pizza', 'burger', 'mcdonald', 'eats', 'bakery', 'kitchen', 'grocery', 'groceries'],
      transport: ['uber', 'lyft', 'taxi', 'cab', 'ride', 'gas', 'fuel', 'chevron', 'shell', 'petrol', 'flight', 'airline', 'transit', 'car', 'auto'],
      utilities: ['electric', 'power', 'water', 'utility', 'phone', 'internet', 'comcast', 'netflix', 'spotify', 'bill', 'subscription'],
      rent: ['rent', 'lease', 'apartment', 'housing', 'mortgage'],
      shopping: ['target', 'walmart', 'amazon', 'store', 'supermarket', 'shop', 'shopping', 'retail', 'clothing', 'apparel', 'costco', 'electronics', 'laptop', 'computer', 'device', 'camera', 'tv', 'phone', 'gadget', 'equipment', 'hub'],
      health: ['doctor', 'dentist', 'clinic', 'hospital', 'pharmacy', 'cvs', 'walgreens', 'health', 'medical', 'wellness', 'gym', 'fitness', 'tracker']
    };

    for (const [cat, words] of Object.entries(mappings)) {
      if (words.some(w => textLower.includes(w))) {
        category = cat;
        break;
      }
    }

    return {
      name: merchant,
      amount,
      date: dateStr,
      category,
      type: 'expense',
      desc: 'OCR Text Parse'
    };
  };

  // Run real Tesseract.js OCR on local files
  const handleCustomFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    const fileUrl = URL.createObjectURL(file);
    setCustomFileUrl(fileUrl);
    setSelectedSample({ name: file.name, url: fileUrl });
    setIsScanning(true);
    setScanResult(null);
    setScanProgress('Initializing Tesseract OCR worker...');

    Tesseract.recognize(
      file,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(`Analyzing Layout: ${Math.round(m.progress * 100)}%`);
          } else {
            // Clean up status texts
            setScanProgress(m.status.charAt(0).toUpperCase() + m.status.slice(1).replace(/_/g, ' '));
          }
        }
      }
    ).then(({ data: { text } }) => {
      setIsScanning(false);
      setScanProgress('');
      console.log("=== Tesseract Raw OCR Extracted Text ===");
      console.log(text);

      if (!text || text.trim().length === 0) {
        setError('Tesseract could not identify any characters in this image. Please upload a clearer copy.');
        return;
      }
      
      const parsedResult = parseReceiptText(text);
      setScanResult({
        name: parsedResult.name,
        amount: parsedResult.amount,
        date: parsedResult.date,
        category: parsedResult.category,
        type: parsedResult.type || 'expense',
        desc: parsedResult.name,
        isCustom: true,
        rawText: text
      });
    }).catch(err => {
      console.error(err);
      setError('OCR parsing failed. Ensure file is a readable image (JPG, PNG).');
      setIsScanning(false);
      setScanProgress('');
    });
  };

  // Preloaded template scanner (fast mock to skip network and CORS issues)
  const handleStartScanSample = (sample) => {
    setSelectedSample(sample);
    setIsScanning(true);
    setScanResult(null);
    setScanProgress('Analyzing template coordinates...');
    
    setTimeout(() => {
      setScanProgress('Compiling receipt data schema...');
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress('');
        setScanResult({
          ...sample,
          type: 'expense',
          rawText: `--- SIMULATED RECEIPT ---
Merchant: ${sample.name}
Description: ${sample.desc}
Date: ${sample.date}
TOTAL AMOUNT: $${sample.amount.toFixed(2)}
-------------------------`
        });
      }, 1000);
    }, 1000);
  };

  const handleApplyScan = () => {
    if (!scanResult) return;
    setAmount(scanResult.amount.toString());
    setCategory(scanResult.category);
    setType(scanResult.type || 'expense');
    setDescription(scanResult.isCustom ? scanResult.name : `${scanResult.name} (${scanResult.desc})`);
    setDate(scanResult.date);
    setShowScanner(false);
    setScanResult(null);
    setSelectedSample(null);
    setCustomFileUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!category) {
      setError('Please select a category');
      return;
    }

    const payload = {
      type,
      category,
      amount: parsedAmount,
      date,
      description: description.trim()
    };

    try {
      if (transactionToEdit) {
        await editTransaction(transactionToEdit.id, payload);
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save transaction');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {showScanner 
              ? '📷 Receipt Scanner' 
              : (transactionToEdit ? 'Edit Transaction' : 'Add New Transaction')}
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {showScanner ? (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Extract transaction metadata from receipts using OCR:</span>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '11px' }} 
                onClick={() => { setShowScanner(false); setSelectedSample(null); setCustomFileUrl(null); setError(''); }}
                disabled={isScanning}
              >
                Back
              </button>
            </div>

            {error && (
              <div className="coach-tip-card danger" style={{ padding: '10px 14px', margin: 0 }}>
                <span>{error}</span>
              </div>
            )}

            {!selectedSample ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {SAMPLE_RECEIPTS.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '10px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', height: '110px', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}
                      onClick={() => handleStartScanSample(r)}
                    >
                      <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{r.name}</strong>
                      <span style={{ color: 'var(--color-expense)', fontWeight: 'bold' }}>{formatMoney(r.amount)}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{r.desc}</span>
                    </button>
                  ))}
                </div>
                
                {/* Real File Upload Area */}
                <label 
                  className="scanner-area" 
                  style={{ 
                    height: '110px', 
                    fontSize: '12px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    cursor: 'pointer', 
                    border: '2px dashed var(--color-accent-glow)', 
                    borderRadius: '10px', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'rgba(6, 182, 212, 0.01)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-accent-glow)'}
                >
                  <span style={{ fontWeight: '600', color: 'var(--color-accent)' }}>📤 Upload Receipt/Invoice Image</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Supports JPG, JPEG, PNG (Processed locally in browser)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleCustomFileChange} 
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                <div className="receipt-img-wrapper" style={{ width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '10px', maxHeight: '200px' }}>
                  <img 
                    src={selectedSample.url} 
                    alt="Receipt preview" 
                    className="receipt-img" 
                    style={{ filter: isScanning ? 'brightness(0.6)' : 'none', width: '100%', objectFit: 'cover' }} 
                  />
                  {isScanning && <div className="laser-line"></div>}
                </div>

                {isScanning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', animation: 'spin 1s linear infinite' }}></div>
                      <span>Scanning layout & compiling OCR parameters...</span>
                    </div>
                    {scanProgress && (
                      <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'bold' }}>{scanProgress}</span>
                    )}
                  </div>
                ) : scanResult ? (
                  <div className="panel" style={{ width: '100%', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-accent-glow)', borderRadius: 'var(--radius-md)', margin: 0 }}>
                    <div style={{ color: 'var(--color-income)', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>✓ OCR Analysis Successful</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Feel free to adjust any fields below:</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Merchant Field */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Merchant</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          style={{ padding: '6px 10px', fontSize: '12px' }} 
                          value={scanResult.name} 
                          onChange={(e) => setScanResult({ ...scanResult, name: e.target.value })}
                        />
                      </div>

                      {/* Amount Field */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Amount</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="input-field" 
                          style={{ padding: '6px 10px', fontSize: '12px' }} 
                          value={scanResult.amount} 
                          onChange={(e) => setScanResult({ ...scanResult, amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      {/* Date Field */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Date</label>
                        <input 
                          type="date" 
                          className="input-field" 
                          style={{ padding: '6px 10px', fontSize: '12px' }} 
                          value={scanResult.date} 
                          onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                        />
                      </div>

                      {/* Category Field */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Category</label>
                        <select 
                          className="select-field" 
                          style={{ padding: '6px 10px', fontSize: '12px' }} 
                          value={scanResult.category} 
                          onChange={(e) => setScanResult({ ...scanResult, category: e.target.value })}
                        >
                          {CATEGORIES[scanResult.type || 'expense'].map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Type Field (Expense vs Income) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Type</label>
                        <select 
                          className="select-field" 
                          style={{ padding: '6px 10px', fontSize: '12px' }} 
                          value={scanResult.type || 'expense'} 
                          onChange={(e) => {
                            const newType = e.target.value;
                            const defaultCat = CATEGORIES[newType][0]?.id || '';
                            setScanResult({ ...scanResult, type: newType, category: defaultCat });
                          }}
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </div>
                    </div>

                    <button type="button" className="btn-primary" style={{ marginTop: '4px', padding: '8px 16px', fontSize: '13px' }} onClick={handleApplyScan}>Apply to Form</button>

                    {/* Collapsible raw text for advanced debugging */}
                    {scanResult.rawText && (
                      <details style={{ marginTop: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '10px', width: '100%' }}>
                        <summary style={{ fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none', textAlign: 'left' }}>Show Raw Extracted Text</summary>
                        <textarea 
                          readOnly 
                          value={scanResult.rawText} 
                          style={{ width: '100%', height: '80px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--text-secondary)', padding: '6px', fontSize: '10px', fontFamily: 'monospace', resize: 'none', outline: 'none' }}
                        />
                      </details>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div className="coach-tip-card danger" style={{ padding: '10px 14px', margin: 0 }}>
                  <span>{error}</span>
                </div>
              )}

              {!transactionToEdit && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px dashed var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(6, 182, 212, 0.02)', fontWeight: '600' }}
                  onClick={() => setShowScanner(true)}
                >
                  📷 Scan Receipt to Auto-Fill
                </button>
              )}

              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${type === 'expense' ? 'active' : ''}`}
                  style={{ borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}
                  onClick={() => setType('expense')}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${type === 'income' ? 'active' : ''}`}
                  style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                  onClick={() => setType('income')}
                >
                  Income
                </button>
              </div>

              <div className="auth-input-group">
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="input-field"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  className="select-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {CATEGORIES[type].map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="auth-input-group">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="description">Description / Notes</label>
                <input
                  id="description"
                  type="text"
                  placeholder="e.g., Starbucks, Rent, Salary..."
                  className="input-field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
                {transactionToEdit ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes laserSweep {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .laser-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: #10b981;
          box-shadow: 0 0 10px #10b981, 0 0 20px #10b981;
          animation: laserSweep 2s ease-in-out infinite;
          z-index: 5;
        }
      `}</style>
    </div>
  );
};

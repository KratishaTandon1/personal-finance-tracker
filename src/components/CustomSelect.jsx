import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const CustomSelect = ({ id, value, onChange, options, style, selectStyle, triggerStyle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  return (
    <div 
      id={id}
      ref={containerRef} 
      className="custom-select-container" 
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div 
        role="button"
        tabIndex={0}
        className="custom-select-trigger select-field"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
          }
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '10px 14px',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxSizing: 'border-box',
          ...(isOpen ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 8px rgba(139, 92, 246, 0.2)' } : {}),
          ...triggerStyle
        }}
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-muted)', 
            transition: 'transform 0.2s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            marginLeft: '8px',
            flexShrink: 0
          }} 
        />
      </div>

      {isOpen && (
        <div 
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
            zIndex: 1000,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px 0',
            boxSizing: 'border-box'
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  fontWeight: isSelected ? '600' : 'normal',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span style={{ fontSize: '10px', color: 'var(--color-primary)' }}>●</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';

interface Option {
  id: string;
  name: string;
  subtitle?: string; // For showing prices or details
}

interface SearchableSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  label, options, value, onChange, placeholder = "Select...", disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync the display text with the selected value
  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) {
      setSearch(selected.name);
    } else {
      setSearch('');
    }
  }, [value, options]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert search text to currently selected item if user didn't pick anything new
        const selected = options.find(o => o.id === value);
        setSearch(selected ? selected.name : '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  // Filter options based on user typing
  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex flex-col gap-1" ref={wrapperRef}>
      <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
      
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          className={`w-full p-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-1 focus:ring-primary outline-none font-medium text-slate-700 dark:text-slate-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={search}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearch(''); // Clear text so they can see all options immediately
            }
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
        />
        
        {/* Dropdown Arrow Icon */}
        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
           <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
        </div>

        {/* The Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-slate-400 italic text-center">No matches found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearch(option.name);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                >
                  <div className="font-bold text-slate-700 dark:text-slate-200">{option.name}</div>
                  {option.subtitle && (
                    <div className="text-xs text-slate-400">{option.subtitle}</div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;
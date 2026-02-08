import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, X, Pill, ChevronDown, AlertTriangle, Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { 
  bnfMedicationDatabase, 
  bnfCategories, 
  searchMedications,
  type BNFMedication 
} from '../../data/bnfMedicationDatabase';

interface MedicationTypeaheadProps {
  value: string;
  onChange: (medication: BNFMedication | null, customName?: string) => void;
  onCategoryChange?: (category: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  showCategoryFilter?: boolean;
  selectedCategory?: string;
}

// Flatten all medications with category info for searching
const getAllMedications = (): (BNFMedication & { categoryId: string; categoryName: string; subcategoryId: string; subcategoryName: string })[] => {
  const allMeds: (BNFMedication & { categoryId: string; categoryName: string; subcategoryId: string; subcategoryName: string })[] = [];
  
  for (const [categoryKey, category] of Object.entries(bnfMedicationDatabase)) {
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        for (const med of subcategory.medications) {
          allMeds.push({
            ...med,
            categoryId: categoryKey,
            categoryName: category.name,
            subcategoryId: subcategory.id,
            subcategoryName: subcategory.name,
          });
        }
      }
    }
  }
  
  return allMeds;
};

// Get unique parent categories for filter dropdown
const getParentCategories = () => {
  const parentSet = new Set<string>();
  const parents: { value: string; label: string }[] = [];
  
  for (const [key, category] of Object.entries(bnfMedicationDatabase)) {
    if (!parentSet.has(key)) {
      parentSet.add(key);
      parents.push({ value: key, label: category.name });
    }
  }
  
  return parents;
};

export default function MedicationTypeahead({
  value,
  onChange,
  onCategoryChange,
  placeholder = 'Type to search medications...',
  className = '',
  disabled = false,
  error,
  showCategoryFilter = true,
  selectedCategory = '',
}: MedicationTypeaheadProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState(selectedCategory);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allMedications = useMemo(() => getAllMedications(), []);
  const parentCategories = useMemo(() => getParentCategories(), []);

  // Filter medications based on search query and category
  const filteredMedications = useMemo(() => {
    let results = allMedications;
    
    // Filter by category if selected
    if (categoryFilter) {
      results = results.filter(med => med.categoryId === categoryFilter);
    }
    
    // Filter by search query
    if (inputValue.trim()) {
      const query = inputValue.toLowerCase().trim();
      results = results.filter(med => 
        med.name.toLowerCase().includes(query) ||
        med.genericName.toLowerCase().includes(query) ||
        med.subcategoryName.toLowerCase().includes(query)
      );
    }
    
    // Limit to 50 results for performance
    return results.slice(0, 50);
  }, [allMedications, inputValue, categoryFilter]);

  // Update input when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredMedications.length > 0) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredMedications.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleSelectMedication = useCallback((med: typeof filteredMedications[0]) => {
    setInputValue(med.name);
    setIsOpen(false);
    onChange(med);
    if (onCategoryChange) {
      onCategoryChange(med.categoryId);
    }
  }, [onChange, onCategoryChange]);

  const handleCustomMedication = useCallback(() => {
    if (inputValue.trim()) {
      setIsOpen(false);
      onChange(null, inputValue.trim());
    }
  }, [inputValue, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredMedications.length ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === filteredMedications.length && inputValue.trim()) {
          // "Use custom" option
          handleCustomMedication();
        } else if (filteredMedications[highlightedIndex]) {
          handleSelectMedication(filteredMedications[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const clearInput = () => {
    setInputValue('');
    onChange(null);
    inputRef.current?.focus();
  };

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setCategoryFilter(newCategory);
    setHighlightedIndex(0);
    if (onCategoryChange) {
      onCategoryChange(newCategory);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Category Filter */}
      {showCategoryFilter && (
        <div className="mb-2">
          <label className="label text-xs text-gray-500">Filter by Category (optional)</label>
          <select
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
            className="input text-sm"
            disabled={disabled}
          >
            <option value="">All Categories</option>
            {parentCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`input pl-9 pr-8 text-sm ${error ? 'border-red-500' : ''}`}
          autoComplete="off"
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Dropdown List */}
      <AnimatePresence>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-hidden">
            {/* Results count */}
            <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500 flex items-center justify-between">
              <span>
                {filteredMedications.length === 0 
                  ? 'No medications found' 
                  : `${filteredMedications.length}${filteredMedications.length === 50 ? '+' : ''} medications`}
              </span>
              {inputValue.trim() && (
                <span className="text-violet-600">Press Enter to use custom</span>
              )}
            </div>

            <ul ref={listRef} className="overflow-y-auto max-h-64">
              {filteredMedications.map((med, index) => (
                <li
                  key={`${med.categoryId}-${med.subcategoryId}-${med.name}-${index}`}
                  onClick={() => handleSelectMedication(med)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3 py-2 cursor-pointer flex items-start gap-3 ${
                    index === highlightedIndex 
                      ? 'bg-violet-50 text-violet-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Pill size={16} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{med.name}</span>
                      {med.renalAdjust && (
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" title="Requires renal adjustment" />
                      )}
                      {med.controlledDrug && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">CD</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {med.genericName} • {med.subcategoryName}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {med.doses.slice(0, 3).join(', ')}{med.doses.length > 3 ? '...' : ''}
                    </div>
                  </div>
                </li>
              ))}

              {/* Custom medication option */}
              {inputValue.trim() && (
                <li
                  onClick={handleCustomMedication}
                  onMouseEnter={() => setHighlightedIndex(filteredMedications.length)}
                  className={`px-3 py-2 cursor-pointer border-t ${
                    highlightedIndex === filteredMedications.length 
                      ? 'bg-violet-50 text-violet-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plus size={16} className="text-violet-500" />
                    <span className="text-sm">Use custom: <strong>"{inputValue}"</strong></span>
                  </div>
                </li>
              )}

              {/* Empty state */}
              {filteredMedications.length === 0 && !inputValue.trim() && (
                <li className="px-3 py-4 text-center text-gray-500 text-sm">
                  Start typing to search medications
                </li>
              )}
            </ul>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export a simpler version that just returns the selected medication info
export function useMedicationSelection() {
  const [selectedMedication, setSelectedMedication] = useState<BNFMedication | null>(null);
  const [customMedicationName, setCustomMedicationName] = useState<string>('');

  const handleMedicationChange = (med: BNFMedication | null, customName?: string) => {
    if (med) {
      setSelectedMedication(med);
      setCustomMedicationName('');
    } else if (customName) {
      setSelectedMedication(null);
      setCustomMedicationName(customName);
    } else {
      setSelectedMedication(null);
      setCustomMedicationName('');
    }
  };

  return {
    selectedMedication,
    customMedicationName,
    handleMedicationChange,
    medicationName: selectedMedication?.name || customMedicationName,
    genericName: selectedMedication?.genericName || customMedicationName,
    doses: selectedMedication?.doses || [],
    routes: selectedMedication?.routes || [],
    frequencies: selectedMedication?.frequency || [],
    maxDaily: selectedMedication?.maxDaily || '',
    renalAdjust: selectedMedication?.renalAdjust || false,
    isControlledDrug: selectedMedication?.controlledDrug || false,
    specialInstructions: selectedMedication?.specialInstructions || '',
  };
}

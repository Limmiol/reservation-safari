import React, { useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function FilterBar({
  searchPlaceholder = 'Search...',
  onSearchChange,
  filters = [],
  onFilterChange,
  onClearAll,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [expandedFilters, setExpandedFilters] = useState(false);

  const handleSearch = (value) => {
    setSearchValue(value);
    onSearchChange?.(value);
  };

  const handleFilterChange = (filterId, value) => {
    onFilterChange?.(filterId, value);
  };

  const activeFilterCount = filters.filter(f => f.value && f.value !== 'all').length;
  const hasActiveFilters = searchValue || activeFilterCount > 0;

  return (
    <div className="space-y-3 p-4 bg-card border border-border rounded-xl">
      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        {searchValue && (
          <button
            onClick={() => handleSearch('')}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter Pills - Compact view */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center gap-2">
              <Select value={filter.value || 'all'} onValueChange={(v) => handleFilterChange(filter.id, v)}>
                <SelectTrigger className="h-8 px-3 text-sm bg-muted/50 border-border hover:border-primary/30 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                handleSearch('');
                onClearAll?.();
              }}
              className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Active Filter Count Badge */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {activeFilterCount > 0 && `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`}
            {searchValue && activeFilterCount > 0 && ' • '}
            {searchValue && `searching: "${searchValue}"`}
          </span>
        </div>
      )}
    </div>
  );
}

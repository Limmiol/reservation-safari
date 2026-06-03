import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const searchTerm = q.toLowerCase();
    
    try {
      const [clients, bookings, packages] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Booking.list(),
        base44.entities.Package.list()
      ]);

      const clientResults = clients
        .filter(c => 
          c.full_name?.toLowerCase().includes(searchTerm) ||
          c.email?.toLowerCase().includes(searchTerm) ||
          c.phone?.includes(q)
        )
        .map(c => ({
          id: c.id,
          type: 'client',
          title: c.full_name,
          subtitle: c.email,
          path: `/clients/${c.id}`
        }));

      const bookingResults = bookings
        .filter(b => 
          b.booking_ref?.toLowerCase().includes(searchTerm) ||
          b.client_name?.toLowerCase().includes(searchTerm) ||
          b.package_name?.toLowerCase().includes(searchTerm)
        )
        .map(b => ({
          id: b.id,
          type: 'booking',
          title: b.booking_ref,
          subtitle: `${b.client_name} - ${b.package_name}`,
          path: `/bookings/${b.id}`
        }));

      const packageResults = packages
        .filter(p => 
          p.name?.toLowerCase().includes(searchTerm) ||
          p.destination?.toLowerCase().includes(searchTerm)
        )
        .map(p => ({
          id: p.id,
          type: 'package',
          title: p.name,
          subtitle: p.destination,
          path: `/packages`
        }));

      const allResults = [...clientResults, ...bookingResults, ...packageResults].slice(0, 8);
      setResults(allResults);
      setIsOpen(true);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].path);
          setQuery('');
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleResultClick = (result) => {
    navigate(result.path);
    setQuery('');
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, search]);

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md">
      <div className="glass rounded-full px-4 py-2.5 flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search clients, bookings, packages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="p-1 hover:bg-accent rounded-full"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {loading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className={cn(
                  'w-full px-4 py-3 text-left border-b border-border/50 last:border-b-0 transition-colors',
                  idx === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{result.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{result.subtitle}</p>
                  </div>
                  <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-1 ml-2 whitespace-nowrap">
                    {result.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && !loading && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-2xl shadow-xl p-4 text-center z-50">
          <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
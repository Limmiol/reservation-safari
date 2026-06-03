import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SHORTCUTS = [
  {
    group: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], alt: ['⌘', 'K'], label: 'Open Command Palette' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close modal / dialog' },
      { keys: ['/'], label: 'Focus global search' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { keys: ['G', 'D'], label: 'Go to Dashboard' },
      { keys: ['G', 'B'], label: 'Go to Bookings' },
      { keys: ['G', 'C'], label: 'Go to Clients' },
      { keys: ['G', 'Q'], label: 'Go to Quotes' },
      { keys: ['G', 'L'], label: 'Go to Safari Library' },
      { keys: ['G', 'S'], label: 'Go to Safari Quote Builder' },
    ],
  },
  {
    group: 'Interface',
    items: [
      { keys: ['Shift', 'D'], label: 'Toggle dark mode' },
      { keys: ['Shift', 'S'], label: 'Toggle sidebar' },
      { keys: ['↑', '↓'], label: 'Navigate lists' },
      { keys: ['↵'], label: 'Open / confirm selection' },
    ],
  },
];

function Kbd({ children }) {
  return (
    <kbd className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-muted text-foreground rounded border border-border shadow-[0_1px_0_0] shadow-black/5 min-w-[24px] inline-flex items-center justify-center">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted-foreground">Work faster with these shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {SHORTCUTS.map(section => (
              <div key={section.group}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  {section.group}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{it.label}</span>
                      <div className="flex items-center gap-1">
                        {it.keys.map((k, ki) => (
                          <React.Fragment key={ki}>
                            {ki > 0 && <span className="text-muted-foreground text-xs">+</span>}
                            <Kbd>{k}</Kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Press <Kbd>?</Kbd> anytime to show this panel.</span>
          <span>Press <Kbd>Esc</Kbd> to close.</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage the keyboard shortcuts modal + register global shortcuts.
 * - `?`          → open modal
 * - `Esc`        → close
 * - `/`          → focus first [data-global-search] input
 * - `Shift+D`    → toggle dark mode
 * - `G` then X   → navigation shortcuts (leader-key style)
 */
export function useKeyboardShortcuts(navigate) {
  const [open, setOpen] = useState(false);
  const [leader, setLeader] = useState(false);

  useEffect(() => {
    let leaderTimeout;

    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const navMap = {
      d: '/',
      b: '/bookings',
      c: '/clients',
      q: '/quotes',
      l: '/safari-library',
      s: '/safari-quote-builder',
    };

    const handler = (e) => {
      // Don't intercept while typing in form fields
      if (isTypingTarget(e.target)) return;

      // Leader chord: G, <key>
      if (leader && navMap[e.key.toLowerCase()]) {
        e.preventDefault();
        navigate?.(navMap[e.key.toLowerCase()]);
        setLeader(false);
        clearTimeout(leaderTimeout);
        return;
      }

      // Start leader chord
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setLeader(true);
        leaderTimeout = setTimeout(() => setLeader(false), 1200);
        return;
      }

      // "?" (Shift+/)
      if (e.key === '?') {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }

      // "/" focus global search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const el = document.querySelector('[data-global-search] input, input[placeholder*="Search"]');
        if (el) {
          e.preventDefault();
          el.focus();
        }
        return;
      }

      // Shift+D dark mode
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        // Only if no other modifier (avoid conflict with Ctrl+Shift+D)
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          const root = document.documentElement;
          const isDark = root.classList.contains('dark');
          if (isDark) {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
          } else {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          }
          window.dispatchEvent(new Event('storage'));
        }
        return;
      }

      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(leaderTimeout);
    };
  }, [navigate, leader, open]);

  return { open, setOpen, leader };
}

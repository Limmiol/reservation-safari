import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, CheckSquare, Square, Info } from 'lucide-react';
import { generatePackingList, exportPackingListPdf } from '@/lib/packingList';
import { getSiteConfig } from '@/lib/siteConfig';

/**
 * Interactive packing-list dialog. User can tick items (state is local) and
 * download a printable PDF.
 */
export default function PackingListDialog({ pkg, open, onClose }) {
  const { categories, notes } = useMemo(() => generatePackingList(pkg), [pkg]);
  const [checked, setChecked] = useState(new Set());

  const toggle = (key) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const total = categories.reduce((s, c) => s + c.items.length, 0);
  const done = checked.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (!pkg) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            Smart Packing List
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context strip */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{pkg.name}</span>
            <span>·</span>
            <span>{pkg.duration_days || '?'} days</span>
            <span>·</span>
            <span>{pkg.destination}</span>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{done} of {total} packed</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Notes */}
          {notes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Info className="w-3.5 h-3.5" />Trip notes
              </div>
              <ul className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5 list-disc pl-4">
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-5">
            {categories.map((cat) => (
              <section key={cat.name}>
                <h3 className="text-sm font-semibold text-[#0a3d62] dark:text-amber-300 uppercase tracking-wide mb-2">
                  {cat.name}
                </h3>
                <ul className="space-y-1.5">
                  {cat.items.map((item, idx) => {
                    const key = `${cat.name}::${idx}`;
                    const isChecked = checked.has(key);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          className={`group w-full flex items-start gap-2 text-left text-sm rounded-md px-2 py-1 hover:bg-muted/70 transition-colors ${isChecked ? 'text-muted-foreground' : ''}`}
                        >
                          {isChecked
                            ? <CheckSquare className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                            : <Square className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
                          <span className={isChecked ? 'line-through' : ''}>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
            <Button onClick={() => exportPackingListPdf(pkg, { siteConfig: getSiteConfig() })}>
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

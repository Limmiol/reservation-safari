import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Upload, FileText, FileSpreadsheet, Sparkles, Check, X, Loader2,
  AlertTriangle, Plus, Trash2, FileUp, Wand2, RefreshCw, Clipboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import CurrencySelect from '@/components/ui/CurrencySelect';
import { extractPackageFromFile, parsePackageFromText } from '@/lib/packageParser';

const EMPTY = {
  name: '', description: '', destination: '',
  duration_days: '', price_per_person: '', currency: 'USD',
  max_guests: '', includes: '', excludes: '',
  category: 'mid_range', status: 'active',
  image_url: '', itinerary_days: [],
};

export default function PackageImport() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [rowsQueue, setRowsQueue] = useState([]); // extra packages from multi-row excel
  const [dragOver, setDragOver] = useState(false);

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const all = [form, ...rowsQueue];
      const results = [];
      for (const p of all) {
        if (!p.name) continue;
        // Strip parser-internal fields before save.
        const { _raw_text, ...clean } = p;
        // Persist itinerary as a JSON string — that's what PackageItineraryEditor
        // expects when the edit dialog reopens, and matches existing DB shape.
        const itinerary = Array.isArray(clean.itinerary_days)
          ? JSON.stringify(clean.itinerary_days)
          : (clean.itinerary_days || '');
        const payload = {
          ...clean,
          duration_days:    clean.duration_days ? Number(clean.duration_days) : undefined,
          price_per_person: clean.price_per_person ? Number(clean.price_per_person) : undefined,
          max_guests:       clean.max_guests ? Number(clean.max_guests) : undefined,
          itinerary_days:   itinerary,
        };
        // Drop keys whose value is undefined so we never overwrite with null
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
        const created = await base44.entities.Package.create(payload);
        results.push(created);
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast({
        title: `${results.length} package${results.length === 1 ? '' : 's'} imported`,
        description: 'Review them on the Packages page.',
      });
      navigate('/packages');
    },
    onError: (err) => {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setParsing(true);
    setForm(EMPTY);
    setRowsQueue([]);
    setRawText('');
    try {
      const result = await extractPackageFromFile(f);
      const hydrate = (p) => {
        // Normalize itinerary_days to an array for in-form editing
        let it = p.itinerary_days;
        if (typeof it === 'string' && it.trim()) {
          try { it = JSON.parse(it); } catch { it = []; }
        }
        if (!Array.isArray(it)) it = [];
        return { ...EMPTY, ...p, itinerary_days: it };
      };
      if (result.kind === 'pdf') {
        setRawText(result.raw);
        setForm(hydrate(result.parsed));
      } else {
        const [first, ...rest] = result.allPackages || [];
        if (first) setForm(hydrate(first));
        setRowsQueue(rest.map(hydrate));
      }
      toast({
        title: 'Parsed successfully',
        description: result.kind === 'pdf'
          ? 'Fields extracted from PDF. Review and adjust before saving.'
          : `Found ${(result.allPackages || []).length} package row(s).`,
      });
    } catch (err) {
      toast({ title: 'Parse failed', description: err.message, variant: 'destructive' });
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const addItineraryDay = () => {
    setForm(f => ({
      ...f,
      itinerary_days: [...(f.itinerary_days || []), {
        day: (f.itinerary_days?.length || 0) + 1,
        title: `Day ${(f.itinerary_days?.length || 0) + 1}`,
        description: '',
      }],
    }));
  };

  const updateDay = (idx, key, value) => {
    setForm(f => ({
      ...f,
      itinerary_days: f.itinerary_days.map((d, i) => i === idx ? { ...d, [key]: value } : d),
    }));
  };

  const removeDay = (idx) => {
    setForm(f => ({ ...f, itinerary_days: f.itinerary_days.filter((_, i) => i !== idx) }));
  };

  const reset = () => {
    setFile(null);
    setForm(EMPTY);
    setRowsQueue([]);
    setRawText('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const reparseFromRawText = () => {
    if (!rawText || rawText.trim().length < 20) {
      toast({ title: 'Nothing to parse', description: 'The raw text box is empty.', variant: 'destructive' });
      return;
    }
    const parsed = parsePackageFromText(rawText);
    // Preserve anything the user already edited — only fill in blanks.
    setForm(f => {
      const merged = { ...f };
      for (const [k, v] of Object.entries(parsed)) {
        if (k === '_raw_text') continue;
        const current = merged[k];
        const isEmpty = current == null || current === '' || (Array.isArray(current) && current.length === 0);
        if (isEmpty && v !== '' && v != null) {
          if (k === 'itinerary_days') {
            try { merged[k] = typeof v === 'string' ? JSON.parse(v) : v; }
            catch { merged[k] = []; }
          } else {
            merged[k] = v;
          }
        }
      }
      return merged;
    });
    toast({ title: 'Re-parsed', description: 'Empty fields filled from raw text — existing edits preserved.' });
  };

  const openPasteMode = () => {
    setFile({ name: 'Pasted text', pasted: true });
    setRawText('');
    setForm(EMPTY);
    setRowsQueue([]);
  };

  const canSave = form.name && form.name.length > 1;

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <PageHeader
        title="Import Package"
        description="Upload a PDF brochure or Excel sheet — we'll auto-extract fields, itinerary, pricing and inclusions."
      >
        {file && (
          <Button variant="outline" onClick={reset}>
            <X className="w-4 h-4 mr-2" /> Discard
          </Button>
        )}
      </PageHeader>

      {/* Dropzone */}
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.ods"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Drop a PDF or Excel file here
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse — supports <code className="text-foreground">.pdf</code>, <code className="text-foreground">.xlsx</code>, <code className="text-foreground">.csv</code>
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button>
              <FileUp className="w-4 h-4 mr-2" /> Choose File
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); openPasteMode(); }}
            >
              <Clipboard className="w-4 h-4 mr-2" /> Paste Text
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-xs text-muted-foreground">
            <div className="bg-background border border-border rounded-lg p-3">
              <Wand2 className="w-4 h-4 mx-auto mb-1 text-primary" />
              <strong className="text-foreground">Auto-extracts</strong>
              <p>Name, destination, pricing, duration</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <FileText className="w-4 h-4 mx-auto mb-1 text-primary" />
              <strong className="text-foreground">Parses itinerary</strong>
              <p>Day-by-day with descriptions</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <FileSpreadsheet className="w-4 h-4 mx-auto mb-1 text-primary" />
              <strong className="text-foreground">Bulk via Excel</strong>
              <p>Import many packages at once</p>
            </div>
          </div>
        </div>
      )}

      {parsing && (
        <div className="flex items-center gap-3 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div>
            <p className="font-semibold text-foreground">Parsing {file?.name}…</p>
            <p className="text-xs text-muted-foreground">Extracting fields, itinerary, pricing</p>
          </div>
        </div>
      )}

      {/* Preview & edit */}
      {file && !parsing && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Extracted Details</h3>
                  <p className="text-xs text-muted-foreground">{file.name}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2.5 py-1">
                  <Check className="w-3 h-3" /> Parsed
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Package Name *</Label>
                  <Input value={form.name} onChange={e => field('name', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={e => field('description', e.target.value)} />
                </div>
                <div>
                  <Label>Destination</Label>
                  <Input value={form.destination} onChange={e => field('destination', e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => field('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="mid_range">Mid-range</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input type="number" value={form.duration_days} onChange={e => field('duration_days', e.target.value)} />
                </div>
                <div>
                  <Label>Max Guests</Label>
                  <Input type="number" value={form.max_guests} onChange={e => field('max_guests', e.target.value)} />
                </div>
                <div>
                  <Label>Price per Person</Label>
                  <Input type="number" value={form.price_per_person} onChange={e => field('price_per_person', e.target.value)} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <CurrencySelect value={form.currency} onValueChange={v => field('currency', v)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Inclusions</Label>
                  <Textarea rows={3} value={form.includes} onChange={e => field('includes', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Exclusions</Label>
                  <Textarea rows={3} value={form.excludes} onChange={e => field('excludes', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Itinerary */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Itinerary</h3>
                  <p className="text-xs text-muted-foreground">{(form.itinerary_days || []).length} day(s)</p>
                </div>
                <Button variant="outline" size="sm" onClick={addItineraryDay}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Day
                </Button>
              </div>
              <div className="space-y-3">
                {(form.itinerary_days || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No itinerary extracted — add days manually if needed.
                  </p>
                )}
                {(form.itinerary_days || []).map((d, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {d.day}
                        </span>
                        <Input
                          value={d.title}
                          onChange={e => updateDay(i, 'title', e.target.value)}
                          className="h-8"
                          placeholder="Day title"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDay(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={d.description}
                      onChange={e => updateDay(i, 'description', e.target.value)}
                      rows={2}
                      placeholder="What happens on this day…"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Extra rows from Excel */}
            {rowsQueue.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    {rowsQueue.length} more package{rowsQueue.length === 1 ? '' : 's'} queued from this file
                  </p>
                  <p className="text-amber-800 dark:text-amber-200 mt-1">
                    They'll be imported with their parsed values when you save — no preview per row.
                  </p>
                  <ul className="mt-2 text-xs space-y-0.5 text-amber-700 dark:text-amber-300">
                    {rowsQueue.slice(0, 5).map((r, i) => (
                      <li key={i}>• {r.name || '(unnamed)'}</li>
                    ))}
                    {rowsQueue.length > 5 && <li>+ {rowsQueue.length - 5} more…</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Raw preview — editable, with re-parse */}
          <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[600px] lg:max-h-[800px] lg:sticky lg:top-20 lg:self-start">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Raw Text</h3>
                <p className="text-[11px] text-muted-foreground">
                  {file?.pasted
                    ? 'Paste a package description here, then click Parse Fields'
                    : 'Edit and re-parse if fields came out wrong'}
                </p>
              </div>
              {typeof rawText === 'string' && (
                <Button size="sm" variant="outline" onClick={reparseFromRawText}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Parse Fields
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {typeof rawText === 'string' ? (
                <Textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={file?.pasted
                    ? 'Paste package details here — name, destination, duration, pricing, day-by-day itinerary, inclusions, exclusions…'
                    : '(empty)'}
                  className="w-full h-full min-h-[400px] text-[11px] font-mono leading-relaxed border-0 rounded-none resize-none focus-visible:ring-0"
                />
              ) : (
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed p-4">
                  {JSON.stringify(rawText, null, 2) || '(no raw text — Excel rows parsed directly into fields)'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {file && !parsing && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={reset}>Discard</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSave || createMutation.isPending}
          >
            {createMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
              : <><Check className="w-4 h-4 mr-2" /> Import {rowsQueue.length > 0 ? `${rowsQueue.length + 1} Packages` : 'Package'}</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}

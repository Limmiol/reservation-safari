import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'KES', label: 'KES (Ksh)' },
  { code: 'TZS', label: 'TZS (TSh)' },
  { code: 'UGX', label: 'UGX (USh)' },
  { code: 'ZAR', label: 'ZAR (R)' },
  { code: 'RWF', label: 'RWF (Fr)' },
  { code: 'ETB', label: 'ETB (Br)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'CAD', label: 'CAD (C$)' },
  { code: 'CHF', label: 'CHF (Fr)' },
  { code: 'CNY', label: 'CNY (¥)' },
  { code: 'AED', label: 'AED (د.إ)' },
];

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', KES: 'Ksh', TZS: 'TSh',
  UGX: 'USh', ZAR: 'R', RWF: 'Fr', ETB: 'Br',
  AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', AED: 'د.إ',
};

export default function CurrencySelect({ value = 'TZS', onValueChange, className }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map(c => (
          <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

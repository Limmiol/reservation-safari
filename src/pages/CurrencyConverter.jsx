import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { ArrowRightLeft, DollarSign } from 'lucide-react';

// Common currencies with exchange rates (in production, fetch from API)
const CURRENCIES = {
  'USD': { name: 'US Dollar', symbol: '$' },
  'EUR': { name: 'Euro', symbol: '€' },
  'GBP': { name: 'British Pound', symbol: '£' },
  'JPY': { name: 'Japanese Yen', symbol: '¥' },
  'CHF': { name: 'Swiss Franc', symbol: 'CHF' },
  'CAD': { name: 'Canadian Dollar', symbol: 'C$' },
  'AUD': { name: 'Australian Dollar', symbol: 'A$' },
  'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$' },
  'CNY': { name: 'Chinese Yuan', symbol: '¥' },
  'INR': { name: 'Indian Rupee', symbol: '₹' },
  'TZS': { name: 'Tanzanian Shilling', symbol: 'TSh' },
  'KES': { name: 'Kenyan Shilling', symbol: 'KSh' },
  'UGX': { name: 'Ugandan Shilling', symbol: 'USh' },
  'ZAR': { name: 'South African Rand', symbol: 'R' },
  'NGN': { name: 'Nigerian Naira', symbol: '₦' },
  'EGP': { name: 'Egyptian Pound', symbol: 'E£' },
  'MXN': { name: 'Mexican Peso', symbol: '$' },
  'BRL': { name: 'Brazilian Real', symbol: 'R$' },
  'SGD': { name: 'Singapore Dollar', symbol: 'S$' },
  'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$' },
};

// Basic exchange rates (in production, fetch from API)
const EXCHANGE_RATES = {
  'USD': 1,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 149.5,
  'CHF': 0.88,
  'CAD': 1.36,
  'AUD': 1.53,
  'NZD': 1.68,
  'CNY': 7.24,
  'INR': 83.12,
  'TZS': 2570,
  'KES': 158.5,
  'UGX': 3850,
  'ZAR': 18.6,
  'NGN': 1550,
  'EGP': 49.5,
  'MXN': 17.8,
  'BRL': 4.97,
  'SGD': 1.35,
  'HKD': 7.84,
};

export default function CurrencyConverter() {
  const { language } = useLanguage();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('TZS');
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState('');

  // Force re-render when language changes by including it in a key
  const t = (key) => translate(key, language);

  useEffect(() => {
    if (amount && amount !== '') {
      const rate = EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency];
      const converted = (parseFloat(amount) * rate).toFixed(2);
      setConvertedAmount(converted);
    } else {
      setConvertedAmount('');
    }
  }, [amount, fromCurrency, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const rate = EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency];

  return (
    <div className="p-8 max-w-2xl mx-auto" key={language}>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <DollarSign className="w-8 h-8" />
          {t('currency_converter')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('convert_subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('live_exchange')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* From Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('from_currency')}</label>
            <div className="flex gap-2">
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <div className="text-lg font-semibold pt-2">{CURRENCIES[fromCurrency].symbol}</div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwap}
              className="rounded-full h-10 w-10"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('to_currency')}</label>
            <div className="flex gap-2">
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0.00"
                value={convertedAmount}
                readOnly
                className="flex-1 bg-accent"
              />
              <div className="text-lg font-semibold pt-2">{CURRENCIES[toCurrency].symbol}</div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          {amount && amount !== '' && (
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">
                1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('exchange_rate')}: {rate.toFixed(4)}
              </p>
            </div>
          )}

          {/* Popular Conversions */}
          <div className="pt-4 border-t">
            <h3 className="font-medium text-sm mb-3">{t('popular_conversions')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { from: 'USD', to: 'TZS', label: 'USD → TZS' },
                { from: 'USD', to: 'KES', label: 'USD → KES' },
                { from: 'EUR', to: 'USD', label: 'EUR → USD' },
                { from: 'GBP', to: 'EUR', label: 'GBP → EUR' },
              ].map((conv) => {
                const convRate = EXCHANGE_RATES[conv.to] / EXCHANGE_RATES[conv.from];
                return (
                  <div key={conv.label} className="p-2 bg-secondary rounded text-xs">
                    <p className="font-medium">{conv.label}</p>
                    <p className="text-muted-foreground">1 = {convRate.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        {t('rates_disclaimer')}
      </p>
    </div>
  );
}
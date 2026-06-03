export function generateRef(prefix = 'BK') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix + '-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    // fallback for unknown currency codes
    const sym = { TZS: 'TSh', KES: 'Ksh', USD: '$', EUR: '€', GBP: '£' };
    return `${sym[currency] || currency} ${Number(amount || 0).toLocaleString('en-US')}`;
  }
}

export function getUserBusinessCurrency(user, fallback = 'TZS') {
  if (!user?.settings) return fallback;
  try {
    const saved = JSON.parse(user.settings);
    return (saved?.business?.currency || fallback).toUpperCase();
  } catch (error) {
    console.warn('Failed to parse user settings for currency:', error);
    return fallback;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
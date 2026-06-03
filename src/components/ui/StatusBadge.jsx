import React from 'react';
import { cn } from '@/lib/utils';

const statusStyles = {
  // Booking statuses
  inquiry: 'bg-blue-50 text-blue-700',
  quoted: 'bg-purple-50 text-purple-700',
  confirmed: 'bg-green-50 text-green-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-gray-50 text-gray-700',
  cancelled: 'bg-red-50 text-red-700',
  // Invoice/Quote
  draft: 'bg-gray-50 text-gray-700',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-700',
  expired: 'bg-orange-50 text-orange-700',
  paid: 'bg-green-50 text-green-700',
  partially_paid: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-50 text-red-700',
  // Payment
  pending: 'bg-yellow-50 text-yellow-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-orange-50 text-orange-700',
  // Voucher
  issued: 'bg-blue-50 text-blue-700',
  used: 'bg-gray-50 text-gray-700',
  // Flight
  booked: 'bg-blue-50 text-blue-700',
  checked_in: 'bg-green-50 text-green-700',
  // Manifest
  in_transit: 'bg-yellow-50 text-yellow-700',
  // Package
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-50 text-gray-700',
  seasonal: 'bg-orange-50 text-orange-700',
};

export default function StatusBadge({ status }) {
  const label = (status || 'unknown').replace(/_/g, ' ');
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      statusStyles[status] || 'bg-gray-50 text-gray-700'
    )}>
      {label}
    </span>
  );
}
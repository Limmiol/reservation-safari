import React from 'react';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatusBadge from '@/components/ui/StatusBadge';
import { CreditCard, DollarSign } from 'lucide-react';

export default function PaymentHistoryCard({ payments = [] }) {
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Payment History</h2>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-accent/30 rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalPaid)}</p>
          </div>

          {/* Payment list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{payment.method?.replace('_', ' ') || 'Payment'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/helpers';
import StatusBadge from '@/components/ui/StatusBadge';
import { Receipt, Calendar } from 'lucide-react';

export default function MyInvoices() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['portal-invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }),
    enabled: !!user?.email,
  });

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">My Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">Invoices issued for your bookings.</p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No invoices found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-sm">{inv.invoice_number}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{inv.booking_ref}</p>
                  {inv.due_date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due {formatDate(inv.due_date)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatCurrency(inv.total)}</p>
                  {inv.amount_paid > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">Paid: {formatCurrency(inv.amount_paid)}</p>
                  )}
                  {(inv.total - (inv.amount_paid || 0)) > 0 && (
                    <p className="text-xs text-red-500">Balance: {formatCurrency(inv.total - (inv.amount_paid || 0))}</p>
                  )}
                </div>
              </div>

              {/* Line items */}
              {inv.items && (() => {
                try {
                  const items = JSON.parse(inv.items);
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                            <th className="text-left pb-2 font-medium">Description</th>
                            <th className="text-right pb-2 font-medium">Qty</th>
                            <th className="text-right pb-2 font-medium">Unit Price</th>
                            <th className="text-right pb-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {items.map((item, i) => (
                            <tr key={i}>
                              <td className="py-1.5">{item.description}</td>
                              <td className="py-1.5 text-right text-muted-foreground">{item.qty}</td>
                              <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                              <td className="py-1.5 text-right font-medium">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                } catch { return null; }
              })()}

              {inv.notes && <p className="mt-3 text-xs text-muted-foreground italic">{inv.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
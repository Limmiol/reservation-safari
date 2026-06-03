import React from 'react';
import { getSiteConfig } from '@/lib/siteConfig';
import { Compass } from 'lucide-react';

/**
 * Reusable branded header for all printed/viewed documents.
 * Shows logo + company name on the left, document title + number on the right.
 */
export default function DocumentHeader({ docType, docNumber, children }) {
  const config = getSiteConfig();

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <div className="flex items-start justify-between">
        {/* Company identity */}
        <div className="flex items-center gap-3">
          <img
            src={config.logoUrl || '/rs-logo-full.svg'}
            alt="Company Logo"
            className="h-14 w-auto object-contain"
          />
        </div>

        {/* Document title */}
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-800 uppercase tracking-wide">{docType}</p>
          {docNumber && <p className="text-sm font-mono text-gray-500 mt-1">#{docNumber}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
import React from 'react';

type BadgeTone = 'emerald' | 'slate' | 'ochre' | 'sienna' | 'crimson' | 'neutral';

const TONE_MAP: Record<BadgeTone, string> = {
  emerald: 'text-[#1C4A3A] bg-[#EBF3EF] border-[#95C1AE]',
  slate: 'text-[#203E5F] bg-[#ECF2F9] border-[#A4C1E4]',
  ochre: 'text-[#7A5212] bg-[#FAF3E7] border-[#E5CFA0]',
  sienna: 'text-[#6E3725] bg-[#F8EEEA] border-[#DBB8AE]',
  crimson: 'text-[#8B1E2D] bg-[#FBECEE] border-[#E8A2AA]',
  neutral: 'text-[#534245] bg-[#FAF7F2] border-[#D8C9B4]',
};

const AUTO_STATUS_TONES: Record<string, BadgeTone> = {
  // Payment & Publishing
  Paid: 'emerald',
  Published: 'emerald',
  Active: 'emerald',
  Delivered: 'emerald',
  Received: 'emerald',
  Converted: 'emerald',
  Resolved: 'emerald',
  // Dispatched / Confirmed
  Shipped: 'slate',
  Confirmed: 'slate',
  'In Progress': 'slate',
  // Processing / Partial / Follow-up
  Processing: 'ochre',
  Partial: 'ochre',
  'Follow-up': 'ochre',
  Ordered: 'ochre',
  Draft: 'ochre',
  'Low Stock': 'ochre',
  // Pending / Hold
  Pending: 'sienna',
  'COD Due': 'sienna',
  New: 'sienna',
  // Alerts / Cancelled / OOS
  Cancelled: 'crimson',
  'Return requested': 'crimson',
  'Out of Stock': 'crimson',
  Overdue: 'crimson',
  Refunded: 'crimson',
  Suspended: 'crimson',
  High: 'crimson',
  Archived: 'neutral',
  Closed: 'neutral',
  Hidden: 'neutral',
  Inactive: 'neutral',
};

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone }) => {
  const resolvedTone = tone || AUTO_STATUS_TONES[label] || 'neutral';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] border whitespace-nowrap ${TONE_MAP[resolvedTone]}`}
    >
      {label}
    </span>
  );
};

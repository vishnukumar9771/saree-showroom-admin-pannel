import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  goldAccent?: boolean;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  goldAccent = false,
  onClick,
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white border border-[#D8C9B4] rounded p-5 transition-colors ${
        goldAccent ? 'border-t-2 border-t-[#C3A46C]' : ''
      } ${onClick ? 'hover:border-[#C3A46C] cursor-pointer' : ''}`}
      style={{
        boxShadow: '0 1px 3px rgba(36, 33, 31, 0.04), 0 6px 16px -4px rgba(100, 30, 50, 0.03)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#534245]">{label}</span>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
              trend.positive ? 'text-[#1C4A3A]' : 'text-[#8B1E2D]'
            }`}
          >
            {trend.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="text-[26px] leading-[32px] font-bold text-[#24211F] tracking-[-0.02em] tabular-nums mt-2">
        {value}
      </div>
      {subtext && <p className="text-xs text-[#534245] mt-1.5">{subtext}</p>}
    </Wrapper>
  );
};

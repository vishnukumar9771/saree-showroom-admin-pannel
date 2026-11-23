import React, { useState } from 'react';
import { formatCurrency } from '../../../utils/format';

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
  currency?: 'INR' | 'USD';
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, currency = 'INR' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="h-56 flex items-center justify-center text-xs text-[#534245]">No revenue data available.</div>;
  }

  const maxRev = Math.max(...data.map((d) => d.revenue), 10000);
  const width = 640;
  const height = 220;
  const padX = 48;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, idx) => {
    const x = padX + (data.length === 1 ? chartW / 2 : (idx / (data.length - 1)) * chartW);
    const y = padY + chartH - (d.revenue / maxRev) * chartH;
    return { ...d, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padY + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + chartH).toFixed(1)} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
        <defs>
          <linearGradient id="aaranyaRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#641E32" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#641E32" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padY + chartH * (1 - t);
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#EEE7E3" strokeWidth="1" />
              <text
                x={padX - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-[#867275] text-[10px] font-mono tabular-nums"
              >
                {t === 0 ? '0' : `${Math.round((maxRev * t) / 1000)}k`}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#aaranyaRevGrad)" />
        <path d={linePath} fill="none" stroke="#641E32" strokeWidth="2.2" />

        {points.map((p, idx) => (
          <g key={p.label}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 5.5 : 3.5}
              fill={hoveredIdx === idx ? '#C3A46C' : '#641E32'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <rect
              x={p.x - 18}
              y={padY}
              width={36}
              height={chartH + 20}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            <text x={p.x} y={height - 4} textAnchor="middle" className="fill-[#534245] text-[10px]">
              {p.label}
            </text>
          </g>
        ))}
      </svg>

      {hoveredIdx !== null && points[hoveredIdx] && (
        <div className="mt-2 flex items-center justify-between px-3 py-2 bg-[#FAF7F2] border border-[#D8C9B4] rounded text-xs">
          <span className="font-semibold text-[#3B1422]">{points[hoveredIdx].label}</span>
          <span className="tabular-nums text-[#24211F]">
            Revenue: <strong>{formatCurrency(points[hoveredIdx].revenue, currency)}</strong> ·{' '}
            {points[hoveredIdx].orders} orders
          </span>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataColumn<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
  widthClass?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'Adjust your filters or add a new record.',
  emptyAction,
  page,
  pageSize,
  totalItems,
  onPageChange,
}: DataTableProps<T>) {
  const totalPages =
    page !== undefined && pageSize && totalItems !== undefined ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  return (
    <div
      className="bg-white border border-[#D8C9B4] rounded overflow-hidden"
      style={{
        boxShadow: '0 1px 3px rgba(36, 33, 31, 0.04), 0 6px 16px -4px rgba(100, 30, 50, 0.03)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF7F2] border-b border-[#D8C9B4]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#641E32] whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.widthClass || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEE7E3]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-6 text-center">
                  <p className="font-serif text-lg text-[#24211F]">{emptyTitle}</p>
                  <p className="text-xs text-[#534245] mt-1">{emptyDescription}</p>
                  {emptyAction && <div className="mt-4">{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors hover:bg-[#C3A46C]/[0.06] ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-4 text-[13px] text-[#24211F] align-middle ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page !== undefined && onPageChange && totalItems !== undefined && totalItems > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF7F2] border-t border-[#D8C9B4] text-xs text-[#534245]">
          <span className="tabular-nums">
            Showing {(page - 1) * (pageSize || 10) + 1}–{Math.min(page * (pageSize || 10), totalItems)} of {totalItems}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 border border-[#D8C9B4] rounded bg-white hover:border-[#641E32] disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 tabular-nums font-medium text-[#24211F]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 border border-[#D8C9B4] rounded bg-white hover:border-[#641E32] disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

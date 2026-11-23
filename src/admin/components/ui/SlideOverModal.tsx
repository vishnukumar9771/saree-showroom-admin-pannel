import React from 'react';
import { X } from 'lucide-react';

interface SlideOverModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const SlideOverModal: React.FC<SlideOverModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
}) => {
  if (!open) return null;

  const widthClass = size === 'xl' ? 'max-w-3xl' : size === 'md' ? 'max-w-md' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3B1422]/40 backdrop-blur-[4px]">
      <div
        className={`w-full ${widthClass} bg-white border-l border-[#C3A46C]/40 h-full flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#D8C9B4] bg-[#FAF7F2]">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#24211F]">{title}</h2>
            {subtitle && <p className="text-xs text-[#534245] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 text-[#534245] hover:text-[#641E32] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#D8C9B4] bg-[#FAF7F2] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

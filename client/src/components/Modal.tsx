import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${SIZE_CLASS[size]} border-2 border-slate-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

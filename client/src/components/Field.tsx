import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
}

export default function Field({ label, hint, error, trailing, className = '', ...rest }: Props) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      <div className="relative">
        <input
          {...rest}
          className={`w-full px-3 py-2.5 border-2 ${
            error ? 'border-red-400' : 'border-slate-200'
          } rounded-lg focus:border-indigo-500 outline-none transition-colors ${className}`}
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {trailing}
          </div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </label>
  );
}

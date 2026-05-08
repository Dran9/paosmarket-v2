import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Pencil } from 'lucide-react';

interface BaseProps {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function EditableText({
  value,
  onSave,
  placeholder,
  className = '',
  disabled,
  multiline,
}: BaseProps & { multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') cancel();
    if (e.key === 'Enter' && !multiline) commit();
    if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) commit();
  };

  if (disabled) {
    return (
      <span className={`text-slate-500 text-sm ${className}`}>
        {value || <em className="text-slate-300">{placeholder}</em>}
      </span>
    );
  }

  if (editing) {
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        rows={3}
        className={`w-full px-2 py-1 text-sm border-2 border-indigo-400 rounded outline-none resize-none ${className}`}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className={`w-full px-2 py-1 text-sm border-2 border-indigo-400 rounded outline-none ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group text-left text-sm hover:bg-indigo-50 rounded px-1.5 py-0.5 transition-colors w-full ${className}`}
      title="Editar"
    >
      <span className={value ? 'text-slate-700' : 'text-slate-300 italic'}>
        {value || placeholder || '—'}
      </span>
      <Pencil
        size={11}
        className="inline ml-1 opacity-0 group-hover:opacity-50 text-slate-400"
      />
    </button>
  );
}

export function EditableNumber({
  value,
  onSave,
  className = '',
  disabled,
  min,
  prefix,
}: {
  value: number;
  onSave: (next: number) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  min?: number;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const n = parseFloat(draft);
    if (!isFinite(n)) return setDraft(String(value));
    if (min !== undefined && n < min) return setDraft(String(value));
    if (n !== value) onSave(n);
  };

  if (disabled) {
    return (
      <span className={`text-sm text-slate-500 ${className}`}>
        {prefix} {value}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
          if (e.key === 'Enter') commit();
        }}
        className={`w-20 px-2 py-1 text-sm border-2 border-indigo-400 rounded outline-none ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`hover:bg-indigo-50 rounded px-1.5 py-0.5 text-sm text-slate-700 transition-colors ${className}`}
      title="Editar"
    >
      {prefix && <span className="text-slate-400 mr-0.5">{prefix}</span>}
      {value}
    </button>
  );
}

export function EditableSelect<T extends string>({
  value,
  options,
  onSave,
  className = '',
  disabled,
}: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onSave: (next: T) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    const label = options.find(([k]) => k === value)?.[1] ?? value;
    return <span className={`text-sm text-slate-500 ${className}`}>{label}</span>;
  }

  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value as T)}
      className={`px-2 py-1 text-sm border border-slate-200 rounded bg-white hover:border-indigo-400 focus:border-indigo-500 outline-none ${className}`}
    >
      {options.map(([k, l]) => (
        <option key={k} value={k}>
          {l}
        </option>
      ))}
    </select>
  );
}

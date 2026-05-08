import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ICON_CATALOG, ICON_NAMES, suggestIcons, lookupIcon } from '@/lib/icons';

interface Props {
  value: string;
  onChange: (iconName: string) => void;
  suggestionsFor?: string;
}

export default function IconPicker({ value, onChange, suggestionsFor = '' }: Props) {
  const [filter, setFilter] = useState('');

  const suggestions = useMemo(
    () => suggestIcons(suggestionsFor),
    [suggestionsFor]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [filter]);

  return (
    <div>
      {suggestions.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">
            Sugerencias para "{suggestionsFor}"
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((name) => {
              const Icon = ICON_CATALOG[name];
              const sel = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  title={name}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                    sel
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Icon size={14} />
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar entre todos los iconos..."
          className="w-full pl-8 pr-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
        />
      </div>

      <div className="max-h-48 overflow-y-auto border-2 border-slate-200 rounded-lg p-2 bg-slate-50">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-6">Sin resultados</div>
        ) : (
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
            {filtered.map((name) => {
              const Icon = ICON_CATALOG[name];
              const sel = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  title={name}
                  className={`aspect-square flex items-center justify-center rounded-lg border-2 transition-all ${
                    sel
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {value && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>Seleccionado:</span>
          {(() => {
            const Icon = lookupIcon(value);
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                <Icon size={12} /> {value}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}

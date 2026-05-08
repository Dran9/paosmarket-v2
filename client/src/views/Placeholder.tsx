import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  icon: LucideIcon;
}

export default function Placeholder({ title, icon: Icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
      <Icon size={48} className="mb-4 text-slate-300" />
      <h2 className="text-xl font-extrabold text-slate-700 mb-1">{title}</h2>
      <p className="text-sm">Próximamente.</p>
    </div>
  );
}

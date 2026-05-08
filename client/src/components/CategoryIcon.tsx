import { useMemo } from 'react';
import { useCategories } from '@/lib/queries';
import { iconFor, lookupIcon } from '@/lib/icons';

interface Props {
  category: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ category, size = 18, className }: Props) {
  const { data: categories = [] } = useCategories();

  const Icon = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const target = norm(category || '');
    const match = categories.find((c) => norm(c.name) === target);
    if (match) return lookupIcon(match.icon);
    return iconFor(category);
  }, [categories, category]);

  return <Icon size={size} className={className} />;
}

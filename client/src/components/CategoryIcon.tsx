import { iconFor } from '@/lib/icons';

interface Props {
  category: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ category, size = 18, className }: Props) {
  const Icon = iconFor(category);
  return <Icon size={size} className={className} />;
}

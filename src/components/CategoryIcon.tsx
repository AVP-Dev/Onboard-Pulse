import React from 'react';
import { Category, CATEGORY_LABELS } from '@/lib/types';
import { GraduationCap, HeartHandshake, Briefcase, Users, Gauge } from 'lucide-react';

interface CategoryIconProps {
  category: Category;
  showLabel?: boolean;
  className?: string;
}

export function CategoryIcon({ category, showLabel = true, className = 'w-4 h-4' }: CategoryIconProps) {
  const getIcon = () => {
    switch (category) {
      case 'training':
        return <GraduationCap className={className} />;
      case 'support':
        return <HeartHandshake className={className} />;
      case 'conditions':
        return <Briefcase className={className} />;
      case 'team':
        return <Users className={className} />;
      case 'workload':
        return <Gauge className={className} />;
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      {getIcon()}
      {showLabel && <span>{CATEGORY_LABELS[category]}</span>}
    </span>
  );
}

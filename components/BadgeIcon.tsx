import React from 'react';
import {
  ShieldCheck,
  Fish,
  KeyRound,
  GraduationCap,
  Trophy,
  Smartphone,
  Star,
  Handshake,
  Award,
  type LucideIcon,
} from 'lucide-react';

// Les badges référencent leur icône par nom (données) ; ce composant fait le lien avec Lucide.
const BADGE_ICONS: Record<string, LucideIcon> = {
  shield: ShieldCheck,
  phishing: Fish,
  key: KeyRound,
  graduation: GraduationCap,
  trophy: Trophy,
  mobile: Smartphone,
  star: Star,
  community: Handshake,
};

export const BadgeIcon: React.FC<{ name: string; className?: string }> = ({
  name,
  className = 'w-7 h-7',
}) => {
  const Icon = BADGE_ICONS[name] ?? Award;
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
};

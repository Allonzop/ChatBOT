import { Bell, FileText, Globe, Landmark, Megaphone, MessageCircle, Sparkles, Star, type LucideProps } from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  star: Star,
  megaphone: Megaphone,
  "file-text": FileText,
  bell: Bell,
  "message-circle": MessageCircle,
  globe: Globe,
  landmark: Landmark,
  sparkles: Sparkles,
};

export function TaskIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon {...props} />;
}

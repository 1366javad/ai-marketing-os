import {
  BookOpen,
  FileText,
  Globe,
  Linkedin,
  Mail,
  Megaphone,
  Package,
  Search,
  Share2,
} from "lucide-react";

export const iconMap = {
  blog: FileText,
  email: Mail,
  ads: Megaphone,
  globe: Globe,
  content: BookOpen,
  package: Package,
  search: Search,
  linkedin: Linkedin,
  social: Share2,
};

export default function Icon({ name = "content", className = "" }) {
  const Component = iconMap[name] || BookOpen;
  return <Component className={className} />;
}

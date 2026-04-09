import { Badge } from "@/components/ui/badge";
import type { Style } from "@/types/database";

const styleVariants: Record<Style, string> = {
  bringue: "bg-accent/15 text-accent hover:bg-accent/15",
  himene: "bg-primary/15 text-primary hover:bg-primary/15",
  variete: "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/30",
  traditionnel: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/30",
  autre: "bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/50",
};

const styleLabels: Record<Style, string> = {
  bringue: "Bringue",
  himene: "Himene",
  variete: "Variete",
  traditionnel: "Traditionnel",
  autre: "Autre",
};

interface StyleBadgeProps {
  style: Style;
}

export function StyleBadge({ style }: StyleBadgeProps) {
  return (
    <Badge variant="secondary" className={styleVariants[style]}>
      {styleLabels[style]}
    </Badge>
  );
}

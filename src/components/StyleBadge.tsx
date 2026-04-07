import type { Style } from "@/types/database";

const styleColors: Record<Style, string> = {
  bringue: "bg-cta/15 text-cta",
  himene: "bg-primary/15 text-primary",
  variete: "bg-purple-100 text-purple-700",
  traditionnel: "bg-amber-100 text-amber-700",
  autre: "bg-gray-100 text-gray-600",
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
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${styleColors[style]}`}>
      {styleLabels[style]}
    </span>
  );
}

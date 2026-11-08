export const INDUSTRY_LABELS: Record<string, string> = {
  fashion: "Moda",
  beauty: "Güzellik",
  food_beverage: "Yeme & İçme",
  tech: "Teknoloji",
  fitness: "Spor & Sağlık",
  travel: "Seyahat",
  gaming: "Oyun",
  finance: "Finans",
  home_living: "Ev & Yaşam",
  other: "Diğer",
};

export function industryLabel(value: string): string {
  return INDUSTRY_LABELS[value] ?? value;
}

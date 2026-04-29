export const STREETS = [
  "Borowska",
  "Buforowa",
  "Grabiszyńska",
  "Grota Roweckiego",
  "Hallera",
  "Karkonoska",
  "Ołtaszyńska",
  "Opolska",
  "Parafialna",
  "Powstańców Śląskich",
  "Radosna",
  "Sudecka",
  "Ślężna",
  "Zwycięska",
] as const;

export type StreetName = (typeof STREETS)[number];

const PL_MAP: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ż: "z", ź: "z",
  Ą: "a", Ć: "c", Ę: "e", Ł: "l", Ń: "n", Ó: "o", Ś: "s", Ż: "z", Ź: "z",
};

export function streetToSlug(street: string): string {
  return street
    .split("")
    .map((ch) => PL_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function slugToStreet(slug: string): StreetName | null {
  const found = STREETS.find((s) => streetToSlug(s) === slug.toLowerCase());
  return found ?? null;
}

export const STREET_SLUGS = STREETS.map((s) => ({ name: s, slug: streetToSlug(s) }));

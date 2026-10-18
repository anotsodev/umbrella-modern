// Level key from a checklist slug suffix ("-beginner", "-advanced",
// "-expert"). Level names are not localized upstream (every locale
// shows Beginner/Advanced/Expert), so the slug suffix is a stable
// key for both ordering and the localized labels in the `pathways`
// message namespace. Returns null for slugs without a level suffix
// (e.g. curated Pathways checklists like "digital-basics").

export type PathwayLevel = "beginner" | "advanced" | "expert";

const SUFFIXES: readonly PathwayLevel[] = ["beginner", "advanced", "expert"];

export function levelFromSlug(slug: string): PathwayLevel | null {
  for (const s of SUFFIXES) {
    if (slug.endsWith(`-${s}`)) return s;
  }
  return null;
}

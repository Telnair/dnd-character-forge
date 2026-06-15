import { SKILL_ABILITY } from "@/data";
import { ABILITY_COLORS } from "./abilityColors";

// Minimalist line glyphs for each skill, drawn on a 24x24 grid.
const GLYPHS: Record<string, JSX.Element> = {
  acrobatics: (
    <path d="M5 18c3-1 4-6 7-6s4 5 7 6M9 6a2 2 0 104 0 2 2 0 00-4 0" />
  ),
  "animal-handling": (
    <path d="M6 14c0-3 2-5 6-5s6 2 6 5M8 9l-2-3M16 9l2-3M10 18h4" />
  ),
  arcana: (
    <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" />
  ),
  athletics: (
    <path d="M4 12h4l2-4 4 8 2-4h4M4 8v8M20 8v8" />
  ),
  deception: (
    <path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6zM12 9v6" />
  ),
  history: (
    <path d="M6 4h9l3 3v13H6zM9 8h6M9 12h6M9 16h4" />
  ),
  insight: (
    <path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6zM12 9a3 3 0 100 6 3 3 0 000-6z" />
  ),
  intimidation: (
    <path d="M5 4l4 6-4 2 7 8 7-8-4-2 4-6-7 4z" />
  ),
  investigation: (
    <path d="M10 4a6 6 0 104 10l5 5M10 6a4 4 0 110 8" />
  ),
  medicine: (
    <path d="M12 5v14M5 12h14M8 8h8v8H8z" />
  ),
  nature: (
    <path d="M12 21V9M12 13l-4-4M12 11l4-4M12 9a4 4 0 014-4 4 4 0 01-4 4z" />
  ),
  perception: (
    <path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6zM12 10a2 2 0 100 4 2 2 0 000-4z" />
  ),
  performance: (
    <path d="M9 18a2 2 0 11-4 0 2 2 0 014 0zM9 18V6l10-2v10M19 16a2 2 0 11-4 0 2 2 0 014 0z" />
  ),
  persuasion: (
    <path d="M4 5h12v8H8l-4 4zM10 9h4" />
  ),
  religion: (
    <path d="M12 3v18M7 8h10M9 14a3 3 0 006 0" />
  ),
  "sleight-of-hand": (
    <path d="M6 12V7a1.5 1.5 0 013 0M9 12V5a1.5 1.5 0 013 0v7M12 12V6a1.5 1.5 0 013 0v8a5 5 0 01-9 3l-2-3" />
  ),
  stealth: (
    <path d="M12 3a5 5 0 015 5c0 4-5 13-5 13S7 12 7 8a5 5 0 015-5zM10 8h4" />
  ),
  survival: (
    <path d="M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" />
  ),
};

export function SkillIcon({
  index,
  size = 22,
}: {
  index: string;
  size?: number;
}) {
  const ability = SKILL_ABILITY[index];
  const color = ABILITY_COLORS[ability] ?? "#f5c451";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {GLYPHS[index] ?? <circle cx="12" cy="12" r="7" />}
    </svg>
  );
}

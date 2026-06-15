import type { AbilityKey } from "@/data";

export type CasterType = "full" | "half" | "pact" | "none";
export type PrepStyle = "known" | "prepared" | "spellbook" | "pact" | "none";

export interface ClassCastingConfig {
  caster: CasterType;
  prep: PrepStyle;
  ability: AbilityKey | null;
}

/**
 * Spellcasting behavior per class. The SRD API gives slot tables but not a
 * clean "known vs prepared" flag, so we encode the PHB rules here.
 */
export const CLASS_CASTING: Record<string, ClassCastingConfig> = {
  barbarian: { caster: "none", prep: "none", ability: null },
  bard: { caster: "full", prep: "known", ability: "cha" },
  cleric: { caster: "full", prep: "prepared", ability: "wis" },
  druid: { caster: "full", prep: "prepared", ability: "wis" },
  fighter: { caster: "none", prep: "none", ability: null },
  monk: { caster: "none", prep: "none", ability: null },
  paladin: { caster: "half", prep: "prepared", ability: "cha" },
  ranger: { caster: "half", prep: "known", ability: "wis" },
  rogue: { caster: "none", prep: "none", ability: null },
  sorcerer: { caster: "full", prep: "known", ability: "cha" },
  warlock: { caster: "pact", prep: "known", ability: "cha" },
  wizard: { caster: "full", prep: "spellbook", ability: "int" },
};

/** Levels at which a class grants an Ability Score Improvement / feat. */
export const ASI_LEVELS: Record<string, number[]> = {
  barbarian: [4, 8, 12, 16, 19],
  bard: [4, 8, 12, 16, 19],
  cleric: [4, 8, 12, 16, 19],
  druid: [4, 8, 12, 16, 19],
  fighter: [4, 6, 8, 12, 14, 16, 19],
  monk: [4, 8, 12, 16, 19],
  paladin: [4, 8, 12, 16, 19],
  ranger: [4, 8, 12, 16, 19],
  rogue: [4, 8, 10, 12, 16, 19],
  sorcerer: [4, 8, 12, 16, 19],
  warlock: [4, 8, 12, 16, 19],
  wizard: [4, 8, 12, 16, 19],
};

/** Class level at which the subclass is chosen. */
export const SUBCLASS_LEVEL: Record<string, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Point-buy cost for each score 8..15. */
export const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

/**
 * Multiclass spellcaster combined slot table (PHB p.165), indexed by
 * effective caster level -> [1st..9th] slot counts.
 */
export const MULTICLASS_SLOTS: number[][] = [
  [], // 0 (unused)
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Warlock Pact Magic: [slotLevel, slotCount] by warlock level. */
export const PACT_MAGIC: { slotLevel: number; slots: number }[] = [
  { slotLevel: 0, slots: 0 }, // 0 (unused)
  { slotLevel: 1, slots: 1 },
  { slotLevel: 1, slots: 2 },
  { slotLevel: 2, slots: 2 },
  { slotLevel: 2, slots: 2 },
  { slotLevel: 3, slots: 2 },
  { slotLevel: 3, slots: 2 },
  { slotLevel: 4, slots: 2 },
  { slotLevel: 4, slots: 2 },
  { slotLevel: 5, slots: 2 },
  { slotLevel: 5, slots: 2 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 4 },
  { slotLevel: 5, slots: 4 },
  { slotLevel: 5, slots: 4 },
  { slotLevel: 5, slots: 4 },
];

/** Fixed skill proficiencies granted by a race (from racial traits). */
export const RACE_FIXED_SKILLS: Record<string, string[]> = {
  elf: ["perception"],
  "half-orc": ["intimidation"],
};

/** Number of free skill proficiencies a race lets you choose. */
export const RACE_FREE_SKILLS: Record<string, number> = {
  "half-elf": 2,
};

/** Number of bonus languages a race lets you choose. */
export const RACE_FREE_LANGUAGES: Record<string, number> = {
  human: 1,
  "half-elf": 1,
};

/** Expertise grants: skills you may double proficiency on, by class+level. */
export const EXPERTISE_GRANTS: { classIndex: string; level: number; count: number }[] = [
  { classIndex: "rogue", level: 1, count: 2 },
  { classIndex: "rogue", level: 6, count: 2 },
  { classIndex: "bard", level: 3, count: 2 },
  { classIndex: "bard", level: 10, count: 2 },
];

/** Multiclass proficiencies are limited; encoded as readable notes per class. */
export const MULTICLASS_PROF_NOTES: Record<string, string> = {
  barbarian: "Shields, simple weapons, martial weapons",
  bard: "Light armor, one skill of your choice, one musical instrument",
  cleric: "Light armor, medium armor, shields",
  druid: "Light armor, medium armor, shields (non-metal only)",
  fighter: "Light armor, medium armor, shields, simple & martial weapons",
  monk: "Simple weapons, shortswords",
  paladin: "Light armor, medium armor, shields, simple & martial weapons",
  ranger: "Light armor, medium armor, shields, simple & martial weapons, one skill",
  rogue: "Light armor, one skill, thieves' tools",
  sorcerer: "—",
  warlock: "Light armor, simple weapons",
  wizard: "—",
};

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

/**
 * 2024 Weapon Mastery: how many weapons a class lets you use the Mastery
 * property of, at level 1. Only the Fighter's count scales with level (see
 * weaponMasteriesForClass); the others stay flat. A multiclass character uses
 * their best-granting class, so the derived count is the max across classes
 * (see engine/derive.ts).
 */
export const WEAPON_MASTERY_BY_CLASS: Record<string, number> = {
  barbarian: 2,
  fighter: 3,
  paladin: 2,
  ranger: 2,
  rogue: 2,
};

/**
 * Weapon-mastery count for a single class at a given level. Only the Fighter
 * scales: 3 (1–3) → 4 (4–9) → 5 (10–15) → 6 (16+). Every other granting class
 * keeps its flat level-1 value.
 */
export function weaponMasteriesForClass(classIndex: string, level: number): number {
  const base = WEAPON_MASTERY_BY_CLASS[classIndex] ?? 0;
  if (base === 0) return 0;
  if (classIndex === "fighter") {
    if (level >= 16) return 6;
    if (level >= 10) return 5;
    if (level >= 4) return 4;
    return 3;
  }
  return base;
}

/** The 8 PHB 2024 weapon-mastery properties (the dataset carries no descriptions). */
export const WEAPON_MASTERY_DESC: Record<string, string> = {
  cleave:
    "On a hit, make a melee attack against a second creature within 5 feet of the first and within reach; on a hit it takes the weapon's damage (no ability modifier). Once per turn.",
  graze:
    "If your attack roll misses, the target takes damage equal to the ability modifier used for the attack (the weapon's damage type).",
  nick: "When you make the extra attack of the Light property, you can do so as part of the Attack action instead of as a Bonus Action (once per turn).",
  push: "On a hit, you can push the target up to 10 feet straight away from you if it is Large or smaller.",
  sap: "On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.",
  slow: "On a hit that deals damage, reduce the target's Speed by 10 feet until the start of your next turn.",
  topple:
    "On a hit, force a Constitution save (DC 8 + ability mod + proficiency) or the target has the Prone condition.",
  vex: "On a hit that deals damage, you have Advantage on your next attack roll against that target before the end of your next turn.",
};

/** Expertise grants: skills you may double proficiency on, by class+level. */
export const EXPERTISE_GRANTS: { classIndex: string; level: number; count: number }[] = [
  { classIndex: "rogue", level: 1, count: 2 },
  { classIndex: "rogue", level: 6, count: 2 },
  { classIndex: "bard", level: 3, count: 2 },
  { classIndex: "bard", level: 10, count: 2 },
];

// Multiclass proficiency grants are derived from the 2024 class data's
// `multi_classing.proficiencies` (see engine/multiclass.ts → multiclassProficiencies),
// not hand-maintained here — the per-class lists live in the dataset.

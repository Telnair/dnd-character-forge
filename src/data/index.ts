import classesJson from "./srd/classes.json";
import subclassesJson from "./srd/subclasses.json";
import racesJson from "./srd/races.json";
import subracesJson from "./srd/subraces.json";
import spellsJson from "./srd/spells.json";
import featsJson from "./srd/feats.json";
import backgroundsJson from "./srd/backgrounds.json";
import skillsJson from "./srd/skills.json";
import abilityScoresJson from "./srd/ability-scores.json";
import proficienciesJson from "./srd/proficiencies.json";
import featuresJson from "./srd/features.json";
import equipmentJson from "./srd/equipment.json";
import languagesJson from "./srd/languages.json";

import type {
  SrdAbilityScore,
  SrdBackground,
  SrdClass,
  SrdEquipment,
  SrdFeature,
  SrdLanguage,
  SrdProficiency,
  SrdRace,
  SrdSkill,
  SrdSpell,
  SrdSubclass,
  SrdSubrace,
} from "./types";

export const classes = classesJson as unknown as SrdClass[];
export const subclasses = subclassesJson as unknown as SrdSubclass[];
export const races = racesJson as unknown as SrdRace[];
export const subraces = subracesJson as unknown as SrdSubrace[];
export const spells = spellsJson as unknown as SrdSpell[];
export const feats = featsJson as unknown as SrdFeature[];
export const backgrounds = backgroundsJson as unknown as SrdBackground[];
export const skills = skillsJson as unknown as SrdSkill[];
export const abilityScores = abilityScoresJson as unknown as SrdAbilityScore[];
export const proficiencies = proficienciesJson as unknown as SrdProficiency[];
export const features = featuresJson as unknown as SrdFeature[];
export const equipment = equipmentJson as unknown as SrdEquipment[];
export const languages = languagesJson as unknown as SrdLanguage[];

function byIndex<T extends { index: string }>(arr: T[]): Map<string, T> {
  return new Map(arr.map((x) => [x.index, x]));
}

export const classMap = byIndex(classes);
export const subclassMap = byIndex(subclasses);
export const raceMap = byIndex(races);
export const subraceMap = byIndex(subraces);
export const spellMap = byIndex(spells);
export const backgroundMap = byIndex(backgrounds);
export const skillMap = byIndex(skills);
export const abilityScoreMap = byIndex(abilityScores);
export const proficiencyMap = byIndex(proficiencies);
export const featureMap = byIndex(features);
export const equipmentMap = byIndex(equipment);
export const languageMap = byIndex(languages);
export const featMap = byIndex(feats);

export const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityKey = (typeof ABILITY_ORDER)[number];

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const ABILITY_ABBR: Record<AbilityKey, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

/** Map a skill index to its governing ability. */
export const SKILL_ABILITY: Record<string, AbilityKey> = Object.fromEntries(
  skills.map((s) => [s.index, s.ability_score.index as AbilityKey])
);

/** Subclass index keyed by class index (SRD: one subclass each). */
export const subclassesByClass: Record<string, SrdSubclass[]> = (() => {
  const m: Record<string, SrdSubclass[]> = {};
  for (const s of subclasses) {
    (m[s.class.index] ??= []).push(s);
  }
  return m;
})();

export function spellsForClass(classIndex: string): SrdSpell[] {
  return spells.filter((s) => s.classes.some((c) => c.index === classIndex));
}

export function getFeatureName(index: string): string {
  return featureMap.get(index)?.name ?? index;
}

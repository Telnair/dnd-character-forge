// Data layer: imports the 2024 PHB dataset directly from the sibling `dnd2024`
// project and reshapes it in-memory into the maps the engine consumes.
//
// The 2024 output is mostly 5e-bits-shaped, but two things are split out and
// must be re-joined here: class progression lives in a separate Levels file,
// and subclass progression lives in the Features file (per subclass + level).

import classesJson from "dnd-2024/data/out/5e-SRD-Classes.json";
import levelsJson from "dnd-2024/data/out/5e-SRD-Levels.json";
import subclassesJson from "dnd-2024/data/out/5e-SRD-Subclasses.json";
import featuresJson from "dnd-2024/data/out/5e-SRD-Features.json";
import speciesJson from "dnd-2024/data/out/5e-SRD-Species.json";
import subspeciesJson from "dnd-2024/data/out/5e-SRD-Subspecies.json";
import backgroundsJson from "dnd-2024/data/out/5e-SRD-Backgrounds.json";
import equipmentJson from "dnd-2024/data/out/5e-SRD-Equipment.json";
import magicItemsJson from "dnd-2024/data/out/5e-SRD-Magic-Items.json";
import spellsJson from "dnd-2024/data/out/5e-SRD-Spells.json";
import featsJson from "dnd-2024/data/out/5e-SRD-Feats.json";
import proficienciesJson from "dnd-2024/data/out/5e-SRD-Proficiencies.json";
import languagesJson from "dnd-2024/data/out/5e-SRD-Languages.json";
import traitsJson from "dnd-2024/data/out/5e-SRD-Traits.json";

// Edition-neutral reference lists the 2024 dataset does not emit; kept locally.
import skillsJson from "./srd/skills.json";
import abilityScoresJson from "./srd/ability-scores.json";

import type {
  ApiRef,
  BackgroundView,
  Class,
  ClassWithLevels,
  Equipment,
  Feat,
  Feature,
  Language,
  Level,
  MagicItem,
  Proficiency,
  RaceView,
  SrdAbilityScore,
  SrdSkill,
  Spell,
  Species,
  Subclass,
  SubclassWithLevels,
  SubraceView,
  Subspecies,
  Trait,
} from "./types";

// --- Raw arrays -------------------------------------------------------------

const rawClasses = classesJson as unknown as Class[];
const rawLevels = levelsJson as unknown as Level[];
const rawSubclasses = subclassesJson as unknown as Subclass[];
const rawSpecies = speciesJson as unknown as Species[];
const rawSubspecies = subspeciesJson as unknown as Subspecies[];
const rawBackgrounds = backgroundsJson as unknown as BackgroundView[];

export const features = featuresJson as unknown as Feature[];
export const spells = spellsJson as unknown as Spell[];
export const feats = featsJson as unknown as Feat[];
export const equipment = equipmentJson as unknown as Equipment[];
export const magicItems = magicItemsJson as unknown as MagicItem[];
export const proficiencies = proficienciesJson as unknown as Proficiency[];
export const languages = languagesJson as unknown as Language[];
export const traits = traitsJson as unknown as Trait[];
export const skills = skillsJson as unknown as SrdSkill[];
export const abilityScores = abilityScoresJson as unknown as SrdAbilityScore[];

// --- Reshaping: merge per-level progression into classes & subclasses -------

const levelsByClass = new Map<string, Level[]>();
for (const lvl of rawLevels) {
  const key = lvl.class.index;
  (levelsByClass.get(key) ?? levelsByClass.set(key, []).get(key)!).push(lvl);
}
for (const arr of levelsByClass.values()) arr.sort((a, b) => a.level - b.level);

export const classes: ClassWithLevels[] = rawClasses.map((cls) => ({
  ...cls,
  levels: levelsByClass.get(cls.index) ?? [],
}));

// Subclass features carry `subclass` + `level`; group them into a levels table.
const subFeaturesBySubclass = new Map<string, Map<number, ApiRef[]>>();
for (const f of features) {
  const sub = f.subclass?.index;
  if (!sub) continue;
  const byLevel = subFeaturesBySubclass.get(sub) ?? new Map<number, ApiRef[]>();
  const refs = byLevel.get(f.level) ?? [];
  refs.push({ index: f.index, name: f.name, url: f.url });
  byLevel.set(f.level, refs);
  subFeaturesBySubclass.set(sub, byLevel);
}

export const subclasses: SubclassWithLevels[] = rawSubclasses.map((sub) => {
  const byLevel = subFeaturesBySubclass.get(sub.index);
  const levels = byLevel
    ? [...byLevel.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([level, features]) => ({ level, features }))
    : [];
  return { ...sub, levels };
});

// 2024 species carry no ability bonuses / direct languages (those moved to
// backgrounds / traits); normalize them to the engine's race/subrace shape.
export const races: RaceView[] = rawSpecies.map((sp) => ({
  ...sp,
  ability_bonuses: [],
  languages: [],
  subraces: sp.subspecies,
}));

export const subraces: SubraceView[] = rawSubspecies.map((ss) => ({
  ...ss,
  ability_bonuses: [],
  race: ss.species,
}));

export const backgrounds: BackgroundView[] = rawBackgrounds.map((bg) => ({
  ...bg,
  starting_equipment: [],
}));

// --- Index maps -------------------------------------------------------------

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
export const magicItemMap = byIndex(magicItems);
export const languageMap = byIndex(languages);
export const featMap = byIndex(feats);
export const traitMap = byIndex(traits);

// --- Ability score constants ------------------------------------------------

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

/** Subclasses keyed by class index. */
export const subclassesByClass: Record<string, SubclassWithLevels[]> = (() => {
  const m: Record<string, SubclassWithLevels[]> = {};
  for (const s of subclasses) {
    (m[s.class.index] ??= []).push(s);
  }
  return m;
})();

export function spellsForClass(classIndex: string): Spell[] {
  return spells.filter((s) => s.classes.some((c) => c.index === classIndex));
}

export function getFeatureName(index: string): string {
  return featureMap.get(index)?.name ?? index;
}

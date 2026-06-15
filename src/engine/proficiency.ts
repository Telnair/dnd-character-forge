import {
  ABILITY_ORDER,
  SKILL_ABILITY,
  backgroundMap,
  classMap,
  languageMap,
  proficiencyMap,
  raceMap,
  skillMap,
  skills as allSkills,
  type AbilityKey,
} from "@/data";
import { EXPERTISE_GRANTS, RACE_FIXED_SKILLS } from "./config";
import { abilityMods, finalAbilities } from "./abilities";
import { proficiencyBonus } from "./progression";
import type { CharacterDraft, SkillRow } from "./types";

/** Skill indexes the character is proficient in (from all sources, de-duplicated). */
export function proficientSkillSet(draft: CharacterDraft): Set<string> {
  const set = new Set<string>();

  // Race fixed + chosen.
  if (draft.raceIndex) {
    for (const s of RACE_FIXED_SKILLS[draft.raceIndex] ?? []) set.add(s);
  }
  for (const s of draft.raceSkillChoices ?? []) set.add(s);

  // Background.
  if (draft.backgroundIndex) {
    const bg = backgroundMap.get(draft.backgroundIndex);
    for (const p of bg?.starting_proficiencies ?? []) {
      const ref = proficiencyMap.get(p.index)?.reference;
      if (ref && skillMap.has(ref.index)) set.add(ref.index);
    }
  }
  for (const s of draft.backgroundSkillChoices ?? []) set.add(s);

  // Class skill choices.
  for (const entry of draft.classes) {
    for (const s of entry.skillChoices ?? []) set.add(s);
  }

  return set;
}

export function expertiseSkillSet(draft: CharacterDraft): Set<string> {
  return new Set(draft.expertiseChoices ?? []);
}

/** Total number of expertise picks available given current classes. */
export function expertiseSlots(draft: CharacterDraft): number {
  let n = 0;
  for (const grant of EXPERTISE_GRANTS) {
    const entry = draft.classes.find((c) => c.classIndex === grant.classIndex);
    if (entry && entry.level >= grant.level) n += grant.count;
  }
  return n;
}

export function computeSkills(draft: CharacterDraft): SkillRow[] {
  const finals = finalAbilities(draft);
  const mods = abilityMods(finals);
  const pb = proficiencyBonus(draft);
  const proficient = proficientSkillSet(draft);
  const expertise = expertiseSkillSet(draft);

  return allSkills
    .map((skill) => {
      const ability = SKILL_ABILITY[skill.index] as AbilityKey;
      const isProf = proficient.has(skill.index);
      const isExp = expertise.has(skill.index);
      const base = mods[ability];
      const modifier = base + (isProf ? pb : 0) + (isExp ? pb : 0);
      return {
        index: skill.index,
        name: skill.name,
        ability,
        proficient: isProf,
        expertise: isExp,
        modifier,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Saving throw proficiencies come from the primary (first) class only. */
export function savingThrowProficiencies(draft: CharacterDraft): Set<AbilityKey> {
  const primary = draft.classes.find((c) => c.isPrimary) ?? draft.classes[0];
  const set = new Set<AbilityKey>();
  if (!primary) return set;
  const cls = classMap.get(primary.classIndex);
  for (const st of cls?.saving_throws ?? []) {
    set.add(st.index as AbilityKey);
  }
  return set;
}

export function computeSavingThrows(draft: CharacterDraft) {
  const finals = finalAbilities(draft);
  const mods = abilityMods(finals);
  const pb = proficiencyBonus(draft);
  const profSet = savingThrowProficiencies(draft);
  return ABILITY_ORDER.map((ability) => {
    const proficient = profSet.has(ability);
    return {
      ability,
      proficient,
      modifier: mods[ability] + (proficient ? pb : 0),
    };
  });
}

export function computeLanguages(draft: CharacterDraft): string[] {
  const set = new Set<string>();
  set.add("Common");
  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  for (const l of race?.languages ?? []) set.add(l.name);
  for (const idx of draft.raceLanguageChoices ?? []) {
    set.add(languageMap.get(idx)?.name ?? idx);
  }
  for (const idx of draft.backgroundLanguageChoices ?? []) {
    set.add(languageMap.get(idx)?.name ?? idx);
  }
  return [...set].sort();
}

/** Categorized non-skill, non-save proficiencies from classes, race, background. */
export function computeOtherProficiencies(draft: CharacterDraft): {
  weapons: string[];
  armor: string[];
  tools: string[];
} {
  const weapons = new Set<string>();
  const armor = new Set<string>();
  const tools = new Set<string>();

  const place = (profIndex: string, name: string) => {
    const prof = proficiencyMap.get(profIndex);
    const type = prof?.type ?? "Other";
    if (type === "Weapons") weapons.add(name);
    else if (type === "Armor") armor.add(name);
    else if (
      type === "Artisan's Tools" ||
      type === "Gaming Sets" ||
      type === "Musical Instruments" ||
      type === "Vehicles"
    )
      tools.add(name);
  };

  // Primary class grants all listed proficiencies; later classes use limited set
  // but for display we include each class' base proficiencies.
  for (const entry of draft.classes) {
    const cls = classMap.get(entry.classIndex);
    for (const p of cls?.proficiencies ?? []) {
      if (p.index.startsWith("skill-") || p.index.startsWith("saving-throw"))
        continue;
      place(p.index, p.name.replace(/^Skill: /, ""));
    }
    for (const choices of Object.values(entry.profChoices ?? {})) {
      for (const idx of choices) {
        const p = proficiencyMap.get(idx);
        if (p) place(idx, p.name);
      }
    }
  }

  return {
    weapons: [...weapons].sort(),
    armor: [...armor].sort(),
    tools: [...tools].sort(),
  };
}

export const ABILITY_NAMES_FULL: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

import {
  ABILITY_ORDER,
  SKILL_ABILITY,
  backgroundMap,
  classMap,
  feats,
  languageMap,
  proficiencies,
  proficiencyMap,
  raceMap,
  skillMap,
  subraceMap,
  traitMap,
  skills as allSkills,
  type AbilityKey,
} from "@/data";
import { EXPERTISE_GRANTS } from "./config";
import { collectFeatGrants } from "./feats";
import { abilityMods, finalAbilities } from "./abilities";
import { proficiencyBonus } from "./progression";
import type { Trait } from "@/data/types";
import type { CharacterDraft, SkillRow } from "./types";

/** The resolved Trait entities of the chosen species + subspecies. */
export function speciesTraitList(draft: CharacterDraft): Trait[] {
  const out: Trait[] = [];
  const refs = [
    ...(draft.raceIndex ? raceMap.get(draft.raceIndex)?.traits ?? [] : []),
    ...(draft.subraceIndex ? subraceMap.get(draft.subraceIndex)?.traits ?? [] : []),
  ];
  for (const ref of refs) {
    const t = traitMap.get(ref.index);
    if (t) out.push(t);
  }
  return out;
}

export interface TraitChoiceGroup {
  choose: number;
  options: { index: string; name: string }[];
}

// Full skill / tool proficiency option sets, used to expand a `resource_list`
// trait choice ("a skill of your choice") that carries no enumerable options.
const ALL_SKILL_OPTS = proficiencies
  .filter((p) => p.type === "Skills")
  .map((p) => ({ index: p.index, name: p.name }));
const TRAIT_TOOL_TYPES = ["Artisan's Tools", "Musical Instruments", "Tools"];
const ALL_TOOL_OPTS = proficiencies
  .filter((p) => TRAIT_TOOL_TYPES.includes(p.type))
  .map((p) => ({ index: p.index, name: p.name }));

/** Expand one in-trait Choice to concrete options, resolving a `resource_list`
 *  ("any skill"/"any tool") from the full skill/tool sets by what its URL references. */
function expandTraitChoice(c: any): TraitChoiceGroup {
  let options = (c?.from?.options ?? [])
    .map((o: any) =>
      o?.option_type === "reference" && o?.item
        ? { index: o.item.index, name: o.item.name }
        : o?.option_type === "string" && typeof o.string === "string"
        ? { index: o.string, name: o.string }
        : null
    )
    .filter((o: any): o is { index: string; name: string } => !!o);
  if (options.length === 0 && c?.from?.option_set_type === "resource_list") {
    const url: string = c.from.resource_list_url ?? "";
    options = [
      ...(/skill/i.test(url) ? ALL_SKILL_OPTS : []),
      ...(/tool/i.test(url) ? ALL_TOOL_OPTS : []),
    ];
  }
  return { choose: c?.choose ?? 1, options };
}

/**
 * Every in-trait choice group a species trait offers: the subtrait variant pick
 * (Draconic Ancestry) plus each proficiency choice — a trait may grant more than one
 * (e.g. Warforged's separate skill and tool picks). Picks for all of a trait's groups
 * share `speciesTraitChoices[trait.index]`; they partition cleanly because each
 * group's options are disjoint (subtraits vs skills vs tools).
 */
export function speciesTraitChoiceGroups(trait: Trait): TraitChoiceGroup[] {
  const groups: TraitChoiceGroup[] = [];
  if (trait.trait_specific?.subtrait_options)
    groups.push(expandTraitChoice(trait.trait_specific.subtrait_options));
  for (const c of trait.proficiency_choices ?? []) groups.push(expandTraitChoice(c));
  return groups;
}

/**
 * The feat pick a trait's `feat_options` offers (Human Versatile → "an Origin feat
 * of your choice"), or null if the trait grants none. The pool is the feats dataset
 * filtered to the category named in the choice's `resource_list_url` `?type=` param
 * (`origin`); a missing type means any feat.
 */
export function traitFeatOptions(
  trait: Trait
): { choose: number; feats: { index: string; name: string }[] } | null {
  const fo = trait.feat_options as
    | { choose?: number; from?: { resource_list_url?: string } }
    | undefined;
  if (!fo) return null;
  const type = /[?&]type=([a-z-]+)/i.exec(fo.from?.resource_list_url ?? "")?.[1];
  const pool = feats
    .filter((f) => (type ? f.type === type : true))
    .map((f) => ({ index: f.index, name: f.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { choose: fo.choose ?? 1, feats: pool };
}

/** Skill indexes a species trait grants outright or via the player's choice. */
export function speciesGrantedSkills(draft: CharacterDraft): string[] {
  const out: string[] = [];
  const addProf = (idx?: string) => {
    if (idx && idx.startsWith("skill-")) out.push(idx.replace(/^skill-/, ""));
  };
  for (const trait of speciesTraitList(draft)) {
    for (const p of trait.proficiencies ?? []) addProf(p.index);
    if (trait.proficiency_choices) {
      for (const idx of draft.speciesTraitChoices?.[trait.index] ?? []) addProf(idx);
    }
  }
  return out;
}

/**
 * Skill proficiencies from every source *except* the proficiency-or-Expertise
 * feats (Keen Mind, Observant). Those feats grant Expertise only when the skill is
 * already proficient, so their own grant must be excluded when testing that — this
 * is the set used for that test.
 */
function baseProficientSkillSet(draft: CharacterDraft): Set<string> {
  const set = new Set<string>();

  // Species traits (fixed + chosen).
  for (const s of speciesGrantedSkills(draft)) set.add(s);

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

  // Unconditional feat-granted skill proficiencies (Skilled, Skill Expert, …).
  for (const s of collectFeatGrants(draft).skills) set.add(s);

  return set;
}

/** Skill indexes the character is proficient in (from all sources, de-duplicated). */
export function proficientSkillSet(draft: CharacterDraft): Set<string> {
  const set = baseProficientSkillSet(draft);
  // Proficiency-or-Expertise feats always confer at least proficiency.
  for (const s of collectFeatGrants(draft).conditionalExpertise) set.add(s);
  return set;
}

export function expertiseSkillSet(draft: CharacterDraft): Set<string> {
  const set = new Set(draft.expertiseChoices ?? []);
  const grants = collectFeatGrants(draft);
  for (const s of grants.expertise) set.add(s);
  // Proficiency-or-Expertise feats grant Expertise only where the skill is already
  // proficient from another source (their own grant is excluded from `base`).
  if (grants.conditionalExpertise.size) {
    const base = baseProficientSkillSet(draft);
    for (const s of grants.conditionalExpertise) if (base.has(s)) set.add(s);
  }
  return set;
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
  set.add("Common"); // 2024: every PC knows Common.
  // Bonus languages a species trait lets you choose.
  for (const trait of speciesTraitList(draft)) {
    if (!trait.language_options) continue;
    for (const idx of draft.speciesTraitChoices?.[trait.index] ?? []) {
      set.add(languageMap.get(idx)?.name ?? idx);
    }
  }
  // 2024 backgrounds grant no language choices (languages moved to species
  // traits / Common), so there's no background-language path to fold in here.
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

  // Feat-granted tool/instrument/kit proficiencies (Skilled, Crafter, Musician,
  // Skill Expert, …). These are tools by construction, so add them directly rather
  // than via `place` (whose type filter would drop kits typed "Other").
  for (const idx of collectFeatGrants(draft).tools) {
    const name = proficiencyMap.get(idx)?.name ?? idx;
    tools.add(name.replace(/^(Tool|Skill): /, ""));
  }

  // Species-trait proficiency choices: skills are handled in computeSkills; the
  // tool picks (e.g. Khoravar's Skill Versatility skill-or-tool) surface here.
  // Added directly — they're tools by construction (a non-skill pick from a
  // skill/tool choice), so we skip `place`'s type filter.
  for (const trait of speciesTraitList(draft)) {
    if (!trait.proficiency_choices) continue;
    for (const idx of draft.speciesTraitChoices?.[trait.index] ?? []) {
      if (idx.startsWith("skill-")) continue;
      const name = proficiencyMap.get(idx)?.name ?? idx;
      tools.add(name.replace(/^(Tool|Skill): /, ""));
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

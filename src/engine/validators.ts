import {
  ABILITY_ORDER,
  backgroundMap,
  classMap,
  raceMap,
} from "@/data";
import {
  RACE_FREE_LANGUAGES,
  RACE_FREE_SKILLS,
  STANDARD_ARRAY,
} from "./config";
import {
  pointBuyRemaining,
  raceAbilityChoiceCount,
} from "./abilities";
import { classOtherProfChoices, classSkillChoice } from "./choices";
import { expertiseSlots } from "./proficiency";
import { subclassUnlockedFor, allAsiOpportunities } from "./progression";
import {
  cantripsKnownFor,
  spellcastingEntries,
  spellsToChoose,
} from "./spells";
import type { CharacterDraft } from "./types";

export type StepId =
  | "race"
  | "class"
  | "abilities"
  | "background"
  | "skills"
  | "subclass"
  | "spells"
  | "equipment"
  | "advancement"
  | "details"
  | "review";

export function validateRace(d: CharacterDraft): string[] {
  const issues: string[] = [];
  if (!d.raceIndex) return ["Choose a race."];
  const race = raceMap.get(d.raceIndex);
  if (race && race.subraces.length > 0 && !d.subraceIndex) {
    issues.push("Choose a subrace.");
  }
  const abilityPicks = raceAbilityChoiceCount(d);
  if (abilityPicks > 0) {
    const total = ABILITY_ORDER.reduce(
      (s, k) => s + (d.raceAbilityChoices?.[k] ?? 0),
      0
    );
    if (total !== abilityPicks)
      issues.push(`Assign ${abilityPicks} racial ability point(s).`);
  }
  const freeSkills = RACE_FREE_SKILLS[d.raceIndex] ?? 0;
  if ((d.raceSkillChoices?.length ?? 0) !== freeSkills) {
    issues.push(`Choose ${freeSkills} racial skill(s).`);
  }
  const freeLangs = RACE_FREE_LANGUAGES[d.raceIndex] ?? 0;
  if ((d.raceLanguageChoices?.length ?? 0) !== freeLangs) {
    issues.push(`Choose ${freeLangs} bonus language(s).`);
  }
  return issues;
}

export function validateClass(d: CharacterDraft): string[] {
  if (d.classes.length === 0) return ["Choose a class."];
  if (!d.classes.some((c) => c.isPrimary)) return ["Set a primary class."];
  return [];
}

export function validateAbilities(d: CharacterDraft): string[] {
  const issues: string[] = [];
  const values = ABILITY_ORDER.map((k) => d.baseAbilities[k]);
  if (d.abilityMethod === "standard") {
    const sorted = [...values].sort((a, b) => b - a);
    const target = [...STANDARD_ARRAY].sort((a, b) => b - a);
    if (JSON.stringify(sorted) !== JSON.stringify(target)) {
      issues.push("Assign each standard array value exactly once.");
    }
  } else if (d.abilityMethod === "pointbuy") {
    if (pointBuyRemaining(d.baseAbilities) < 0)
      issues.push("Point-buy budget exceeded.");
    if (values.some((v) => v < 8 || v > 15))
      issues.push("Point-buy scores must be between 8 and 15.");
  } else {
    if (values.some((v) => v < 3 || v > 18))
      issues.push("Assign all six rolled scores.");
  }
  return issues;
}

export function validateBackground(d: CharacterDraft): string[] {
  const issues: string[] = [];
  if (!d.backgroundIndex) return ["Choose a background."];
  const bg = backgroundMap.get(d.backgroundIndex);
  const langs = bg?.language_options?.choose ?? 0;
  if ((d.backgroundLanguageChoices?.length ?? 0) !== langs) {
    issues.push(`Choose ${langs} background language(s).`);
  }
  return issues;
}

export function validateSkills(d: CharacterDraft): string[] {
  const issues: string[] = [];
  for (const entry of d.classes) {
    const spec = classSkillChoice(entry.classIndex);
    if (spec) {
      const chosen = entry.skillChoices ?? [];
      if (chosen.length !== spec.choose) {
        const name = classMap.get(entry.classIndex)?.name ?? entry.classIndex;
        issues.push(`${name}: choose ${spec.choose} skill(s).`);
      }
    }
    for (const pc of classOtherProfChoices(entry.classIndex)) {
      const chosen = entry.profChoices?.[pc.choiceIdx] ?? [];
      if (chosen.length !== pc.choose) {
        const name = classMap.get(entry.classIndex)?.name ?? entry.classIndex;
        issues.push(`${name}: choose ${pc.choose} ${pc.label.toLowerCase()}.`);
      }
    }
  }
  const expSlots = expertiseSlots(d);
  if (expSlots > 0 && (d.expertiseChoices?.length ?? 0) !== expSlots) {
    issues.push(`Choose ${expSlots} expertise skill(s).`);
  }
  return issues;
}

export function validateSubclass(d: CharacterDraft): string[] {
  const issues: string[] = [];
  for (const entry of d.classes) {
    if (subclassUnlockedFor(entry) && !entry.subclassIndex) {
      const name = classMap.get(entry.classIndex)?.name ?? entry.classIndex;
      issues.push(`Choose a subclass for ${name}.`);
    }
  }
  return issues;
}

export function validateSpells(d: CharacterDraft): string[] {
  const issues: string[] = [];
  for (const entry of spellcastingEntries(d)) {
    const name = classMap.get(entry.classIndex)?.name ?? entry.classIndex;
    const cantrips = cantripsKnownFor(entry);
    if ((entry.cantrips?.length ?? 0) !== cantrips) {
      issues.push(`${name}: choose ${cantrips} cantrip(s).`);
    }
    const spells = spellsToChoose(d, entry);
    if (spells.count > 0 && (entry.spells?.length ?? 0) !== spells.count) {
      issues.push(`${name}: choose ${spells.count} ${spells.label.toLowerCase()}.`);
    }
  }
  return issues;
}

export function validateEquipment(d: CharacterDraft): string[] {
  const issues: string[] = [];
  const primary = d.classes.find((c) => c.isPrimary) ?? d.classes[0];
  if (primary) {
    const cls = classMap.get(primary.classIndex);
    const opts = cls?.starting_equipment_options ?? [];
    opts.forEach((_, i) => {
      if (!primary.equipmentChoices?.[i]) {
        issues.push(`Select starting equipment option ${i + 1}.`);
      }
    });
  }
  const bg = d.backgroundIndex ? backgroundMap.get(d.backgroundIndex) : undefined;
  (bg?.starting_equipment_options ?? []).forEach((_, i) => {
    if (!d.backgroundEquipmentChoices?.[i]) {
      issues.push(`Select background equipment option ${i + 1}.`);
    }
  });
  return issues;
}

export function validateAdvancement(d: CharacterDraft): string[] {
  const issues: string[] = [];
  for (const opp of allAsiOpportunities(d)) {
    const choice = d.asiChoices?.[opp.key];
    if (!choice) {
      issues.push(`Resolve ASI/feat at ${opp.classIndex} level ${opp.level}.`);
      continue;
    }
    if (choice.kind === "asi") {
      const total = ABILITY_ORDER.reduce(
        (s, k) => s + (choice.increases?.[k] ?? 0),
        0
      );
      if (total !== 2) issues.push(`Assign 2 ability points at ${opp.classIndex} ${opp.level}.`);
    } else if (!choice.featIndex) {
      issues.push(`Choose a feat at ${opp.classIndex} ${opp.level}.`);
    }
  }
  return issues;
}

export function validateDetails(d: CharacterDraft): string[] {
  return d.name.trim() ? [] : ["Name your character."];
}

export function validateStep(step: StepId, d: CharacterDraft): string[] {
  switch (step) {
    case "race":
      return validateRace(d);
    case "class":
      return validateClass(d);
    case "abilities":
      return validateAbilities(d);
    case "background":
      return validateBackground(d);
    case "skills":
      return validateSkills(d);
    case "subclass":
      return validateSubclass(d);
    case "spells":
      return validateSpells(d);
    case "equipment":
      return validateEquipment(d);
    case "advancement":
      return validateAdvancement(d);
    case "details":
      return validateDetails(d);
    case "review":
      return [];
    default:
      return [];
  }
}

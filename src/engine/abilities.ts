import {
  ABILITY_ORDER,
  raceMap,
  subraceMap,
  type AbilityKey,
} from "@/data";
import { POINT_BUY_BUDGET, POINT_BUY_COST } from "./config";
import type { AbilityScores, CharacterDraft } from "./types";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function emptyAbilities(value = 8): AbilityScores {
  return {
    str: value,
    dex: value,
    con: value,
    int: value,
    wis: value,
    cha: value,
  };
}

export function pointBuySpent(scores: AbilityScores): number {
  return ABILITY_ORDER.reduce((sum, key) => {
    const cost = POINT_BUY_COST[scores[key]];
    return sum + (cost ?? 0);
  }, 0);
}

export function pointBuyRemaining(scores: AbilityScores): number {
  return POINT_BUY_BUDGET - pointBuySpent(scores);
}

/** Sum of racial + subracial ability bonuses, including player-chosen ones. */
export function racialBonuses(
  draft: CharacterDraft
): Partial<Record<AbilityKey, number>> {
  const bonuses: Partial<Record<AbilityKey, number>> = {};
  const add = (key: AbilityKey, n: number) => {
    bonuses[key] = (bonuses[key] ?? 0) + n;
  };

  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  if (race) {
    for (const b of race.ability_bonuses) {
      add(b.ability_score.index as AbilityKey, b.bonus);
    }
  }
  const subrace = draft.subraceIndex
    ? subraceMap.get(draft.subraceIndex)
    : undefined;
  if (subrace) {
    for (const b of subrace.ability_bonuses) {
      add(b.ability_score.index as AbilityKey, b.bonus);
    }
  }
  if (draft.raceAbilityChoices) {
    for (const key of ABILITY_ORDER) {
      const n = draft.raceAbilityChoices[key];
      if (n) add(key, n);
    }
  }
  return bonuses;
}

/** How many free +1 ability choices the chosen race grants (e.g. Half-Elf = 2). */
export function raceAbilityChoiceCount(draft: CharacterDraft): number {
  if (draft.raceIndex === "half-elf") return 2; // SRD Half-Elf: +1 to two others
  return 0;
}

/** Abilities that are fixed by the race (cannot be chosen for the free +1). */
export function raceFixedAbilities(draft: CharacterDraft): AbilityKey[] {
  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  if (!race) return [];
  return race.ability_bonuses.map((b) => b.ability_score.index as AbilityKey);
}

export function finalAbilities(draft: CharacterDraft): AbilityScores {
  const bonuses = racialBonuses(draft);
  const result = { ...draft.baseAbilities };
  for (const key of ABILITY_ORDER) {
    result[key] = (result[key] ?? 8) + (bonuses[key] ?? 0);
  }
  // Apply ASI increases.
  for (const choice of Object.values(draft.asiChoices ?? {})) {
    if (choice.kind === "asi" && choice.increases) {
      for (const key of ABILITY_ORDER) {
        result[key] += choice.increases[key] ?? 0;
      }
    }
  }
  // 5e cap of 20 from normal advancement.
  for (const key of ABILITY_ORDER) {
    result[key] = Math.min(result[key], 20);
  }
  return result;
}

export function abilityMods(scores: AbilityScores): Record<AbilityKey, number> {
  return {
    str: abilityModifier(scores.str),
    dex: abilityModifier(scores.dex),
    con: abilityModifier(scores.con),
    int: abilityModifier(scores.int),
    wis: abilityModifier(scores.wis),
    cha: abilityModifier(scores.cha),
  };
}

/** 4d6 drop lowest. */
export function roll4d6DropLowest(): number {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
  dice.sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}

export function rollAbilitySet(): number[] {
  return Array.from({ length: 6 }, roll4d6DropLowest);
}

import { ABILITY_ORDER, featMap, type AbilityKey } from "@/data";
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

/**
 * 2024 ability boosts come from the chosen background: assign +2/+1 (or
 * +1/+1/+1) among the background's three listed abilities. The player's
 * assignment is stored directly on the draft.
 */
export function backgroundAbilityBonuses(
  draft: CharacterDraft
): Partial<Record<AbilityKey, number>> {
  return draft.backgroundAbilityChoices ?? {};
}

/** Back-compat alias used by the abilities UI; same as background bonuses now. */
export const racialBonuses = backgroundAbilityBonuses;

/**
 * Ability increases from feats taken at ASIs, restricted to feats matching
 * `includeFeat`. Two sources: a feat's fixed `ability_bonuses` (e.g. Great Weapon
 * Master's +1 STR — always applied) and its chooseable `abilities` choices (the
 * player's picked ability contributes +1 each).
 */
function featAbilityIncreasesWhere(
  draft: CharacterDraft,
  includeFeat: (feat: any) => boolean
): Partial<Record<AbilityKey, number>> {
  const out: Partial<Record<AbilityKey, number>> = {};
  const add = (key: string, n: number) => {
    if ((ABILITY_ORDER as readonly string[]).includes(key)) {
      const k = key as AbilityKey;
      out[k] = (out[k] ?? 0) + n;
    }
  };
  for (const choice of Object.values(draft.asiChoices ?? {})) {
    if (choice.kind !== "feat" || !choice.featIndex) continue;
    const feat: any = featMap.get(choice.featIndex);
    if (!feat || !includeFeat(feat)) continue;
    // Fixed ability bonuses the feat always grants (not a player choice).
    for (const ab of feat.ability_bonuses ?? []) {
      add(ab?.ability_score?.index, ab?.bonus ?? 0);
    }
    // Chooseable increases — driven by the player's selections. Only an `abilities`
    // choice that's an actual score increase contributes +1; the structured
    // `ability_use` field (absent ⇒ increase) marks the picks that reuse the same
    // ability-list shape to choose a spellcasting ability (Magic Initiate, Mark of
    // Detection, Boon of Siberys) or a temp-HP ability (Greater Mark of Hospitality),
    // which must not bump the score.
    if (feat.choices && choice.featChoices) {
      feat.choices.forEach((spec: any, i: number) => {
        if (spec?.type !== "abilities") return;
        if ((spec.ability_use ?? "increase") !== "increase") return;
        for (const picked of choice.featChoices?.[i] ?? []) add(picked, 1);
      });
    }
  }
  return out;
}

/** Ability increases from non-epic feats (subject to the normal 20 cap). */
export function featAbilityIncreases(
  draft: CharacterDraft
): Partial<Record<AbilityKey, number>> {
  return featAbilityIncreasesWhere(draft, (f) => f.type !== "epic-boon");
}

/** Ability increases from epic boons. In 2024 these may raise a score above 20 (to 30). */
export function epicBoonAbilityIncreases(
  draft: CharacterDraft
): Partial<Record<AbilityKey, number>> {
  return featAbilityIncreasesWhere(draft, (f) => f.type === "epic-boon");
}

export function finalAbilities(draft: CharacterDraft): AbilityScores {
  const bonuses = backgroundAbilityBonuses(draft);
  const featInc = featAbilityIncreases(draft);
  const epicInc = epicBoonAbilityIncreases(draft);
  const result = { ...draft.baseAbilities };
  for (const key of ABILITY_ORDER) {
    result[key] = (result[key] ?? 8) + (bonuses[key] ?? 0) + (featInc[key] ?? 0);
  }
  // Apply ASI increases.
  for (const choice of Object.values(draft.asiChoices ?? {})) {
    if (choice.kind === "asi" && choice.increases) {
      for (const key of ABILITY_ORDER) {
        result[key] += choice.increases[key] ?? 0;
      }
    }
  }
  // Normal advancement (background, ASIs, non-epic feats) caps each score at 20.
  for (const key of ABILITY_ORDER) {
    result[key] = Math.min(result[key], 20);
  }
  // Epic boons (2024) may push a score past 20, up to a hard maximum of 30.
  for (const key of ABILITY_ORDER) {
    result[key] = Math.min(result[key] + (epicInc[key] ?? 0), 30);
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

import { abilityMods, finalAbilities } from "./abilities";
import type { CharacterDraft } from "./types";

/**
 * Computes the best unarmored AC across class features. Worn armor is tracked
 * separately at the equipment layer; this is the baseline shown on the sheet.
 */
export function computeArmorClass(draft: CharacterDraft): {
  ac: number;
  note: string;
} {
  const mods = abilityMods(finalAbilities(draft));
  let ac = 10 + mods.dex;
  let note = "Unarmored (10 + DEX)";

  const has = (idx: string) => draft.classes.some((c) => c.classIndex === idx);

  if (has("barbarian")) {
    const barb = 10 + mods.dex + mods.con;
    if (barb >= ac) {
      ac = barb;
      note = "Unarmored Defense (10 + DEX + CON)";
    }
  }
  if (has("monk")) {
    const monk = 10 + mods.dex + mods.wis;
    if (monk >= ac) {
      ac = monk;
      note = "Unarmored Defense (10 + DEX + WIS)";
    }
  }

  return { ac, note };
}

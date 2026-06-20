import { equipmentMap } from "@/data";
import { abilityMods, finalAbilities } from "./abilities";
import type { CharacterDraft, EquipmentItem } from "./types";

function categoryIndexes(index?: string): string[] {
  if (!index) return [];
  return equipmentMap.get(index)?.equipment_categories?.map((c) => c.index) ?? [];
}

/** AC granted by a piece of worn armor (null if the item isn't body armor). */
function wornArmorAc(index: string | undefined, dexMod: number): number | null {
  if (!index) return null;
  const cats = categoryIndexes(index);
  const isArmor = cats.some((c) => c === "light-armor" || c === "medium-armor" || c === "heavy-armor");
  const acDef = equipmentMap.get(index)?.armor_class;
  if (!isArmor || !acDef) return null;
  let ac = acDef.base;
  if (acDef.dex_bonus) {
    ac += acDef.max_bonus != null ? Math.min(dexMod, acDef.max_bonus) : dexMod;
  }
  return ac;
}

/**
 * Computes Armor Class from worn armor when present, otherwise the best
 * unarmored formula across class features. A shield (if carried) adds its
 * bonus in either case.
 */
export function computeArmorClass(
  draft: CharacterDraft,
  equipment: EquipmentItem[] = []
): {
  ac: number;
  note: string;
} {
  const mods = abilityMods(finalAbilities(draft));

  const shield = equipment.find((it) => categoryIndexes(it.index).includes("shields"));
  const shieldBonus = shield ? equipmentMap.get(shield.index!)?.armor_class?.base ?? 2 : 0;

  // Baseline: 10 + DEX, improved by Barbarian/Monk Unarmored Defense.
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

  // Worn armor wins when it beats the unarmored baseline (never lower the AC).
  for (const it of equipment) {
    const armorAc = wornArmorAc(it.index, mods.dex);
    if (armorAc != null && armorAc > ac) {
      ac = armorAc;
      note = equipmentMap.get(it.index!)?.name ?? it.name;
    }
  }

  return {
    ac: ac + shieldBonus,
    note: shield ? `${note} + Shield` : note,
  };
}

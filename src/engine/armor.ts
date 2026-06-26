import { equipmentMap, magicItemMap } from "@/data";
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
  const ps = draft.playState;

  // Equipped magic items (worn) contribute AC: a body-armor bonus stacks on top of
  // worn armor; a magic shield's bonus competes with a mundane shield (you hold one).
  let magicArmorBonus = 0;
  let magicShieldBonus = 0;
  for (const owned of draft.magicItems ?? []) {
    if (!owned.equipped) continue;
    const c = magicItemMap.get(owned.index)?.combat;
    if (!c) continue;
    const scaled = c.scales_with_rarity ? owned.bonus ?? 0 : 0;
    if (c.applies_to === "armor") magicArmorBonus += (c.ac_bonus ?? 0) + scaled;
    else if (c.applies_to === "shield")
      magicShieldBonus = Math.max(magicShieldBonus, 2 + (c.ac_bonus ?? 0) + scaled);
  }

  // Shield: an explicitly equipped mundane shield, else any shield carried; a magic
  // shield wins if it grants more.
  const mundaneShield = ps?.equippedShield
    ? equipment.find((it) => it.index === ps.equippedShield)
    : equipment.find((it) => categoryIndexes(it.index).includes("shields"));
  const mundaneShieldBonus = mundaneShield
    ? equipmentMap.get(mundaneShield.index!)?.armor_class?.base ?? 2
    : 0;
  const shieldBonus = Math.max(mundaneShieldBonus, magicShieldBonus);

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

  // Worn body armor: the explicitly equipped piece, else the best carried (never
  // lowering the unarmored baseline).
  const equippedArmorAc = ps?.equippedArmor ? wornArmorAc(ps.equippedArmor, mods.dex) : null;
  if (equippedArmorAc != null) {
    ac = equippedArmorAc;
    note = equipmentMap.get(ps!.equippedArmor!)?.name ?? "Armor";
  } else if (!ps?.equippedArmor) {
    for (const it of equipment) {
      const armorAc = wornArmorAc(it.index, mods.dex);
      if (armorAc != null && armorAc > ac) {
        ac = armorAc;
        note = equipmentMap.get(it.index!)?.name ?? it.name;
      }
    }
  }

  ac += magicArmorBonus;
  if (magicArmorBonus > 0) note += ` +${magicArmorBonus} magic`;

  return {
    ac: ac + shieldBonus,
    note: shieldBonus > 0 ? `${note} + Shield` : note,
  };
}

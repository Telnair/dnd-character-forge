import { equipmentMap, magicItemMap } from "@/data";
import type { MagicItem } from "@/data/types";
import type { CharacterDraft, DerivedSheet, EquipmentItem } from "./types";

type Combat = NonNullable<MagicItem["combat"]>;

function categoryIndexes(index?: string): string[] {
  if (!index) return [];
  return equipmentMap.get(index)?.equipment_categories?.map((c) => c.index) ?? [];
}

function isBodyArmor(cats: string[]): boolean {
  return cats.some((c) => c === "light-armor" || c === "medium-armor" || c === "heavy-armor");
}

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Short human-readable summary of a magic item's combat effect for the Worn list. */
function effectSummary(c: Combat | undefined, bonus: number | undefined): string {
  if (!c) return "";
  const parts: string[] = [];
  if (c.scales_with_rarity) {
    parts.push(bonus != null ? `${fmt(bonus)} ${c.applies_to === "armor" || c.applies_to === "shield" ? "AC" : "attack & damage"}` : "choose +1 / +2 / +3");
  } else {
    if (c.applies_to === "shield") {
      parts.push(`${fmt(2 + (c.ac_bonus ?? 0))} AC`);
    } else if (c.ac_bonus != null) {
      parts.push(`${fmt(c.ac_bonus)} AC`);
    }
    if (c.attack_bonus != null && c.attack_bonus === c.damage_bonus) {
      parts.push(`${fmt(c.attack_bonus)} attack & damage`);
    } else {
      if (c.attack_bonus != null) parts.push(`${fmt(c.attack_bonus)} attack`);
      if (c.damage_bonus != null) parts.push(`${fmt(c.damage_bonus)} damage`);
    }
  }
  for (const ed of c.extra_damage ?? []) {
    parts.push(`+${ed.dice}${ed.damage_type ? ` ${ed.damage_type.name}` : ""}`);
  }
  return parts.join(" · ");
}

/** AC text for a mundane armor row in the Worn list. */
function mundaneArmorEffect(index: string): string {
  const ac = equipmentMap.get(index)?.armor_class;
  if (!ac) return "";
  const dex = ac.dex_bonus ? (ac.max_bonus != null ? ` + DEX (max ${ac.max_bonus})` : " + DEX") : "";
  return `AC ${ac.base}${dex}`;
}

/**
 * The character's worn/wielded items for the Equipped / Worn section: every owned
 * magic item (with its configured base weapon / chosen +N / equipped state) plus the
 * mundane body armor and shields they carry (which can be equipped to drive AC).
 */
export function computeWornItems(
  draft: CharacterDraft,
  equipmentItems: EquipmentItem[]
): DerivedSheet["wornItems"] {
  const out: DerivedSheet["wornItems"] = [];
  const ps = draft.playState;

  (draft.magicItems ?? []).forEach((owned, ref) => {
    const mi = magicItemMap.get(owned.index);
    if (!mi) return;
    const c = mi.combat;
    const kind = c?.applies_to ?? "other";
    const isWeapon = kind === "weapon" || kind === "ammunition";
    out.push({
      ref,
      index: mi.index,
      name: mi.name,
      kind,
      magic: true,
      equipped: !!owned.equipped,
      attunement: mi.attunement,
      effect: effectSummary(c, owned.bonus),
      baseWeapon: owned.baseWeapon,
      needsBase: isWeapon && !owned.baseWeapon,
      needsBonus: !!c?.scales_with_rarity && owned.bonus == null,
      bonus: owned.bonus,
    });
  });

  // Mundane armor / shields the character carries — equippable, drive AC.
  for (const item of equipmentItems) {
    if (!item.index) continue;
    const cats = categoryIndexes(item.index);
    const shield = cats.includes("shields");
    const armor = isBodyArmor(cats);
    if (!shield && !armor) continue;
    out.push({
      index: item.index,
      name: item.name,
      kind: shield ? "shield" : "armor",
      magic: false,
      equipped: shield ? ps?.equippedShield === item.index : ps?.equippedArmor === item.index,
      attunement: false,
      effect: shield
        ? `${fmt(equipmentMap.get(item.index)?.armor_class?.base ?? 2)} AC`
        : mundaneArmorEffect(item.index),
    });
  }

  return out;
}

import { classMap, equipmentMap, magicItemMap, proficiencyMap, type AbilityKey } from "@/data";
import type { Equipment } from "@/data/types";
import { speciesTraitList } from "./proficiency";
import type { AbilityScores, CharacterDraft, DerivedSheet, EquipmentItem } from "./types";

/**
 * Weapon-proficiency indexes the character holds, from their classes (base
 * proficiencies + tool-style `profChoices`) and species traits. These are the
 * category/specific-weapon proficiency indexes (`simple-weapons`,
 * `martial-weapons`, `martial-weapons-finesse`, `longswords`, …) matched against
 * a weapon by `weaponProficient`.
 */
export function weaponProficiencyIndexes(draft: CharacterDraft): Set<string> {
  const out = new Set<string>();
  const add = (idx: string) => {
    if (proficiencyMap.get(idx)?.type === "Weapons") out.add(idx);
  };
  for (const entry of draft.classes) {
    const cls = classMap.get(entry.classIndex);
    for (const p of cls?.proficiencies ?? []) add(p.index);
    for (const choices of Object.values(entry.profChoices ?? {})) {
      for (const idx of choices) add(idx);
    }
  }
  for (const trait of speciesTraitList(draft)) {
    for (const p of trait.proficiencies ?? []) add(p.index);
    for (const idx of draft.speciesTraitChoices?.[trait.index] ?? []) add(idx);
  }
  return out;
}

/** Whether a held set of weapon-proficiency indexes covers a given weapon. */
export function weaponProficient(profIdx: Set<string>, w: Equipment): boolean {
  const cats = new Set(w.equipment_categories.map((c) => c.index));
  const props = new Set((w.properties ?? []).map((p) => p.index));
  if (profIdx.has("simple-weapons") && cats.has("simple-weapons")) return true;
  if (profIdx.has("martial-weapons") && cats.has("martial-weapons")) return true;
  if (profIdx.has("martial-weapons-finesse") && cats.has("martial-weapons") && props.has("finesse"))
    return true;
  if (profIdx.has("martial-weapons-light") && cats.has("martial-weapons") && props.has("light"))
    return true;
  // Specific-weapon proficiencies (Longswords, Rapiers, …) reference the weapon index.
  for (const pi of profIdx) {
    if (proficiencyMap.get(pi)?.reference?.index === w.index) return true;
  }
  return false;
}

/**
 * The ability a weapon attacks with: ranged weapons use Dexterity; Finesse melee
 * weapons use the better of Strength/Dexterity; all other melee weapons use
 * Strength (this also covers Thrown weapons, which use their melee ability).
 */
function weaponAbility(w: Equipment, mods: Record<AbilityKey, number>): AbilityKey {
  const cats = new Set(w.equipment_categories.map((c) => c.index));
  const props = new Set((w.properties ?? []).map((p) => p.index));
  if (cats.has("ranged-weapons")) return "dex";
  if (props.has("finesse")) return mods.dex >= mods.str ? "dex" : "str";
  return "str";
}

/**
 * Resolve the character's weapons — the catalog weapons in their equipment list —
 * into attack/damage rows. Attack bonus = ability mod + proficiency bonus (when
 * proficient); damage adds the same ability mod to the weapon's dice. Versatile
 * two-handed damage and the active Mastery property (when the weapon is one of the
 * character's mastery picks) are carried for display.
 */
export function computeWeapons(
  draft: CharacterDraft,
  equipmentItems: EquipmentItem[],
  mods: AbilityScores,
  pb: number
): DerivedSheet["weapons"] {
  const profIdx = weaponProficiencyIndexes(draft);
  const masterySet = new Set(draft.weaponMasteryChoices ?? []);
  const out: DerivedSheet["weapons"] = [];

  // Build a weapon row from a catalog weapon `w`, with optional magic overrides
  // (extra attack/damage bonus, extra damage, a display name, magic provenance).
  const buildRow = (
    w: Equipment,
    opts: {
      index?: string;
      name?: string;
      quantity?: number;
      attackBonus?: number;
      damageBonus?: number;
      extraDamage?: { dice: string; type?: string }[];
      magic?: string;
      attunement?: boolean;
    } = {}
  ): DerivedSheet["weapons"][number] => {
    const ability = weaponAbility(w, mods);
    const abilityMod = mods[ability];
    const proficient = weaponProficient(profIdx, w);
    const cats = new Set(w.equipment_categories.map((c) => c.index));
    const dmgBonus = abilityMod + (opts.damageBonus ?? 0);
    return {
      index: opts.index ?? w.index,
      name: opts.name ?? w.name,
      quantity: opts.quantity ?? 1,
      kind: cats.has("ranged-weapons") ? "ranged" : "melee",
      ability,
      proficient,
      attackBonus: abilityMod + (proficient ? pb : 0) + (opts.attackBonus ?? 0),
      damageDice: w.damage!.damage_dice,
      damageBonus: dmgBonus,
      damageType: w.damage!.damage_type.name,
      versatile: w.two_handed_damage
        ? {
            dice: w.two_handed_damage.damage_dice,
            bonus: dmgBonus,
            type: w.two_handed_damage.damage_type.name,
          }
        : undefined,
      extraDamage: opts.extraDamage,
      properties: (w.properties ?? []).map((p) => p.name),
      mastery: masterySet.has(w.index) ? w.mastery?.name : undefined,
      range: w.range,
      throwRange: w.throw_range,
      magic: opts.magic,
      attunement: opts.attunement,
    };
  };

  // Mundane catalog weapons in the equipment list.
  for (const item of equipmentItems) {
    if (!item.index) continue;
    const w = equipmentMap.get(item.index);
    if (!w?.damage) continue;
    out.push(buildRow(w, { quantity: item.quantity }));
  }

  // Magic weapons: an owned magic item that modifies a base weapon the player chose.
  // The attack row is the base weapon's stats plus the item's bonuses / extra damage.
  for (const owned of draft.magicItems ?? []) {
    const mi = magicItemMap.get(owned.index);
    const c = mi?.combat;
    if (!mi || !c || (c.applies_to !== "weapon" && c.applies_to !== "ammunition")) continue;
    if (!owned.baseWeapon) continue; // no base chosen yet — surfaced in the Worn section
    const base = equipmentMap.get(owned.baseWeapon);
    if (!base?.damage) continue;
    const scaled = c.scales_with_rarity ? owned.bonus ?? 0 : 0;
    out.push(
      buildRow(base, {
        index: mi.index,
        name: `${mi.name} (${base.name})`,
        attackBonus: (c.attack_bonus ?? 0) + scaled,
        damageBonus: (c.damage_bonus ?? 0) + scaled,
        extraDamage: c.extra_damage?.map((ed) => ({ dice: ed.dice, type: ed.damage_type?.name })),
        magic: mi.name,
        attunement: mi.attunement,
      })
    );
  }
  return out;
}

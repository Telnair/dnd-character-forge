import { forwardRef, useCallback, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import {
  ABILITY_NAMES,
  ABILITY_ORDER,
  classMap,
  equipment,
  magicItems,
  magicItemMap,
  skillMap,
  spellMap,
} from "@/data";
import { formatModifier, type DerivedSheet, type PlayState } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { ABILITY_COLORS } from "@/assets/abilityColors";
import { SkillIcon } from "@/assets/SkillIcon";
import { Tooltip } from "@/ui/Tooltip";
import { SpellTooltip, slotAccess, type SpellAccess } from "@/ui/SpellCard";
import { FeatureTooltip, RECHARGE_LABEL, ACTION_LABEL } from "@/ui/FeatureCard";
import { CostIcon, type SlotKind } from "@/ui/CostIcon";

// Autocomplete catalog for "Add equipment": mundane gear + magic items. Free text
// is still allowed; this only drives suggestions and resolves a typed/picked name to
// the right thing (a magic item → draft.magicItems; mundane gear → canonical name).
const CATALOG_ITEMS: { name: string; magic: boolean }[] = (() => {
  const seen = new Set<string>();
  const list: { name: string; magic: boolean }[] = [];
  for (const m of magicItems) {
    const lc = m.name.toLowerCase();
    if (!seen.has(lc)) (seen.add(lc), list.push({ name: m.name, magic: true }));
  }
  for (const e of equipment) {
    const lc = e.name.toLowerCase();
    if (!seen.has(lc)) (seen.add(lc), list.push({ name: e.name, magic: false }));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
})();
const CANONICAL_BY_LC = new Map(equipment.map((e) => [e.name.toLowerCase(), e.name]));
const MAGIC_BY_LC = new Map(magicItems.map((m) => [m.name.toLowerCase(), m]));
/** Catalog weapons, for the magic-weapon base-weapon picker in the Worn section. */
const WEAPON_OPTIONS = equipment
  .filter((e) => e.damage)
  .map((e) => ({ index: e.index, name: e.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const Sheet = styled.div`
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(245, 196, 81, 0.06), transparent 55%),
    linear-gradient(180deg, #17120e, #100c09);
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1rem;
  color: ${({ theme }) => theme.colors.text};
  box-shadow: ${({ theme }) => theme.shadow.panel};
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.7rem;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Name = styled.h1`
  font-size: clamp(1.7rem, 3vw, 2.45rem);
  color: ${({ theme }) => theme.colors.goldBright};
  text-shadow: 0 0 20px rgba(245, 196, 81, 0.3);
  line-height: 1;
  margin: 0;
`;

const SubLine = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.18rem;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text};
`;

const LevelBadge = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.ink};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.ember});
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  flex: 0 0 auto;
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0.8rem;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  padding: 0.7rem;
`;

const FeaturesCard = styled(Card)`
  padding: 1rem;
`;

const SkillGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 0.15rem;
  margin: 0.3rem 0 0.25rem;
`;

const SkillGroupLabel = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.92rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
`;

const CardLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.95rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ember};
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
`;

const CardBody = styled.div`
  margin-top: 0.85rem;
`;

const CardContent = styled.div`
  margin-top: 0.85rem;
`;

const StatGridFull = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  @media (max-width: 860px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const AbilityBox = styled.div<{ $color: string }>`
  border: 1px solid ${({ $color }) => $color}66;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.3);
  padding: 0.4rem;
  text-align: center;
  position: relative;
`;

const AbAbbr = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  letter-spacing: 0.1em;
  color: ${({ $color }) => $color};
  text-transform: uppercase;
`;

const AbMod = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text};
`;

const AbScore = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textDim};
`;

const Stat = styled.div`
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.45rem;
  background: rgba(0, 0, 0, 0.25);
`;

const StatValue = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.95rem;
  min-width: 4.5rem;
  margin: 0 auto;
  font-variant-numeric: tabular-nums;
`;

const StatNum = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.goldBright};
  font-variant-numeric: tabular-nums;
`;

const StatName = styled.div`
  font-size: 0.81rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textDim};
`;

const HpControl = styled.div`
  display: grid;
  grid-template-columns: 1.35rem minmax(4.5rem, max-content) 1.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
`;

const HpBtn = styled.button`
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(0, 0, 0, 0.4);
  color: ${({ theme }) => theme.colors.goldBright};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  &:hover {
    background: rgba(245, 196, 81, 0.12);
  }
`;

const SkillLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.12rem 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.92rem;
`;

const Dot = styled.span<{ $on: boolean; $exp?: boolean }>`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.colors.gold};
  background: ${({ theme, $on, $exp }) =>
    $exp ? theme.colors.ember : $on ? theme.colors.gold : "transparent"};
  display: inline-block;
  margin-right: 0.5rem;
  flex: 0 0 auto;
`;

const Mod = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  color: ${({ theme }) => theme.colors.goldBright};
  min-width: 32px;
  text-align: right;
`;

const SkillGroup = styled.div`
  margin-bottom: 1rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const tagText = css`
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1rem;
  line-height: 1.35;
  font-variant-numeric: lining-nums tabular-nums;
  font-feature-settings: "lnum" 1, "tnum" 1;
  letter-spacing: 0.01em;
`;

const TagWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
`;

const Tag = styled.span<{ $coin?: boolean }>`
  ${tagText}
  padding: 0.28rem 0.6rem;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $coin }) => ($coin ? `${theme.colors.goldBright}55` : theme.colors.border)};
  background: ${({ $coin }) => ($coin ? "rgba(245,196,81,0.1)" : "rgba(0, 0, 0, 0.3)")};
  color: ${({ theme, $coin }) => ($coin ? theme.colors.text : theme.colors.textDim)};
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

// Leading "source" label in a spell-list block (the granting feat / feature /
// subclass / species). Deliberately distinct from the spell Tags beside it —
// dashed gold outline + italic gold text — so it reads as a heading, not a spell.
const SourceTag = styled.span`
  ${tagText}
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border-radius: 6px;
  border: 1px dashed ${({ theme }) => `${theme.colors.goldBright}66`};
  background: rgba(245, 196, 81, 0.08);
  color: ${({ theme }) => theme.colors.goldBright};
  font-style: italic;
`;

const SaveTag = styled(Tag)<{ $proficient?: boolean }>`
  color: ${({ theme, $proficient }) =>
    $proficient ? theme.colors.goldBright : theme.colors.textDim};
  border-color: ${({ theme, $proficient }) =>
    $proficient ? theme.colors.borderStrong : theme.colors.border};
  flex: 0 0 auto;
`;

const TagButton = styled.button`
  ${tagText}
  padding: 0.28rem 0.6rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.textDim};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const EquipTagInput = styled.input`
  ${tagText}
  padding: 0.28rem 0.6rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.text};
  min-width: 120px;
  max-width: 200px;
  &:focus {
    outline: none;
  }
`;

const EquipInputWrap = styled.div`
  position: relative;
  display: inline-flex;
`;

const Suggestions = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  min-width: 200px;
  max-width: 260px;
  max-height: 230px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0.25rem;
  background: ${({ theme }) => theme.colors.panelSolid};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.panel};
`;

const SuggestionItem = styled.button<{ $active: boolean }>`
  ${tagText}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-align: left;
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.ink : theme.colors.text)};
  background: ${({ theme, $active }) => ($active ? theme.colors.goldBright : "transparent")};
  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.goldBright : "rgba(245, 196, 81, 0.14)"};
  }
`;

const SuggestionTag = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.arcaneBright};
  border: 1px solid ${({ theme }) => theme.colors.arcaneBright}66;
  border-radius: 999px;
  padding: 0.05rem 0.35rem;
  flex: 0 0 auto;
`;

const TagRemove = styled.button`
  border: none;
  background: none;
  color: inherit;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  opacity: 0.65;
  &:hover {
    opacity: 1;
  }
`;

const FeatureName = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.gold};
`;

const ResourceBlock = styled.div`
  margin-bottom: 0.85rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const ResourceLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDim};
  margin-bottom: 0.35rem;
`;

const CircleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const ResourceCircle = styled.button<{ $used: boolean; $tone?: "arcane" | "gold" }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid
    ${({ theme, $tone }) =>
      $tone === "arcane" ? theme.colors.arcaneBright : theme.colors.gold};
  background: ${({ theme, $used, $tone }) =>
    $used
      ? "transparent"
      : $tone === "arcane"
        ? theme.colors.arcane
        : theme.colors.gold};
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease;
  &:hover {
    filter: brightness(1.15);
  }
`;

const CharacterSection = styled.div`
  &:not(:first-of-type) {
    margin-top: 1.1rem;
    padding-top: 0.85rem;
    border-top: 1px dashed ${({ theme }) => theme.colors.border};
  }
`;

const Prose = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.textDim};
  font-size: 1.1rem;
  line-height: 1.55;
  margin: 0.2rem 0 0;
  white-space: pre-wrap;
`;

const MutedNote = styled.div`
  font-size: 1rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: 6px;
`;

const SpellClassBlock = styled.div`
  margin-bottom: 0.9rem;
`;

const SpellListBlock = styled.div`
  margin-top: 0.75rem;
`;

const WeaponList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

const WeaponRow = styled.div<{ $equipped: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 0.9rem;
  padding: 0.5rem 0.65rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ theme, $equipped }) => ($equipped ? `${theme.colors.goldBright}66` : theme.colors.border)};
  background: ${({ $equipped }) =>
    $equipped ? "rgba(245, 196, 81, 0.08)" : "rgba(0, 0, 0, 0.28)"};
`;

const WeaponMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1 1 9rem;
  min-width: 9rem;
`;

const WeaponName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.text};
`;

const HandBadge = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.goldBright};
  border: 1px solid ${({ theme }) => `${theme.colors.goldBright}66`};
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
`;

const MagicBadge = styled(HandBadge)`
  color: ${({ theme }) => theme.colors.arcaneBright};
  border-color: ${({ theme }) => `${theme.colors.arcaneBright}66`};
`;

const AttuneBadge = styled(HandBadge)`
  color: ${({ theme }) => theme.colors.ember};
  border-color: ${({ theme }) => `${theme.colors.ember}66`};
`;

const WarnBadge = styled(HandBadge)`
  color: ${({ theme }) => theme.colors.emberBright};
  border-color: ${({ theme }) => `${theme.colors.emberBright}66`};
  text-transform: none;
`;

const WarnTag = styled.span`
  ${tagText}
  padding: 0.28rem 0.6rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => `${theme.colors.ember}66`};
  background: rgba(232, 100, 42, 0.1);
  color: ${({ theme }) => theme.colors.emberBright};
`;

const WornControls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textDim};
`;

const WornSelect = styled.select`
  ${tagText}
  font-size: 0.85rem;
  padding: 0.2rem 0.4rem;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.panelSolid};
  color: ${({ theme }) => theme.colors.text};
  max-width: 12rem;
  &:focus {
    outline: none;
  }
`;

const WeaponMeta = styled.div`
  font-size: 0.85rem;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.textDim};
`;

const WeaponStats = styled.div`
  display: flex;
  gap: 0.45rem;
  flex: 0 0 auto;
`;

const WeaponStat = styled.div`
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.25);
  padding: 0.3rem 0.55rem;
  min-width: 3.2rem;
`;

const WeaponStatVal = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.goldBright};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const WeaponStatName = styled.div`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${({ theme }) => theme.colors.textDim};
`;

// Theme-styled equip toggle rendered as a checkbox (not a native browser one).
const EquipCheck = styled.button<{ $on: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  padding: 0.2rem 0;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.92rem;
  letter-spacing: 0.02em;
  color: ${({ theme, $on }) => ($on ? theme.colors.goldBright : theme.colors.textDim)};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const CheckBox = styled.span<{ $on: boolean }>`
  width: 17px;
  height: 17px;
  border-radius: 5px;
  border: 1.5px solid
    ${({ theme, $on }) => ($on ? theme.colors.goldBright : theme.colors.borderStrong)};
  background: ${({ theme, $on }) => ($on ? theme.colors.goldBright : "rgba(0, 0, 0, 0.3)")};
  color: ${({ theme }) => theme.colors.ink};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  line-height: 1;
  flex: 0 0 auto;
  box-shadow: ${({ theme, $on }) => ($on ? theme.shadow.glow : "none")};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
`;

/** "1d8 +3 Slashing" (the +0 is shown for parity with the rest of the sheet). */
function formatDamage(dice: string, bonus: number, type: string): string {
  return `${dice} ${formatModifier(bonus)} ${type}`;
}

function rangeNote(w: DerivedSheet["weapons"][number]): string | undefined {
  if (w.range) return `Range ${w.range.normal}${w.range.long ? `/${w.range.long}` : ""} ft.`;
  if (w.throwRange) return `Thrown ${w.throwRange.normal}/${w.throwRange.long} ft.`;
  return undefined;
}

function skillDesc(index: string): string | undefined {
  return skillMap.get(index)?.desc?.join("\n\n");
}

function slotArray(playState: PlayState | undefined, key: string, total: number): boolean[] {
  const existing = playState?.usedSlots?.[key];
  if (existing && existing.length === total) return existing;
  return Array.from({ length: total }, () => false);
}

function isExtraEquipment(name: string, extra: string[] | undefined): boolean {
  const lc = name.toLowerCase();
  return (extra ?? []).some((e) => e.toLowerCase() === lc);
}

/** Short label for how a feature-granted spell may be cast. */
function featureSpellUsage(
  usage: "at_will" | "per_long_rest" | "always_prepared",
  times?: number
): string {
  if (usage === "at_will") return "at will";
  if (usage === "always_prepared") return "always prepared";
  return times ? `${times}/Long Rest` : "free cast/Long Rest";
}

/**
 * Cast economy for a feature-granted spell: the granting feature's cast time, the
 * free-cast cadence + recharge, and the resource cost. "At will" is shown only when
 * the cast is truly free — when a resource cost exists it would contradict it.
 */
function featureSpellAccess(
  s: DerivedSheet["featureSpells"][number]["spells"][number],
  fs: DerivedSheet["featureSpells"][number]
): SpellAccess {
  // Always-prepared grants are cast with spell slots (like subclass spells); a
  // feature's own resource cost (Sorcery Point, Channel Divinity, …) wins over that.
  let cost: SpellAccess["cost"] =
    fs.activation?.cost ?? (s.usage === "always_prepared" ? "spell_slot" : undefined);
  // A Warlock's "spell slot" is a Pact Magic slot (display-only — see CostIcon).
  if (cost === "spell_slot" && fs.classIndex === "warlock") cost = "pact_slot";
  const notes: string[] = [];
  if (s.usage === "always_prepared") notes.push("Always prepared");
  else if (s.usage === "per_long_rest") notes.push(s.times ? `${s.times} / Long Rest` : "Per Long Rest");
  else if (!fs.activation?.cost) notes.push("At will"); // at_will, and only when nothing is spent
  // Recharge only when it isn't already implied by a per-Long-Rest cadence.
  if (fs.recharge && s.usage !== "per_long_rest") {
    const r = fs.recharge;
    notes.push(`↻ ${r.uses != null ? `${r.uses} / ` : ""}${RECHARGE_LABEL[r.condition]}`);
  }
  return {
    castTime: fs.activation ? ACTION_LABEL[fs.activation.action_type] : undefined,
    notes,
    cost,
  };
}

/** Cast economy for an always-prepared spell (subclass / species grants).
 *  `pact` ⇒ the slot is a Warlock Pact Magic slot. */
function preparedAccess(index: string, pact = false): SpellAccess {
  if ((spellMap.get(index)?.level ?? 0) === 0) return { notes: ["At will"] };
  return { notes: ["Always prepared"], cost: pact ? "pact_slot" : "spell_slot" };
}

export const CharacterSheet = forwardRef<
  HTMLDivElement,
  { sheet: DerivedSheet; interactive?: boolean }
>(function CharacterSheet({ sheet, interactive = true }, ref) {
  const { draft, update } = useCharacter();
  const playState = draft.playState;
  const [addingEquip, setAddingEquip] = useState(false);
  const [equipDraft, setEquipDraft] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const equipSuggestions = useMemo(() => {
    const q = equipDraft.trim().toLowerCase();
    if (!q) return [];
    return CATALOG_ITEMS.filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [equipDraft]);

  const currentHp = playState?.currentHp ?? sheet.maxHp;
  const tempHp = playState?.tempHp ?? 0;
  const hpChanged = playState?.currentHp != null && playState.currentHp !== sheet.maxHp;
  // "X (Y)" — X is current (or current/max) HP, Y is the Temporary HP pool when present.
  const hpDisplay =
    (hpChanged ? `${currentHp}/${sheet.maxHp}` : String(sheet.maxHp)) +
    (tempHp > 0 ? ` (${tempHp})` : "");

  // +/- on HP: at/above full, "+" adds Temporary HP (a pool above max); damage ("-")
  // depletes Temp HP first, then current HP — matching the 2024 Temp HP rules.
  const adjustHp = useCallback(
    (delta: number) => {
      update((d) => {
        d.playState ??= {};
        const max = sheet.maxHp;
        let cur = d.playState.currentHp ?? max;
        let temp = d.playState.tempHp ?? 0;
        if (delta > 0) {
          if (cur < max) cur = Math.min(max, cur + delta);
          else temp += delta;
        } else {
          const dmg = -delta;
          const fromTemp = Math.min(temp, dmg);
          temp -= fromTemp;
          cur = Math.max(0, cur - (dmg - fromTemp));
        }
        d.playState.currentHp = cur;
        d.playState.tempHp = temp > 0 ? temp : undefined;
      });
    },
    [update, sheet.maxHp]
  );

  const acBonus = playState?.acBonus ?? 0;
  const effectiveAc = sheet.armorClass + acBonus;

  const adjustAc = useCallback(
    (delta: number) => {
      update((d) => {
        d.playState ??= {};
        const next = (d.playState.acBonus ?? 0) + delta;
        d.playState.acBonus = next !== 0 ? next : undefined;
      });
    },
    [update]
  );

  const toggleSlot = useCallback(
    (key: string, total: number, index: number) => {
      update((d) => {
        d.playState ??= {};
        d.playState.usedSlots ??= {};
        const arr = slotArray(d.playState, key, total);
        arr[index] = !arr[index];
        d.playState.usedSlots[key] = arr;
      });
    },
    [update]
  );

  const closeAddEquip = useCallback(() => {
    setAddingEquip(false);
    setEquipDraft("");
    setHighlightIdx(-1);
  }, []);

  const addEquipment = useCallback(
    (nameArg?: string) => {
      const trimmed = (nameArg ?? equipDraft).trim();
      if (!trimmed) return;
      const lc = trimmed.toLowerCase();
      const magic = MAGIC_BY_LC.get(lc);
      if (magic) {
        // Magic items carry their own config (base weapon, +N, equipped) — store
        // them structured under draft.magicItems and manage them in the Worn section.
        update((d) => {
          d.magicItems ??= [];
          d.magicItems.push({ index: magic.index });
        });
        closeAddEquip();
        return;
      }
      // Normalize to the catalog's canonical name when it matches, so the item
      // resolves to its weapon/armor on the sheet (and stays equippable).
      const name = CANONICAL_BY_LC.get(lc) ?? trimmed;
      update((d) => {
        d.extraEquipment ??= [];
        d.extraEquipment.push(name);
      });
      closeAddEquip();
    },
    [equipDraft, update, closeAddEquip]
  );

  const removeEquipment = useCallback(
    (name: string) => {
      update((d) => {
        if (!d.extraEquipment) return;
        const lc = name.toLowerCase();
        const idx = d.extraEquipment.findIndex((e) => e.toLowerCase() === lc);
        if (idx >= 0) d.extraEquipment.splice(idx, 1);
      });
    },
    [update]
  );

  const equippedWeapons = new Set(playState?.equippedWeapons ?? []);
  const equippedMagic = new Set(
    (draft.magicItems ?? []).filter((m) => m.equipped).map((m) => m.index)
  );

  const toggleEquipped = useCallback(
    (key: string) => {
      update((d) => {
        d.playState ??= {};
        const arr = (d.playState.equippedWeapons ??= []);
        const idx = arr.indexOf(key);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(key);
      });
    },
    [update]
  );

  // --- Equipped / Worn section: magic items + mundane armor/shield ----------
  const mutateMagic = useCallback(
    (ref: number, fn: (m: NonNullable<typeof draft.magicItems>[number]) => void) => {
      update((d) => {
        const item = d.magicItems?.[ref];
        if (item) fn(item);
      });
    },
    [update]
  );

  const removeMagicItem = useCallback(
    (ref: number) => {
      update((d) => {
        d.magicItems?.splice(ref, 1);
      });
    },
    [update]
  );

  // Toggle a worn mundane armor / shield (drives AC). Clears when re-toggled.
  const toggleWorn = useCallback(
    (slot: "equippedArmor" | "equippedShield", index: string) => {
      update((d) => {
        d.playState ??= {};
        d.playState[slot] = d.playState[slot] === index ? undefined : index;
      });
    },
    [update]
  );

  const renderResourceRow = (
    key: string,
    label: string,
    total: number,
    tone: "arcane" | "gold" = "arcane",
    icon?: SlotKind
  ) => {
    if (total <= 0) return null;
    const used = slotArray(playState, key, total);
    return (
      <ResourceBlock key={key}>
        <ResourceLabel>
          {icon && <CostIcon token={icon} size={13} />}
          {label}
        </ResourceLabel>
        {interactive ? (
          <CircleRow>
            {used.map((isUsed, i) => (
              <ResourceCircle
                key={i}
                type="button"
                $used={isUsed}
                $tone={tone}
                aria-label={`${label} slot ${i + 1}${isUsed ? ", used" : ", available"}`}
                onClick={() => toggleSlot(key, total, i)}
              />
            ))}
          </CircleRow>
        ) : (
          <CircleRow>
            {used.map((isUsed, i) => (
              <ResourceCircle key={i} as="span" $used={isUsed} $tone={tone} />
            ))}
          </CircleRow>
        )}
      </ResourceBlock>
    );
  };

  return (
    <Sheet ref={ref}>
      <Header data-export-block>
        <HeaderTop>
          <Name>{sheet.name}</Name>
          <LevelBadge>Level {sheet.level}</LevelBadge>
        </HeaderTop>
        <SubLine>
          {sheet.classLine} · {sheet.subraceName ?? sheet.raceName}
          {sheet.backgroundName ? ` · ${sheet.backgroundName}` : ""}
        </SubLine>
      </Header>

      <Card data-export-block>
        <CardLabel>Ability Scores</CardLabel>
        <CardContent>
        <StatGridFull>
          {ABILITY_ORDER.map((k) => (
            <AbilityBox key={k} $color={ABILITY_COLORS[k]}>
              <AbAbbr $color={ABILITY_COLORS[k]}>{ABILITY_NAMES[k].slice(0, 3)}</AbAbbr>
              <AbMod>{formatModifier(sheet.abilityMods[k])}</AbMod>
              <AbScore>{sheet.finalAbilities[k]}</AbScore>
            </AbilityBox>
          ))}
        </StatGridFull>
        </CardContent>
      </Card>

      <Card data-export-block>
        <CardHeaderRow>
          <CardLabel>Combat</CardLabel>
          <TagWrap>
            {Object.entries(sheet.hitDice).map(([die, n]) => (
              <Tag key={die}>
                {n}{die} Hit Dice
              </Tag>
            ))}
            {sheet.acNote && <Tag>{sheet.acNote}</Tag>}
            {sheet.armorWarning && <WarnTag>⚠ {sheet.armorWarning}</WarnTag>}
          </TagWrap>
        </CardHeaderRow>
        <StatGridFull>
          <Stat>
            {interactive ? (
              <HpControl>
                <HpBtn type="button" aria-label="Decrease AC boost" onClick={() => adjustAc(-1)}>
                  −
                </HpBtn>
                <StatNum>{effectiveAc}</StatNum>
                <HpBtn type="button" aria-label="Increase AC boost" onClick={() => adjustAc(1)}>
                  +
                </HpBtn>
              </HpControl>
            ) : (
              <StatValue>
                <StatNum>{effectiveAc}</StatNum>
              </StatValue>
            )}
            <StatName>
              {acBonus !== 0 ? `Armor Class · ${formatModifier(acBonus)} boost` : "Armor Class"}
            </StatName>
          </Stat>
          <Stat>
            <StatValue>
              <StatNum>{formatModifier(sheet.initiative)}</StatNum>
            </StatValue>
            <StatName>Initiative</StatName>
          </Stat>
          <Stat>
            {interactive ? (
              <HpControl>
                <HpBtn type="button" aria-label="Decrease current HP" onClick={() => adjustHp(-1)}>
                  −
                </HpBtn>
                <StatNum>{hpDisplay}</StatNum>
                <HpBtn type="button" aria-label="Increase current HP" onClick={() => adjustHp(1)}>
                  +
                </HpBtn>
              </HpControl>
            ) : (
              <StatValue>
                <StatNum>{hpDisplay}</StatNum>
              </StatValue>
            )}
            <StatName>{hpChanged || tempHp > 0 ? "Hit Points" : "Max HP"}</StatName>
          </Stat>
          <Stat>
            <StatValue>
              <StatNum>{sheet.speed}</StatNum>
            </StatValue>
            <StatName>Speed</StatName>
          </Stat>
          <Stat>
            <StatValue>
              <StatNum>{formatModifier(sheet.proficiencyBonus)}</StatNum>
            </StatValue>
            <StatName>Prof. Bonus</StatName>
          </Stat>
          <Stat>
            <StatValue>
              <StatNum>{sheet.passivePerception}</StatNum>
            </StatValue>
            <StatName>Passive Per.</StatName>
          </Stat>
        </StatGridFull>
      </Card>

      <Columns>
        <Col>
          <Card data-export-block>
            <CardLabel>Saving Throws &amp; Skills</CardLabel>
            <CardBody>
            {ABILITY_ORDER.map((ab) => {
              const group = sheet.skills.filter((s) => s.ability === ab);
              const save = sheet.savingThrows.find((st) => st.ability === ab);
              if (!save && group.length === 0) return null;
              return (
                <SkillGroup key={ab}>
                  <SkillGroupHeader>
                    <SkillGroupLabel $color={ABILITY_COLORS[ab]}>
                      {ABILITY_NAMES[ab]}
                    </SkillGroupLabel>
                    {save && (
                      <SaveTag $proficient={save.proficient}>
                        {save.proficient && <Dot $on />}
                        {formatModifier(save.modifier)}
                      </SaveTag>
                    )}
                  </SkillGroupHeader>
                  {group.map((s) => (
                    <SkillLine key={s.index}>
                      <Tooltip title={s.name} content={skillDesc(s.index)}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Dot $on={s.proficient} $exp={s.expertise} />
                          <SkillIcon index={s.index} size={15} />
                          {s.name}
                        </span>
                      </Tooltip>
                      <Mod>{formatModifier(s.modifier)}</Mod>
                    </SkillLine>
                  ))}
                </SkillGroup>
              );
            })}
            </CardBody>
          </Card>
        </Col>

        <Col>
          {sheet.weapons.length > 0 && (
            <Card data-export-block>
              <CardLabel>Weapons</CardLabel>
              <CardContent>
                <WeaponList>
                  {[...sheet.weapons]
                    .map((w) => ({
                      w,
                      key: w.index ?? w.name,
                      equipped: w.magic
                        ? equippedMagic.has(w.index ?? "")
                        : equippedWeapons.has(w.index ?? w.name),
                    }))
                    .sort((a, b) => Number(b.equipped) - Number(a.equipped))
                    .map(({ w, key, equipped }, i) => {
                      const meta = [
                        w.magic ? `Magic · ${w.magic}` : null,
                        ...w.properties,
                        w.mastery ? `Mastery: ${w.mastery}` : null,
                        rangeNote(w),
                        w.proficient ? null : "Not proficient",
                      ].filter(Boolean);
                      const extra = (w.extraDamage ?? [])
                        .map((e) => `+${e.dice}${e.type ? ` ${e.type}` : ""}`)
                        .join(", ");
                      return (
                        <WeaponRow key={`${key}-${i}`} $equipped={equipped}>
                          <WeaponMain>
                            <WeaponName>
                              {w.name}
                              {w.quantity > 1 ? ` ×${w.quantity}` : ""}
                              {w.magic && <MagicBadge>✦ magic</MagicBadge>}
                              {equipped && (w.magic || !interactive) && (
                                <HandBadge>⚔ In hand</HandBadge>
                              )}
                            </WeaponName>
                            {meta.length > 0 && <WeaponMeta>{meta.join(" · ")}</WeaponMeta>}
                          </WeaponMain>
                          <WeaponStats>
                            <WeaponStat>
                              <WeaponStatVal>{formatModifier(w.attackBonus)}</WeaponStatVal>
                              <WeaponStatName>Atk</WeaponStatName>
                            </WeaponStat>
                            <WeaponStat>
                              <WeaponStatVal>
                                {formatDamage(w.damageDice, w.damageBonus, w.damageType)}
                                {extra ? ` ${extra}` : ""}
                              </WeaponStatVal>
                              <WeaponStatName>
                                {w.versatile
                                  ? `Damage · ${w.versatile.dice} ${formatModifier(
                                      w.versatile.bonus
                                    )} two-handed`
                                  : "Damage"}
                              </WeaponStatName>
                            </WeaponStat>
                          </WeaponStats>
                          {interactive && !w.magic && (
                            <EquipCheck
                              type="button"
                              role="checkbox"
                              aria-checked={equipped}
                              aria-label={`${equipped ? "Unequip" : "Equip"} ${w.name}`}
                              $on={equipped}
                              onClick={() => toggleEquipped(key)}
                            >
                              <CheckBox $on={equipped}>{equipped ? "✓" : ""}</CheckBox>
                            </EquipCheck>
                          )}
                        </WeaponRow>
                      );
                    })}
                </WeaponList>
              </CardContent>
            </Card>
          )}

          {sheet.wornItems.length > 0 && (
            <Card data-export-block>
              <CardLabel>Equipped / Worn</CardLabel>
              <CardContent>
                <WeaponList>
                  {sheet.wornItems.map((it, i) => {
                    const isWeapon = it.kind === "weapon" || it.kind === "ammunition";
                    const scales = it.needsBonus || it.bonus != null;
                    const wornLabel = isWeapon ? "⚔ In hand" : "✓ Worn";
                    const toggle = () => {
                      if (it.ref != null) mutateMagic(it.ref, (m) => (m.equipped = !m.equipped));
                      else if (it.kind === "shield") toggleWorn("equippedShield", it.index);
                      else toggleWorn("equippedArmor", it.index);
                    };
                    return (
                      <WeaponRow key={`${it.index}-${i}`} $equipped={it.equipped}>
                        <WeaponMain>
                          <WeaponName>
                            {it.name}
                            {it.magic && <MagicBadge>✦ magic</MagicBadge>}
                            {it.attunement && <AttuneBadge>attune</AttuneBadge>}
                            {it.untrained && <WarnBadge>⚠ not proficient</WarnBadge>}
                            {it.equipped && !interactive && <HandBadge>{wornLabel}</HandBadge>}
                          </WeaponName>
                          <WeaponMeta>
                            {it.kind}
                            {it.effect ? ` · ${it.effect}` : ""}
                            {it.needsBase ? " · choose a base weapon" : ""}
                          </WeaponMeta>
                          {interactive && it.ref != null && isWeapon && (
                            <WornControls>
                              <span>Base weapon:</span>
                              <WornSelect
                                value={it.baseWeapon ?? ""}
                                onChange={(e) =>
                                  mutateMagic(
                                    it.ref!,
                                    (m) => (m.baseWeapon = e.target.value || undefined)
                                  )
                                }
                              >
                                <option value="">— choose —</option>
                                {WEAPON_OPTIONS.map((w) => (
                                  <option key={w.index} value={w.index}>
                                    {w.name}
                                  </option>
                                ))}
                              </WornSelect>
                            </WornControls>
                          )}
                          {interactive && it.ref != null && scales && (
                            <WornControls>
                              <span>Bonus:</span>
                              <WornSelect
                                value={it.bonus ?? ""}
                                onChange={(e) =>
                                  mutateMagic(
                                    it.ref!,
                                    (m) =>
                                      (m.bonus = e.target.value ? Number(e.target.value) : undefined)
                                  )
                                }
                              >
                                <option value="">— choose —</option>
                                <option value="1">+1</option>
                                <option value="2">+2</option>
                                <option value="3">+3</option>
                              </WornSelect>
                            </WornControls>
                          )}
                        </WeaponMain>
                        {interactive && (
                          <WeaponStats>
                            <EquipCheck
                              type="button"
                              role="checkbox"
                              aria-checked={it.equipped}
                              aria-label={`${it.equipped ? "Unequip" : "Equip"} ${it.name}`}
                              $on={it.equipped}
                              onClick={toggle}
                            >
                              <CheckBox $on={it.equipped}>{it.equipped ? "✓" : ""}</CheckBox>
                            </EquipCheck>
                          </WeaponStats>
                        )}
                      </WeaponRow>
                    );
                  })}
                </WeaponList>
              </CardContent>
            </Card>
          )}

          {sheet.spellcasting.length > 0 && (
            <Card data-export-block>
              <CardLabel>Spellcasting</CardLabel>
              <CardContent>
              {sheet.spellcasting.map((sc) => (
                <SpellClassBlock key={sc.classIndex}>
                  <TagWrap>
                    <Tag>{sc.classIndex.toUpperCase()}</Tag>
                    <Tag>Ability {sc.ability.toUpperCase()}</Tag>
                    <Tag>Save DC {sc.saveDc}</Tag>
                    <Tag>Atk {formatModifier(sc.attackBonus)}</Tag>
                    {sc.cantripsKnown > 0 && <Tag>{sc.cantripsKnown} Cantrips</Tag>}
                    {sc.spellsKnownOrPrepared > 0 && (
                      <Tag>
                        {sc.spellsKnownOrPrepared} {sc.prepStyle === "known" ? "Known" : "Prepared"}
                      </Tag>
                    )}
                  </TagWrap>
                </SpellClassBlock>
              ))}
              {sheet.spellSlots.map((s) =>
                renderResourceRow(String(s.level), `Level ${s.level} Slots`, s.total, "arcane", "spell_slot")
              )}
              {sheet.pactSlots &&
                renderResourceRow(
                  "pact",
                  `Pact Slots (Lv ${sheet.pactSlots.level})`,
                  sheet.pactSlots.count,
                  "gold",
                  "pact_slot"
                )}
              {sheet.knownSpells.map((ks) => (
                <SpellListBlock key={ks.classIndex}>
                  {ks.cantrips.length > 0 && (
                    <>
                      <ResourceLabel>Cantrips</ResourceLabel>
                      <TagWrap>
                        {ks.cantrips.map((c) => (
                          <SpellTooltip
                            key={c.index}
                            index={c.index}
                            access={slotAccess(c.index, ks.classIndex === "warlock")}
                            enhancements={sheet.spellEnhancements[c.index]}
                          >
                            <Tag>{c.name}</Tag>
                          </SpellTooltip>
                        ))}
                      </TagWrap>
                    </>
                  )}
                  {ks.spells.length > 0 && (
                    <>
                      <ResourceLabel style={{ marginTop: ks.cantrips.length > 0 ? "0.55rem" : undefined }}>
                        Spells
                      </ResourceLabel>
                      <TagWrap>
                        {[...ks.spells]
                          .sort(
                            (a, b) =>
                              (spellMap.get(a.index)?.level ?? 0) -
                              (spellMap.get(b.index)?.level ?? 0)
                          )
                          .map((c) => (
                            <SpellTooltip
                              key={c.index}
                              index={c.index}
                              access={slotAccess(c.index, ks.classIndex === "warlock")}
                            >
                              <Tag>{c.name}</Tag>
                            </SpellTooltip>
                          ))}
                      </TagWrap>
                    </>
                  )}
                </SpellListBlock>
              ))}
              </CardContent>
            </Card>
          )}

          {sheet.subclassSpells.length > 0 && (
            <Card data-export-block>
              <CardLabel>Subclass Spells · Always Prepared</CardLabel>
              <CardContent>
              {sheet.subclassSpells.map((ss) => (
                <SpellListBlock key={ss.classIndex}>
                  <TagWrap>
                    <SourceTag>{ss.subclassName}</SourceTag>
                    {ss.spells.map((s) => (
                      <SpellTooltip
                        key={s.index}
                        index={s.index}
                        access={preparedAccess(s.index, ss.classIndex === "warlock")}
                      >
                        <Tag>{s.name}</Tag>
                      </SpellTooltip>
                    ))}
                  </TagWrap>
                </SpellListBlock>
              ))}
              </CardContent>
            </Card>
          )}

          {sheet.featureSpells.length > 0 && (
            <Card data-export-block>
              <CardLabel>Feature Spells</CardLabel>
              <CardContent>
              {sheet.featureSpells.map((fs, i) => (
                <SpellListBlock key={`${fs.featureName}-${i}`}>
                  <TagWrap>
                    <FeatureTooltip
                      feature={{
                        name: fs.featureName,
                        source: fs.source + (fs.ability ? ` · ${fs.ability}` : ""),
                        desc: fs.featureDesc ?? [],
                        activation: fs.activation,
                        recharge: fs.recharge,
                      }}
                    >
                      <SourceTag>
                        {fs.featureName} · {fs.source}
                        {fs.ability ? ` · ${fs.ability}` : ""}
                      </SourceTag>
                    </FeatureTooltip>
                    {fs.spells.map((s) => (
                      <SpellTooltip key={s.index} index={s.index} access={featureSpellAccess(s, fs)}>
                        <Tag>
                          {s.name} · {featureSpellUsage(s.usage, s.times)}
                          {s.selfOnly ? " (self)" : ""}
                        </Tag>
                      </SpellTooltip>
                    ))}
                  </TagWrap>
                </SpellListBlock>
              ))}
              </CardContent>
            </Card>
          )}

          {sheet.speciesSpells.length > 0 && (
            <Card data-export-block>
              <CardLabel>Species &amp; Legacy Spells · Always Prepared</CardLabel>
              <CardContent>
              {sheet.speciesSpells.map((ss, i) => (
                <SpellListBlock key={`${ss.source}-${ss.traitName}-${i}`}>
                  <TagWrap>
                    <SourceTag>
                      {ss.source} · {ss.traitName}
                      {ss.ability.length > 0 && ` · ${ss.ability.join(" / ")}`}
                    </SourceTag>
                    {ss.spells.map((s) => (
                      <SpellTooltip key={s.index} index={s.index} access={preparedAccess(s.index)}>
                        <Tag>{s.name}</Tag>
                      </SpellTooltip>
                    ))}
                  </TagWrap>
                  {ss.spells.some((s) => s.swappableFrom?.length) && (
                    <MutedNote style={{ fontStyle: "italic", marginTop: 3 }}>
                      Cantrip swappable each Long Rest from{" "}
                      {[...new Set(ss.spells.flatMap((s) => s.swappableFrom ?? []))]
                        .map((c) => classMap.get(c)?.name ?? c)
                        .join(", ")}
                    </MutedNote>
                  )}
                </SpellListBlock>
              ))}
              </CardContent>
            </Card>
          )}

          {sheet.featSpells.length > 0 && (
            <Card data-export-block>
              <CardLabel>Feat Spells</CardLabel>
              <CardContent>
              {sheet.featSpells.map((fs, i) => (
                <SpellListBlock key={`${fs.featName}-${i}`}>
                  <TagWrap>
                    <FeatureTooltip
                      feature={{ name: fs.featName, source: "Feat", desc: fs.featDesc ?? [] }}
                    >
                      <SourceTag>{fs.featName}</SourceTag>
                    </FeatureTooltip>
                    {fs.spells.map((s) => (
                      <SpellTooltip key={s.index} index={s.index} access={slotAccess(s.index)}>
                        <Tag>{s.name}</Tag>
                      </SpellTooltip>
                    ))}
                  </TagWrap>
                  {fs.notes.map((g, j) => (
                    <MutedNote key={j} style={{ marginTop: 3 }}>
                      {g} <em>(choose on your sheet)</em>
                    </MutedNote>
                  ))}
                </SpellListBlock>
              ))}
              </CardContent>
            </Card>
          )}

          <FeaturesCard data-export-block>
            <CardLabel>Features & Traits</CardLabel>
            <CardContent>
            <TagWrap>
              {sheet.features.map((f, i) => (
                <FeatureTooltip key={`${f.name}-${i}`} feature={f}>
                  <Tag>{f.name}</Tag>
                </FeatureTooltip>
              ))}
            </TagWrap>
            </CardContent>
          </FeaturesCard>

          {sheet.weaponMasteries.length > 0 && (
            <Card data-export-block>
              <CardLabel>Weapon Masteries</CardLabel>
              {sheet.weaponMasteries.map((m, i) => (
                <div key={`${m.weapon}-${i}`}>
                  <FeatureName>{m.weapon}</FeatureName>
                  <MutedNote style={{ marginTop: 2 }}>{m.mastery}</MutedNote>
                  {m.desc && <MutedNote style={{ marginTop: 2 }}>{m.desc}</MutedNote>}
                </div>
              ))}
            </Card>
          )}

          <Card data-export-block>
            <CardLabel>Equipment</CardLabel>
            <CardContent>
            <TagWrap>
              {sheet.equipment.map((e, i) => {
                const extra = isExtraEquipment(e.name, draft.extraEquipment);
                const label = e.unit
                  ? `${e.quantity} ${e.unit}`
                  : e.quantity > 1
                    ? `${e.name} ×${e.quantity}`
                    : e.name;
                return (
                  <Tag key={`${e.index ?? e.name}-${i}`} $coin={!!e.unit}>
                    {label}
                    {interactive && extra && (
                      <TagRemove
                        type="button"
                        aria-label={`Remove ${e.name}`}
                        onClick={() => removeEquipment(e.name)}
                      >
                        ×
                      </TagRemove>
                    )}
                  </Tag>
                );
              })}
              {(draft.magicItems ?? []).map((m, ref) => {
                const name = magicItemMap.get(m.index)?.name ?? m.index;
                return (
                  <Tag key={`mi-${m.index}-${ref}`}>
                    ✦ {name}
                    {interactive && (
                      <TagRemove
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => removeMagicItem(ref)}
                      >
                        ×
                      </TagRemove>
                    )}
                  </Tag>
                );
              })}
              {interactive && (
                addingEquip ? (
                  <>
                    <EquipInputWrap>
                      <EquipTagInput
                        value={equipDraft}
                        onChange={(ev) => {
                          setEquipDraft(ev.target.value);
                          setHighlightIdx(-1);
                        }}
                        placeholder="Item name"
                        autoFocus
                        role="combobox"
                        aria-expanded={equipSuggestions.length > 0}
                        aria-autocomplete="list"
                        onBlur={() => setHighlightIdx(-1)}
                        onKeyDown={(ev) => {
                          if (ev.key === "ArrowDown" && equipSuggestions.length) {
                            ev.preventDefault();
                            setHighlightIdx((i) => (i + 1) % equipSuggestions.length);
                          } else if (ev.key === "ArrowUp" && equipSuggestions.length) {
                            ev.preventDefault();
                            setHighlightIdx(
                              (i) => (i - 1 + equipSuggestions.length) % equipSuggestions.length
                            );
                          } else if (ev.key === "Enter") {
                            ev.preventDefault();
                            addEquipment(
                              highlightIdx >= 0 ? equipSuggestions[highlightIdx].name : undefined
                            );
                          } else if (ev.key === "Escape") {
                            closeAddEquip();
                          }
                        }}
                      />
                      {equipSuggestions.length > 0 && (
                        <Suggestions role="listbox">
                          {equipSuggestions.map((s, i) => (
                            <SuggestionItem
                              key={s.name}
                              type="button"
                              role="option"
                              aria-selected={i === highlightIdx}
                              $active={i === highlightIdx}
                              onMouseEnter={() => setHighlightIdx(i)}
                              // mousedown (not click) fires before the input blur,
                              // so the pick registers instead of being swallowed.
                              onMouseDown={(ev) => {
                                ev.preventDefault();
                                addEquipment(s.name);
                              }}
                            >
                              {s.name}
                              {s.magic && <SuggestionTag>magic</SuggestionTag>}
                            </SuggestionItem>
                          ))}
                        </Suggestions>
                      )}
                    </EquipInputWrap>
                    <TagButton
                      type="button"
                      onClick={() => addEquipment()}
                      disabled={!equipDraft.trim()}
                    >
                      Add
                    </TagButton>
                    <TagButton type="button" onClick={closeAddEquip}>
                      Cancel
                    </TagButton>
                  </>
                ) : (
                  <TagButton type="button" onClick={() => setAddingEquip(true)}>
                    + Add equipment
                  </TagButton>
                )
              )}
            </TagWrap>
            </CardContent>
          </Card>
        </Col>
      </Columns>

      <Card data-export-block>
        <CardLabel>Proficiencies & Languages</CardLabel>
        {sheet.proficiencies.armor.length > 0 && (
          <CharacterSection>
            <FeatureName>Armor</FeatureName>
            <Prose>{sheet.proficiencies.armor.join(", ")}</Prose>
          </CharacterSection>
        )}
        {sheet.proficiencies.weapons.length > 0 && (
          <CharacterSection>
            <FeatureName>Weapons</FeatureName>
            <Prose>{sheet.proficiencies.weapons.join(", ")}</Prose>
          </CharacterSection>
        )}
        {sheet.proficiencies.tools.length > 0 && (
          <CharacterSection>
            <FeatureName>Tools</FeatureName>
            <Prose>{sheet.proficiencies.tools.join(", ")}</Prose>
          </CharacterSection>
        )}
        <CharacterSection>
          <FeatureName>Languages</FeatureName>
          <Prose>{sheet.languages.join(", ")}</Prose>
        </CharacterSection>
      </Card>

      {(sheet.personality || sheet.ideals || sheet.bonds || sheet.flaws || sheet.backstory) && (
        <Card data-export-block>
          <CardLabel>Character</CardLabel>
          {sheet.personality && (
            <CharacterSection>
              <FeatureName>Personality</FeatureName>
              <Prose>{sheet.personality}</Prose>
            </CharacterSection>
          )}
          {sheet.ideals && (
            <CharacterSection>
              <FeatureName>Ideals</FeatureName>
              <Prose>{sheet.ideals}</Prose>
            </CharacterSection>
          )}
          {sheet.bonds && (
            <CharacterSection>
              <FeatureName>Bonds</FeatureName>
              <Prose>{sheet.bonds}</Prose>
            </CharacterSection>
          )}
          {sheet.flaws && (
            <CharacterSection>
              <FeatureName>Flaws</FeatureName>
              <Prose>{sheet.flaws}</Prose>
            </CharacterSection>
          )}
          {sheet.backstory && (
            <CharacterSection>
              <FeatureName>Backstory</FeatureName>
              <Prose>{sheet.backstory}</Prose>
            </CharacterSection>
          )}
        </Card>
      )}
    </Sheet>
  );
});

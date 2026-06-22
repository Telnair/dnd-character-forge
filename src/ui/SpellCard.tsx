import type { ReactNode } from "react";
import styled from "styled-components";
import { spellMap } from "@/data";
import type { SrdSpell } from "@/data/types";
import { Tooltip } from "./Tooltip";
import { CostIcon, COST_LABEL, type SlotKind } from "./CostIcon";

/**
 * How THIS character casts a spell — the pinned footer on the card.
 * `castTime` overrides the spell's own casting time (e.g. a feature that casts it
 * as a Reaction); falls back to the spell's `casting_time`. `notes` are the free
 * cadence / recharge facets ("At will", "1 / Long Rest", "Always prepared"); only
 * include "At will" when there is NO `cost`. `cost` is the resource spent.
 */
export interface SpellAccess {
  castTime?: string;
  notes?: string[];
  cost?: SlotKind;
}

// Damage-type accent colors (keyed by the SRD damage-type index). Mirrors the
// BG3 convention of tinting each element so the type reads at a glance.
const DAMAGE_COLORS: Record<string, string> = {
  acid: "#a3c54a",
  bludgeoning: "#c9bca2",
  cold: "#7fd0ff",
  fire: "#ff8a4c",
  force: "#ff4d4f",
  lightning: "#ffd84a",
  necrotic: "#7aa37a",
  piercing: "#c9bca2",
  poison: "#7bbf4a",
  psychic: "#ff7ad0",
  radiant: "#ffe08a",
  slashing: "#c9bca2",
  thunder: "#9aa9ff",
};

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const tt = <span>{s[(v - 20) % 10] || s[v] || s[0]}</span>;
  return <><b>{n}</b>{tt}</>;
};

/** "Evocation Cantrip" for cantrips, "2nd-level Conjuration" otherwise. */
function schoolLine(spell: SrdSpell) {
  return spell.level === 0
    ? <>{spell.school.name} Cantrip</>
    : <>{ordinal(spell.level)}-level {spell.school.name}</>;
}

/** Base damage/heal dice — slot level for leveled spells, char level 1 for cantrips. */
function baseDice(by?: Record<string, string>, level?: number): string | undefined {
  if (!by) return undefined;
  if (level != null && by[String(level)]) return by[String(level)];
  return by["1"] ?? Object.values(by)[0];
}

/** "1 action" -> "Action", "1 bonus action" -> "Bonus Action"; else Title Case. */
function castingTime(s: string): string {
  return s
    .replace(/^1\s+(?=(action|bonus action|reaction)\b)/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function attackOrSave(spell: SrdSpell): string | undefined {
  if (spell.attack_type) {
    return `${spell.attack_type === "melee" ? "Melee" : "Ranged"} Spell Attack`;
  }
  if (spell.dc) return `${spell.dc.dc_type.name} Save`;
  return undefined;
}

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  /* no bottom padding — the sticky Access footer provides it and sits flush */
  padding: 0.7rem 0.8rem 0;
  min-width: 240px;
  max-width: 340px;
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.18rem;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const SubLine = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: -0.15rem;
`;

const DamageLine = styled.div<{ $color: string }>`
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: ${({ theme }) => theme.fonts.display};
  & b {
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.05rem;
  }
  & span {
    color: ${({ $color }) => $color};
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
`;

const Desc = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textDim};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1.05rem;
  line-height: 1.5;
`;

const Meta = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.7rem;
  margin: 0;
`;

const MetaKey = styled.dt`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDim};
  align-self: center;
`;

const MetaVal = styled.dd`
  margin: 0;
  font-size: 0.98rem;
  color: ${({ theme }) => theme.colors.text};
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.1rem;
`;

const Badge = styled.span<{ $tone?: "arcane" | "ember" }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme, $tone }) =>
    $tone === "ember" ? theme.colors.emberBright : theme.colors.arcaneBright};
  background: rgba(0, 0, 0, 0.25);
`;

const Material = styled.div`
  font-size: 0.86rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textDim};
  line-height: 1.35;
`;

// "How this character casts it" — cast time + cadence + resource cost, distinct
// per spell. Pinned as a footer strip spanning the card's full width (cancels the
// card's padding), set off by a rule. Fed by the call site (the same spell can be
// at-will from one feature, slot-cast normally).
const Access = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.4rem;
  margin: 0.1rem -0.8rem 0;
  padding: 0.5rem 0.8rem;
  border-top: 1px solid ${({ theme }) => theme.colors.borderStrong};
  /* opaque so scrolled content passes behind it, not through it */
  background: #1b150f;
  box-shadow: 0 -7px 10px -7px rgba(0, 0, 0, 0.6);
`;

const AccessLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDim};
  margin-right: 0.05rem;
`;

const AccessPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.86rem;
  letter-spacing: 0.02em;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  background: rgba(0, 0, 0, 0.3);
`;

// The resource cost — the emphasised, always-last facet (gold + icon).
const CostPill = styled(AccessPill)`
  border-color: ${({ theme }) => `${theme.colors.goldBright}66`};
  color: ${({ theme }) => theme.colors.goldBright};
  background: rgba(245, 196, 81, 0.12);
`;

export const SpellInfoButton = styled.button`
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(0, 0, 0, 0.55);
  color: ${({ theme }) => theme.colors.goldBright};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
  &:hover {
    background: rgba(245, 196, 81, 0.18);
    border-color: ${({ theme }) => theme.colors.gold};
  }
`;

function MetaRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <>
      <MetaKey>{label}</MetaKey>
      <MetaVal>{value}</MetaVal>
    </>
  );
}

/**
 * Structured spell readout (BG3-style): school/level, damage, range, attack or
 * save, casting time, duration, components and concentration/ritual flags.
 * Pure — pass it an `SrdSpell`. For a hover trigger use {@link SpellTooltip}.
 */
export function SpellCard({
  spell,
  access,
  enhancements,
}: {
  spell: SrdSpell;
  access?: SpellAccess;
  /** Names of features improving this spell for the character (e.g. the Eldritch
   *  Invocations Repelling Blast / Agonizing Blast targeting this cantrip). */
  enhancements?: string[];
}) {
  const dmgType = spell.damage?.damage_type;
  const dmgDice =
    baseDice(spell.damage?.damage_at_slot_level, spell.level) ??
    baseDice(spell.damage?.damage_at_character_level, 1);
  const healDice = baseDice(spell.heal_at_slot_level, spell.level);
  const area = spell.area_of_effect
    ? `${spell.area_of_effect.size} ft ${spell.area_of_effect.type
        .charAt(0)
        .toUpperCase()}${spell.area_of_effect.type.slice(1)}`
    : undefined;

  return (
    <Card>
      <div>
        <Name>{spell.name}</Name>
        <SubLine>{schoolLine(spell)}</SubLine>
      </div>

      {dmgType && dmgDice && (
        <DamageLine $color={DAMAGE_COLORS[dmgType.index] ?? "#c9bca2"}>
          <b>{dmgDice}</b>
          <span>{dmgType.name} Damage</span>
        </DamageLine>
      )}
      {healDice && (
        <DamageLine $color="#5bbf6a">
          <b>{healDice}</b>
          <span>Healing</span>
        </DamageLine>
      )}

      {spell.desc?.[0] && <Desc>{spell.desc.join("\n\n")}</Desc>}

      <Meta>
        <MetaRow label="Range" value={spell.range} />
        <MetaRow label="Target" value={attackOrSave(spell)} />
        <MetaRow label="Area" value={area} />
        <MetaRow label="Duration" value={spell.duration} />
        <MetaRow label="Components" value={spell.components?.join(", ")} />
        <MetaRow label="Enhanced By" value={enhancements?.length ? enhancements.join(", ") : undefined} />
      </Meta>

      {spell.material && <Material>{spell.material}</Material>}

      {(spell.concentration || spell.ritual) && (
        <Badges>
          {spell.concentration && <Badge>Concentration</Badge>}
          {spell.ritual && <Badge $tone="ember">Ritual</Badge>}
        </Badges>
      )}

      <Access>
        {/* <AccessLabel>Cast</AccessLabel> */}
        <AccessPill>{access?.castTime ?? castingTime(spell.casting_time)}</AccessPill>
        {access?.notes?.map((n, i) => (
          <AccessPill key={i}>{n}</AccessPill>
        ))}
        {access?.cost && (
          <CostPill>
            <CostIcon token={access.cost} size={13} />
            {COST_LABEL[access.cost]}
          </CostPill>
        )}
      </Access>
    </Card>
  );
}

/**
 * Wraps `children` in a hover/focus tooltip showing the {@link SpellCard}.
 * Pass a resolved `spell`, or an `index` to look up in the spell dataset.
 * If the spell can't be resolved, the children render without a tooltip.
 */
export function SpellTooltip({
  spell,
  index,
  access,
  enhancements,
  block,
  trigger = "hover",
  children,
}: {
  spell?: SrdSpell;
  index?: string;
  /** "How this character casts it" — the pinned footer (cast time / cadence / cost). */
  access?: SpellAccess;
  /** Features improving this spell for the character (Repelling/Agonizing Blast, …). */
  enhancements?: string[];
  block?: boolean;
  trigger?: "hover" | "click";
  children: ReactNode;
}) {
  const resolved = spell ?? (index ? spellMap.get(index) : undefined);
  if (!resolved) return <>{children}</>;
  return (
    <Tooltip
      content={<SpellCard spell={resolved} access={access} enhancements={enhancements} />}
      block={block}
      trigger={trigger}
    >
      {children}
    </Tooltip>
  );
}

/** Default cast economy from the spell's level alone: cantrips are at-will,
 *  leveled spells cost a spell slot (a Pact slot when `pact`, i.e. a Warlock's).
 *  Call sites with grant context override this. */
export function slotAccess(index: string, pact = false): SpellAccess {
  if ((spellMap.get(index)?.level ?? 0) === 0) return { notes: ["At will"] };
  return { cost: pact ? "pact_slot" : "spell_slot" };
}

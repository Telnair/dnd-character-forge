import { forwardRef, useCallback, useState } from "react";
import styled, { css } from "styled-components";
import { ABILITY_NAMES, ABILITY_ORDER, classMap, skillMap, spellMap } from "@/data";
import { formatModifier, type DerivedSheet, type PlayState } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { ABILITY_COLORS } from "@/assets/abilityColors";
import { SkillIcon } from "@/assets/SkillIcon";
import { Tooltip } from "@/ui/Tooltip";
import { SpellTooltip, slotAccess, type SpellAccess } from "@/ui/SpellCard";
import { FeatureTooltip, RECHARGE_LABEL, ACTION_LABEL } from "@/ui/FeatureCard";
import { CostIcon, type SlotKind } from "@/ui/CostIcon";

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
  grid-template-columns: 1.35rem 4.5rem 1.35rem;
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

function skillDesc(index: string): string | undefined {
  return skillMap.get(index)?.desc?.join("\n\n");
}

function slotArray(playState: PlayState | undefined, key: string, total: number): boolean[] {
  const existing = playState?.usedSlots?.[key];
  if (existing && existing.length === total) return existing;
  return Array.from({ length: total }, () => false);
}

function isExtraEquipment(name: string, extra: string[] | undefined): boolean {
  return (extra ?? []).includes(name);
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

  const currentHp = playState?.currentHp ?? sheet.maxHp;
  const hpChanged = playState?.currentHp != null && playState.currentHp !== sheet.maxHp;
  const hpDisplay = hpChanged ? `${currentHp}/${sheet.maxHp}` : String(sheet.maxHp);

  const adjustHp = useCallback(
    (delta: number) => {
      update((d) => {
        d.playState ??= {};
        const base = d.playState.currentHp ?? sheet.maxHp;
        d.playState.currentHp = Math.max(0, Math.min(sheet.maxHp, base + delta));
      });
    },
    [update, sheet.maxHp]
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

  const addEquipment = useCallback(() => {
    const trimmed = equipDraft.trim();
    if (!trimmed) return;
    update((d) => {
      d.extraEquipment ??= [];
      d.extraEquipment.push(trimmed);
    });
    setEquipDraft("");
    setAddingEquip(false);
  }, [equipDraft, update]);

  const removeEquipment = useCallback(
    (name: string) => {
      update((d) => {
        if (!d.extraEquipment) return;
        const idx = d.extraEquipment.indexOf(name);
        if (idx >= 0) d.extraEquipment.splice(idx, 1);
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
          </TagWrap>
        </CardHeaderRow>
        <StatGridFull>
          <Stat>
            <StatValue>
              <StatNum>{sheet.armorClass}</StatNum>
            </StatValue>
            <StatName>Armor Class</StatName>
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
            <StatName>{hpChanged ? "Hit Points" : "Max HP"}</StatName>
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
              {interactive && (
                addingEquip ? (
                  <>
                    <EquipTagInput
                      value={equipDraft}
                      onChange={(ev) => setEquipDraft(ev.target.value)}
                      placeholder="Item name"
                      autoFocus
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") addEquipment();
                        if (ev.key === "Escape") {
                          setAddingEquip(false);
                          setEquipDraft("");
                        }
                      }}
                    />
                    <TagButton type="button" onClick={addEquipment} disabled={!equipDraft.trim()}>
                      Add
                    </TagButton>
                    <TagButton
                      type="button"
                      onClick={() => {
                        setAddingEquip(false);
                        setEquipDraft("");
                      }}
                    >
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

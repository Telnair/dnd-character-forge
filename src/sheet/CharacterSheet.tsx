import { forwardRef } from "react";
import styled from "styled-components";
import { ABILITY_NAMES, ABILITY_ORDER, skillMap, spellMap, type AbilityKey } from "@/data";
import { formatModifier, type DerivedSheet } from "@/engine";
import { ABILITY_COLORS } from "@/assets/abilityColors";
import { SkillIcon } from "@/assets/SkillIcon";
import { Tooltip } from "@/ui/Tooltip";

const Sheet = styled.div`
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(245, 196, 81, 0.06), transparent 55%),
    linear-gradient(180deg, #17120e, #100c09);
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1.6rem;
  color: ${({ theme }) => theme.colors.text};
  box-shadow: ${({ theme }) => theme.shadow.panel};
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 1rem;
  flex-wrap: wrap;
`;

const Name = styled.h1`
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  color: ${({ theme }) => theme.colors.goldBright};
  text-shadow: 0 0 20px rgba(245, 196, 81, 0.3);
  line-height: 1;
`;

const SubLine = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: 0.3rem;
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
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.2rem;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`;

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  padding: 0.9rem;
`;

const CardLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ember};
  margin-bottom: 0.6rem;
`;

const AbilityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
`;

const AbilityBox = styled.div<{ $color: string }>`
  border: 1px solid ${({ $color }) => $color}66;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  text-align: center;
  position: relative;
`;

const AbAbbr = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: ${({ $color }) => $color};
  text-transform: uppercase;
`;

const AbMod = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.6rem;
  color: ${({ theme }) => theme.colors.text};
`;

const AbScore = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textFaint};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
`;

const Stat = styled.div`
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.25);
`;

const StatNum = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.6rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const StatName = styled.div`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textFaint};
`;

const Line = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.22rem 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
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

const TagWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const Tag = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.9rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.textDim};
`;

const FeatureItem = styled.div`
  margin-bottom: 0.5rem;
`;

const FeatureName = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.98rem;
  color: ${({ theme }) => theme.colors.gold};
`;

const FeatureSrc = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textFaint};
  margin-left: 0.4rem;
`;

const SlotRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
`;

const Slot = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.85rem;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.arcane}66;
  background: rgba(123, 92, 255, 0.12);
  color: ${({ theme }) => theme.colors.arcaneBright};
`;

const Prose = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.textDim};
  font-size: 1rem;
  margin: 0.2rem 0 0;
  white-space: pre-wrap;
`;

function spellDesc(index: string): string | undefined {
  return spellMap.get(index)?.desc?.join("\n\n");
}

function skillDesc(index: string): string | undefined {
  return skillMap.get(index)?.desc?.join("\n\n");
}

export const CharacterSheet = forwardRef<HTMLDivElement, { sheet: DerivedSheet }>(
  function CharacterSheet({ sheet }, ref) {
    return (
      <Sheet ref={ref}>
        <Header data-export-block>
          <div>
            <Name>{sheet.name}</Name>
            <SubLine>
              {sheet.classLine} · {sheet.subraceName ?? sheet.raceName}
              {sheet.backgroundName ? ` · ${sheet.backgroundName}` : ""}
              {sheet.alignment ? ` · ${sheet.alignment}` : ""}
            </SubLine>
          </div>
          <LevelBadge>Level {sheet.level}</LevelBadge>
        </Header>

        <Columns>
          <Col>
            <Card data-export-block>
              <CardLabel>Ability Scores</CardLabel>
              <AbilityGrid>
                {ABILITY_ORDER.map((k) => (
                  <AbilityBox key={k} $color={ABILITY_COLORS[k]}>
                    <AbAbbr $color={ABILITY_COLORS[k]}>{ABILITY_NAMES[k].slice(0, 3)}</AbAbbr>
                    <AbMod>{formatModifier(sheet.abilityMods[k])}</AbMod>
                    <AbScore>{sheet.finalAbilities[k]}</AbScore>
                  </AbilityBox>
                ))}
              </AbilityGrid>
            </Card>

            <Card data-export-block>
              <CardLabel>Combat</CardLabel>
              <StatGrid>
                <Stat>
                  <StatNum>{sheet.armorClass}</StatNum>
                  <StatName>Armor Class</StatName>
                </Stat>
                <Stat>
                  <StatNum>{formatModifier(sheet.initiative)}</StatNum>
                  <StatName>Initiative</StatName>
                </Stat>
                <Stat>
                  <StatNum>{sheet.maxHp}</StatNum>
                  <StatName>Max HP</StatName>
                </Stat>
                <Stat>
                  <StatNum>{sheet.speed}</StatNum>
                  <StatName>Speed</StatName>
                </Stat>
                <Stat>
                  <StatNum>{formatModifier(sheet.proficiencyBonus)}</StatNum>
                  <StatName>Prof. Bonus</StatName>
                </Stat>
                <Stat>
                  <StatNum>{sheet.passivePerception}</StatNum>
                  <StatName>Passive Per.</StatName>
                </Stat>
              </StatGrid>
              <div style={{ marginTop: "0.6rem" }}>
                <TagWrap>
                  {Object.entries(sheet.hitDice).map(([die, n]) => (
                    <Tag key={die}>
                      {n}{die} Hit Dice
                    </Tag>
                  ))}
                </TagWrap>
                <div style={{ fontSize: "0.78rem", color: "#85765f", marginTop: 6 }}>
                  {sheet.acNote}
                </div>
              </div>
            </Card>

            <Card data-export-block>
              <CardLabel>Saving Throws</CardLabel>
              {sheet.savingThrows.map((st) => (
                <Line key={st.ability}>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <Dot $on={st.proficient} />
                    {ABILITY_NAMES[st.ability as AbilityKey]}
                  </span>
                  <Mod>{formatModifier(st.modifier)}</Mod>
                </Line>
              ))}
            </Card>

            <Card data-export-block>
              <CardLabel>Skills</CardLabel>
              {sheet.skills.map((s) => (
                <Line key={s.index}>
                  <Tooltip title={s.name} content={skillDesc(s.index)}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Dot $on={s.proficient} $exp={s.expertise} />
                      <SkillIcon index={s.index} size={15} />
                      {s.name}
                    </span>
                  </Tooltip>
                  <Mod>{formatModifier(s.modifier)}</Mod>
                </Line>
              ))}
            </Card>
          </Col>

          <Col>
            {sheet.spellcasting.length > 0 && (
              <Card data-export-block>
                <CardLabel>Spellcasting</CardLabel>
                {sheet.spellcasting.map((sc) => (
                  <div key={sc.classIndex} style={{ marginBottom: "0.6rem" }}>
                    <TagWrap>
                      <Tag>{sc.classIndex.toUpperCase()}</Tag>
                      <Tag>Ability {sc.ability.toUpperCase()}</Tag>
                      <Tag>Save DC {sc.saveDc}</Tag>
                      <Tag>Atk {formatModifier(sc.attackBonus)}</Tag>
                      <Tag>
                        {sc.cantripsKnown} cantrips · {sc.spellsKnownOrPrepared} {sc.prepStyle.toLowerCase()}
                      </Tag>
                    </TagWrap>
                  </div>
                ))}
                <SlotRow>
                  {sheet.spellSlots.map((s) => (
                    <Slot key={s.level}>
                      Lv {s.level}: {s.total}
                    </Slot>
                  ))}
                  {sheet.pactSlots && (
                    <Slot>
                      Pact Lv {sheet.pactSlots.level}: {sheet.pactSlots.count}
                    </Slot>
                  )}
                </SlotRow>
                {sheet.knownSpells.map((ks) => (
                  <div key={ks.classIndex} style={{ marginTop: "0.4rem" }}>
                    {ks.cantrips.length > 0 && (
                      <>
                        <div style={{ fontSize: "0.8rem", color: "#85765f", margin: "0.3rem 0" }}>
                          Cantrips
                        </div>
                        <TagWrap>
                          {ks.cantrips.map((c) => (
                            <Tooltip key={c.index} title={c.name} content={spellDesc(c.index)}>
                              <Tag>{c.name}</Tag>
                            </Tooltip>
                          ))}
                        </TagWrap>
                      </>
                    )}
                    {ks.spells.length > 0 && (
                      <>
                        <div style={{ fontSize: "0.8rem", color: "#85765f", margin: "0.5rem 0 0.3rem" }}>
                          Spells
                        </div>
                        <TagWrap>
                          {[...ks.spells]
                            .sort(
                              (a, b) =>
                                (spellMap.get(a.index)?.level ?? 0) -
                                (spellMap.get(b.index)?.level ?? 0)
                            )
                            .map((c) => (
                              <Tooltip key={c.index} title={c.name} content={spellDesc(c.index)}>
                                <Tag>{c.name}</Tag>
                              </Tooltip>
                            ))}
                        </TagWrap>
                      </>
                    )}
                  </div>
                ))}
              </Card>
            )}

            <Card data-export-block>
              <CardLabel>Features & Traits</CardLabel>
              <div style={{ columns: 2, columnGap: "1.2rem" }}>
                {sheet.features.map((f, i) => (
                  <FeatureItem key={`${f.name}-${i}`} style={{ breakInside: "avoid" }}>
                    <FeatureName>
                      {f.name}
                      <FeatureSrc>{f.source}</FeatureSrc>
                    </FeatureName>
                  </FeatureItem>
                ))}
              </div>
            </Card>

            <Card data-export-block>
              <CardLabel>Proficiencies & Languages</CardLabel>
              {sheet.proficiencies.armor.length > 0 && (
                <Line>
                  <strong style={{ color: "#b7a78d" }}>Armor</strong>
                  <span style={{ textAlign: "right" }}>{sheet.proficiencies.armor.join(", ")}</span>
                </Line>
              )}
              {sheet.proficiencies.weapons.length > 0 && (
                <Line>
                  <strong style={{ color: "#b7a78d" }}>Weapons</strong>
                  <span style={{ textAlign: "right" }}>{sheet.proficiencies.weapons.join(", ")}</span>
                </Line>
              )}
              {sheet.proficiencies.tools.length > 0 && (
                <Line>
                  <strong style={{ color: "#b7a78d" }}>Tools</strong>
                  <span style={{ textAlign: "right" }}>{sheet.proficiencies.tools.join(", ")}</span>
                </Line>
              )}
              <Line>
                <strong style={{ color: "#b7a78d" }}>Languages</strong>
                <span style={{ textAlign: "right" }}>{sheet.languages.join(", ")}</span>
              </Line>
            </Card>

            <Card data-export-block>
              <CardLabel>Equipment</CardLabel>
              <TagWrap>
                {sheet.equipment.map((e, i) => (
                  <Tag key={`${e}-${i}`}>{e}</Tag>
                ))}
              </TagWrap>
            </Card>

            {(sheet.personality || sheet.ideals || sheet.bonds || sheet.flaws || sheet.backstory) && (
              <Card data-export-block>
                <CardLabel>Character</CardLabel>
                {sheet.personality && (
                  <>
                    <FeatureName>Personality</FeatureName>
                    <Prose>{sheet.personality}</Prose>
                  </>
                )}
                {sheet.ideals && (
                  <>
                    <FeatureName>Ideals</FeatureName>
                    <Prose>{sheet.ideals}</Prose>
                  </>
                )}
                {sheet.bonds && (
                  <>
                    <FeatureName>Bonds</FeatureName>
                    <Prose>{sheet.bonds}</Prose>
                  </>
                )}
                {sheet.flaws && (
                  <>
                    <FeatureName>Flaws</FeatureName>
                    <Prose>{sheet.flaws}</Prose>
                  </>
                )}
                {sheet.backstory && (
                  <>
                    <FeatureName>Backstory</FeatureName>
                    <Prose>{sheet.backstory}</Prose>
                  </>
                )}
              </Card>
            )}
          </Col>
        </Columns>
      </Sheet>
    );
  }
);

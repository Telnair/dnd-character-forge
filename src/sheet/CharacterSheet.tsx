import { forwardRef } from "react";
import styled from "styled-components";
import { ABILITY_NAMES, ABILITY_ORDER, classMap, skillMap, spellMap } from "@/data";
import { formatModifier, type DerivedSheet } from "@/engine";
import { ABILITY_COLORS } from "@/assets/abilityColors";
import { SkillIcon, SaveIcon } from "@/assets/SkillIcon";
import { Tooltip } from "@/ui/Tooltip";
import { SpellTooltip } from "@/ui/SpellCard";
import { FeatureTooltip } from "@/ui/FeatureCard";

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
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.7rem;
  flex-wrap: wrap;
`;

const Name = styled.h1`
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  color: ${({ theme }) => theme.colors.goldBright};
  text-shadow: 0 0 20px rgba(245, 196, 81, 0.3);
  line-height: 1;
`;

const SubLine = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: 0.25rem;
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

const CardLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ember};
  margin-bottom: 0.4rem;
`;

const AbilityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
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
  font-size: 0.65rem;
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
  color: ${({ theme }) => theme.colors.textFaint};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const Stat = styled.div`
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.45rem;
  background: rgba(0, 0, 0, 0.25);
`;

const StatNum = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
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
  padding: 0.12rem 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.92rem;
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

const SkillGroup = styled.div`
  margin-bottom: 0.45rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const SkillGroupLabel = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
  border-bottom: 1px solid ${({ $color }) => `${$color}33`};
  padding-bottom: 0.15rem;
  margin: 0.3rem 0 0.25rem;
`;

const SaveLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.textDim};
  font-style: italic;
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

const EquipGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
`;

const EquipBox = styled.div<{ $coin?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid
    ${({ theme, $coin }) => ($coin ? `${theme.colors.goldBright}55` : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $coin }) => ($coin ? "rgba(245,196,81,0.1)" : "rgba(0,0,0,0.28)")};
  padding: 0.45rem 0.6rem;
`;

const EquipName = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.text};
`;

const EquipQty = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.goldBright};
  flex: 0 0 auto;
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
              <CardLabel>Saving Throws &amp; Skills</CardLabel>
              {ABILITY_ORDER.map((ab) => {
                const group = sheet.skills.filter((s) => s.ability === ab);
                const save = sheet.savingThrows.find((st) => st.ability === ab);
                if (!save && group.length === 0) return null;
                return (
                  <SkillGroup key={ab}>
                    <SkillGroupLabel $color={ABILITY_COLORS[ab]}>
                      {ABILITY_NAMES[ab]}
                    </SkillGroupLabel>
                    {save && (
                      <Line>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Dot $on={save.proficient} />
                          <SaveIcon ability={ab} size={15} />
                          <SaveLabel>Saving Throw</SaveLabel>
                        </span>
                        <Mod>{formatModifier(save.modifier)}</Mod>
                      </Line>
                    )}
                    {group.map((s) => (
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
                  </SkillGroup>
                );
              })}
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
                            <SpellTooltip key={c.index} index={c.index}>
                              <Tag>{c.name}</Tag>
                            </SpellTooltip>
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
                              <SpellTooltip key={c.index} index={c.index}>
                                <Tag>{c.name}</Tag>
                              </SpellTooltip>
                            ))}
                        </TagWrap>
                      </>
                    )}
                  </div>
                ))}
              </Card>
            )}

            {sheet.subclassSpells.length > 0 && (
              <Card data-export-block>
                <CardLabel>Subclass Spells · Always Prepared</CardLabel>
                {sheet.subclassSpells.map((ss) => (
                  <div key={ss.classIndex} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.8rem", color: "#85765f", margin: "0.2rem 0 0.3rem" }}>
                      {ss.subclassName}
                    </div>
                    <TagWrap>
                      {ss.spells.map((s) => (
                        <SpellTooltip key={s.index} index={s.index}>
                          <Tag>{s.name}</Tag>
                        </SpellTooltip>
                      ))}
                    </TagWrap>
                  </div>
                ))}
              </Card>
            )}

            {sheet.speciesSpells.length > 0 && (
              <Card data-export-block>
                <CardLabel>Species &amp; Legacy Spells · Always Prepared</CardLabel>
                {sheet.speciesSpells.map((ss, i) => (
                  <div key={`${ss.source}-${ss.traitName}-${i}`} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.8rem", color: "#85765f", margin: "0.2rem 0 0.3rem" }}>
                      {ss.source} · {ss.traitName}
                      {ss.ability.length > 0 && (
                        <span style={{ color: "#6f6354" }}> · {ss.ability.join(" / ")}</span>
                      )}
                    </div>
                    <TagWrap>
                      {ss.spells.map((s) => (
                        <SpellTooltip key={s.index} index={s.index}>
                          <Tag>{s.name}</Tag>
                        </SpellTooltip>
                      ))}
                    </TagWrap>
                    {ss.spells.some((s) => s.swappableFrom?.length) && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#6f6354",
                          marginTop: 3,
                          fontStyle: "italic",
                        }}
                      >
                        Cantrip swappable each Long Rest from{" "}
                        {[...new Set(ss.spells.flatMap((s) => s.swappableFrom ?? []))]
                          .map((c) => classMap.get(c)?.name ?? c)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}

            {sheet.featSpells.length > 0 && (
              <Card data-export-block>
                <CardLabel>Feat Spells</CardLabel>
                {sheet.featSpells.map((fs, i) => (
                  <div key={`${fs.featName}-${i}`} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "#c8b690", margin: "0.2rem 0 0.2rem" }}>
                      {fs.featName}
                    </div>
                    {fs.spells.length > 0 && (
                      <TagWrap>
                        {fs.spells.map((s) => (
                          <SpellTooltip key={s.index} index={s.index}>
                            <Tag>{s.name}</Tag>
                          </SpellTooltip>
                        ))}
                      </TagWrap>
                    )}
                    {fs.notes.map((g, j) => (
                      <div
                        key={j}
                        style={{ fontSize: "0.82rem", color: "#85765f", marginTop: 3 }}
                      >
                        {g} <em>(choose on your sheet)</em>
                      </div>
                    ))}
                  </div>
                ))}
              </Card>
            )}

            <Card data-export-block>
              <CardLabel>Features & Traits</CardLabel>
              <div style={{ columns: 2, columnGap: "1.2rem" }}>
                {sheet.features.map((f, i) => (
                  <FeatureItem key={`${f.name}-${i}`} style={{ breakInside: "avoid" }}>
                    <FeatureTooltip feature={f}>
                      <FeatureName as="span">
                        {f.name}
                        <FeatureSrc>{f.source}</FeatureSrc>
                      </FeatureName>
                    </FeatureTooltip>
                  </FeatureItem>
                ))}
              </div>
            </Card>

            {sheet.weaponMasteries.length > 0 && (
              <Card data-export-block>
                <CardLabel>Weapon Masteries</CardLabel>
                {sheet.weaponMasteries.map((m, i) => (
                  <FeatureItem key={`${m.weapon}-${i}`} style={{ breakInside: "avoid" }}>
                    <FeatureName>
                      {m.weapon}
                      <FeatureSrc>{m.mastery}</FeatureSrc>
                    </FeatureName>
                    {m.desc && (
                      <div style={{ fontSize: "0.85rem", color: "#b7a78d", marginTop: 2 }}>
                        {m.desc}
                      </div>
                    )}
                  </FeatureItem>
                ))}
              </Card>
            )}

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
              <EquipGrid>
                {sheet.equipment.map((e, i) => (
                  <EquipBox key={`${e.index ?? e.name}-${i}`} $coin={!!e.unit}>
                    <EquipName>{e.unit ? `${e.quantity} ${e.unit}` : e.name}</EquipName>
                    {!e.unit && e.quantity > 1 && <EquipQty>×{e.quantity}</EquipQty>}
                  </EquipBox>
                ))}
              </EquipGrid>
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

import styled from "styled-components";
import { featMap, raceMap, races, subraceMap, traitMap } from "@/data";
import type { Trait } from "@/data/types";
import { speciesTraitChoiceGroups, traitFeatOptions } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Grid, Pill, ScrollArea, SelectCard, Divider } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Counter } from "../common";
import { ClassIcon } from "@/assets/ClassIcon";
import { FeatChoice } from "./FeatChoice";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const CardRow = styled.div`
  display: flex;
  gap: 0.8rem;
  align-items: center;
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.35rem;
  width: 100%;
`;

const SpeciesPill = styled(Pill)`
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  padding: 0.18rem 0.48rem;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
`;

const ChipBtn = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  background: ${({ $active }) => ($active ? "rgba(245,196,81,0.16)" : "rgba(0,0,0,0.3)")};
  color: ${({ theme, $active }) => ($active ? theme.colors.goldBright : theme.colors.text)};
  opacity: ${({ $disabled }) => ($disabled ? 0.35 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
`;

const Block = styled.div`
  margin-top: 0.4rem;
`;

const TraitBox = styled.div`
  border-left: 3px solid ${({ theme }) => theme.colors.arcane};
  padding-left: 0.9rem;
  margin-top: 0.8rem;
`;

const TraitName = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.22rem;
  color: ${({ theme }) => theme.colors.goldBright};
  margin-bottom: 0.15rem;
`;

const SubspeciesCard = styled(SelectCard)`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

export function RaceStep() {
  const { draft, update } = useCharacter();
  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  const subrace = draft.subraceIndex ? subraceMap.get(draft.subraceIndex) : undefined;
  const raceSubraces = race
    ? (race.subraces ?? [])
        .map((s) => subraceMap.get(s.index))
        .filter((s): s is NonNullable<typeof s> => !!s)
    : [];

  const selectRace = (index: string) =>
    update((d) => {
      d.raceIndex = index;
      d.subraceIndex = undefined;
      d.speciesTraitChoices = {};
      d.traitFeatChoices = {};
    });

  // Pick (or toggle off) the Origin feat a trait grants; switching feats resets
  // its sub-choices.
  const selectTraitFeat = (traitIndex: string, featIndex: string) =>
    update((d) => {
      d.traitFeatChoices ??= {};
      const cur = d.traitFeatChoices[traitIndex];
      d.traitFeatChoices[traitIndex] =
        cur?.featIndex === featIndex ? {} : { featIndex, featChoices: {} };
    });

  // Toggle one of the chosen feat's own structured choices (mirrors the background
  // Origin-feat picker, including invalidating spell picks when their class changes).
  const toggleTraitFeatChoice = (
    traitIndex: string,
    choiceIdx: number,
    option: string,
    choose: number
  ) =>
    update((d) => {
      d.traitFeatChoices ??= {};
      const sel = (d.traitFeatChoices[traitIndex] ??= {});
      sel.featChoices ??= {};
      const arr = (sel.featChoices[choiceIdx] ??= []);
      const i = arr.indexOf(option);
      if (i >= 0) arr.splice(i, 1);
      else if (choose === 1) sel.featChoices[choiceIdx] = [option];
      else if (arr.length < choose) arr.push(option);
      const feat = sel.featIndex ? featMap.get(sel.featIndex) : undefined;
      const defs: any[] = (feat as any)?.choices ?? [];
      if (defs[choiceIdx]?.type === "classes") {
        defs.forEach((spec: any, di: number) => {
          if (spec?.type === "spells" && spec?.spell_source?.from_class_choice)
            sel.featChoices![di] = [];
        });
      }
    });

  // A trait's groups share one picks array; `groupOptions` scopes the per-group
  // limit so picking a tool doesn't count against a sibling skill choice.
  const toggleTraitChoice = (
    traitIndex: string,
    optionIndex: string,
    choose: number,
    groupOptions: string[]
  ) =>
    update((d) => {
      d.speciesTraitChoices ??= {};
      const arr = (d.speciesTraitChoices[traitIndex] ??= []);
      const i = arr.indexOf(optionIndex);
      if (i >= 0) {
        arr.splice(i, 1);
        return;
      }
      const inGroup = arr.filter((p) => groupOptions.includes(p)).length;
      if (inGroup < choose) arr.push(optionIndex);
    });

  // Resolve the trait entities of the selected species + subspecies.
  const activeTraits: Trait[] = [
    ...(race?.traits ?? []),
    ...(subrace?.traits ?? []),
  ]
    .map((ref) => traitMap.get(ref.index))
    .filter((t): t is Trait => !!t);

  return (
    <>
      <StepIntro
        eyebrow="Step I"
        title="Choose Your Species"
        fullWidthDesc
        desc="Your species shapes your body, your senses, and the traits coursing through your blood. (In the 2024 rules, ability bonuses come from your background, not your species.)"
      />

      <Grid $min="240px">
        {races.map((r) => (
          <SelectCard
            key={r.index}
            $active={draft.raceIndex === r.index}
            onClick={() => selectRace(r.index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
          >
            <CardRow>
              <ClassIcon index={r.index} name={r.name} size={46} kind="races" />
              <CardBody>
                <CardTitle>{r.name}</CardTitle>
                <PillRow>
                  <SpeciesPill $tone="muted">{r.size ?? "Varies"}</SpeciesPill>
                  <SpeciesPill $tone="muted">Speed {r.speed}</SpeciesPill>
                  {r.type && <SpeciesPill $tone="arcane">{r.type}</SpeciesPill>}
                </PillRow>
              </CardBody>
            </CardRow>
          </SelectCard>
        ))}
      </Grid>

      {raceSubraces.length > 0 && (
        <Block>
          <FieldLabel>Lineage / Subspecies</FieldLabel>
          <Grid $min="240px">
            {raceSubraces.map((sub) => (
              <SubspeciesCard
                key={sub.index}
                $active={draft.subraceIndex === sub.index}
                onClick={() =>
                  update((d) => {
                    d.subraceIndex = sub.index;
                  })
                }
                whileTap={{ scale: 0.99 }}
              >
                <CardTitle>{sub.name}</CardTitle>
                {sub.desc?.[0] && <HelpText>{sub.desc[0]}</HelpText>}
              </SubspeciesCard>
            ))}
          </Grid>
        </Block>
      )}

      {race && (
        <>
          <Divider />
          <Block>
            <FieldLabel>{race.name} Traits</FieldLabel>
            {race.size_description && <HelpText>{race.size_description}</HelpText>}
            {activeTraits.map((trait) => {
              const groups = speciesTraitChoiceGroups(trait);
              const chosen = draft.speciesTraitChoices?.[trait.index] ?? [];
              return (
                <TraitBox key={trait.index}>
                  <TraitName>{trait.name}</TraitName>
                  {trait.desc.map((d, i) => (
                    <HelpText key={i}>{d}</HelpText>
                  ))}
                  {groups.map((group, gi) => {
                    const groupOptions = group.options.map((o) => o.index);
                    const groupPicks = chosen.filter((p) => groupOptions.includes(p));
                    return (
                      <div key={gi}>
                        <FieldLabel style={{ marginTop: "0.6rem" }}>
                          Choose {group.choose}{" "}
                          <Counter $done={groupPicks.length === group.choose}>
                            {groupPicks.length}/{group.choose}
                          </Counter>
                        </FieldLabel>
                        <Row>
                          {group.options.map((opt) => {
                            const active = chosen.includes(opt.index);
                            const disabled = !active && groupPicks.length >= group.choose;
                            return (
                              <ChipBtn
                                key={opt.index}
                                $active={active}
                                $disabled={disabled}
                                onClick={() =>
                                  !disabled &&
                                  toggleTraitChoice(
                                    trait.index,
                                    opt.index,
                                    group.choose,
                                    groupOptions
                                  )
                                }
                              >
                                {opt.name.replace(/^(Skill|Tool): /, "")}
                              </ChipBtn>
                            );
                          })}
                        </Row>
                      </div>
                    );
                  })}
                  {(() => {
                    const featOpts = traitFeatOptions(trait);
                    if (!featOpts) return null;
                    const sel = draft.traitFeatChoices?.[trait.index];
                    const chosenFeat = sel?.featIndex
                      ? featMap.get(sel.featIndex)
                      : undefined;
                    // The class chosen inside the feat (drives Magic Initiate's spell list).
                    const featChoiceDefs: any[] = (chosenFeat as any)?.choices ?? [];
                    const classChoiceIdx = featChoiceDefs.findIndex(
                      (c) => c?.type === "classes"
                    );
                    const chosenClass =
                      classChoiceIdx >= 0
                        ? sel?.featChoices?.[classChoiceIdx]?.[0]
                        : undefined;
                    return (
                      <div>
                        <FieldLabel style={{ marginTop: "0.6rem" }}>
                          Choose {featOpts.choose} Origin feat{" "}
                          <Counter $done={!!chosenFeat}>
                            {chosenFeat ? 1 : 0}/{featOpts.choose}
                          </Counter>
                        </FieldLabel>
                        <ScrollArea $max="190px">
                          <Row>
                            {featOpts.feats.map((f) => (
                              <ChipBtn
                                key={f.index}
                                $active={sel?.featIndex === f.index}
                                onClick={() => selectTraitFeat(trait.index, f.index)}
                              >
                                {f.name}
                              </ChipBtn>
                            ))}
                          </Row>
                        </ScrollArea>
                        {chosenFeat && (
                          <div style={{ marginTop: "0.4rem" }}>
                            {chosenFeat.desc.map((d, i) => (
                              <HelpText key={i}>{d}</HelpText>
                            ))}
                            {featChoiceDefs.map((c, i) => (
                              <FeatChoice
                                key={i}
                                choice={c}
                                idx={i}
                                selected={sel?.featChoices?.[i] ?? []}
                                onToggle={(ci, option, choose) =>
                                  toggleTraitFeatChoice(trait.index, ci, option, choose)
                                }
                                chosenClass={chosenClass}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TraitBox>
              );
            })}
          </Block>
        </>
      )}
    </>
  );
}

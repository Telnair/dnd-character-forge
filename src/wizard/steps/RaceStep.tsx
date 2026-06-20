import styled from "styled-components";
import { raceMap, races, subraceMap, traitMap } from "@/data";
import type { Trait } from "@/data/types";
import { speciesTraitChoiceGroups } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Grid, Pill, SelectCard, Divider } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Counter } from "../common";
import { ClassIcon } from "@/assets/ClassIcon";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.goldBright};
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
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
              <ClassIcon index={r.index} name={r.name} size={46} kind="races" />
              <div>
                <CardTitle>{r.name}</CardTitle>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: 4 }}>
                  <Pill $tone="muted">{r.size ?? "Varies"}</Pill>
                  <Pill $tone="muted">Speed {r.speed}</Pill>
                  {r.type && <Pill $tone="arcane">{r.type}</Pill>}
                </div>
              </div>
            </div>
          </SelectCard>
        ))}
      </Grid>

      {raceSubraces.length > 0 && (
        <Block>
          <FieldLabel>Lineage / Subspecies</FieldLabel>
          <Grid $min="240px">
            {raceSubraces.map((sub) => (
              <SelectCard
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
              </SelectCard>
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
                  <div style={{ fontWeight: 600, color: "inherit" }}>{trait.name}</div>
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
                </TraitBox>
              );
            })}
          </Block>
        </>
      )}
    </>
  );
}

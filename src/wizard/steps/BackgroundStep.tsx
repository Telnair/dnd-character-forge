import styled from "styled-components";
import {
  ABILITY_ABBR,
  backgroundMap,
  backgrounds,
  featMap,
  type AbilityKey,
} from "@/data";
import { useCharacter } from "@/store/characterStore";
import { Grid, Pill, SelectCard, Divider } from "@/ui/primitives";
import { FeatureTooltip } from "@/ui/FeatureCard";
import { StepIntro, FieldLabel, HelpText, Block, ChipRow } from "../common";
import { FeatChoice } from "./FeatChoice";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const FeatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.55rem;
`;

const FeatLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textFaint};
`;

const FeatBox = styled.div`
  border-left: 3px solid ${({ theme }) => theme.colors.ember};
  padding-left: 0.9rem;
  margin-top: 0.4rem;
`;

export function BackgroundStep() {
  const { draft, update } = useCharacter();
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;
  const feat = bg?.feat ? featMap.get(bg.feat.index) : undefined;

  const select = (index: string) =>
    update((d) => {
      d.backgroundIndex = index;
      d.backgroundAbilityChoices = {};
      d.backgroundEquipmentChoices = {};
      d.originFeatChoices = {};
    });

  const toggleFeatChoice = (choiceIdx: number, option: string, choose: number) =>
    update((d) => {
      d.originFeatChoices ??= {};
      const arr = (d.originFeatChoices[choiceIdx] ??= []);
      const i = arr.indexOf(option);
      if (i >= 0) arr.splice(i, 1); // toggle the selected one off
      else if (choose === 1) d.originFeatChoices[choiceIdx] = [option]; // radio: replace
      else if (arr.length < choose) arr.push(option);
      // Changing the spell-list class invalidates spell picks drawn from it.
      const defs: any[] = (feat as any)?.choices ?? [];
      if (defs[choiceIdx]?.type === "classes") {
        defs.forEach((spec: any, di: number) => {
          if (spec?.type === "spells" && spec?.spell_source?.from_class_choice)
            d.originFeatChoices![di] = [];
        });
      }
    });

  // The class chosen in the feat's "spell list" pick (drives `spells` options).
  const chosenClass = (() => {
    const choices: any[] = (feat as any)?.choices ?? [];
    const classChoiceIdx = choices.findIndex((c) => c?.type === "classes");
    return classChoiceIdx >= 0
      ? draft.originFeatChoices?.[classChoiceIdx]?.[0]
      : undefined;
  })();

  return (
    <>
      <StepIntro
        eyebrow="Step III"
        title="Recall Your History"
        desc="Your background grants skill and tool proficiencies, ability boosts (assigned on the Abilities step), and an Origin Feat."
      />

      <Grid $min="240px">
        {backgrounds.map((b) => {
          const cardFeat = b.feat ? featMap.get(b.feat.index) : undefined;
          return (
            <SelectCard
              key={b.index}
              $active={draft.backgroundIndex === b.index}
              onClick={() => select(b.index)}
              whileTap={{ scale: 0.99 }}
            >
              <CardTitle>{b.name}</CardTitle>
              <ChipRow>
                {b.ability_scores.map((a) => (
                  <Pill key={a.index} $tone="gold">
                    {ABILITY_ABBR[a.index as AbilityKey] ?? a.name}
                  </Pill>
                ))}
              </ChipRow>
              <ChipRow>
                {b.starting_proficiencies.map((p) => (
                  <Pill key={p.index} $tone="muted">
                    {p.name.replace(/^Skill: /, "").replace(/^Tool: /, "")}
                  </Pill>
                ))}
              </ChipRow>
              {cardFeat && (
                <FeatRow>
                  <FeatLabel>Feat</FeatLabel>
                  <FeatureTooltip
                    feature={{
                      name: cardFeat.name,
                      source: "Origin Feat",
                      desc: cardFeat.desc,
                    }}
                  >
                    <Pill $tone="ember">{cardFeat.name}</Pill>
                  </FeatureTooltip>
                </FeatRow>
              )}
            </SelectCard>
          );
        })}
      </Grid>

      {bg && (
        <>
          <Divider />
          <Block>
            <FieldLabel>Granted Proficiencies</FieldLabel>
            <ChipRow>
              {bg.starting_proficiencies.map((p) => (
                <Pill key={p.index}>{p.name}</Pill>
              ))}
            </ChipRow>
          </Block>

          <Block>
            <FieldLabel>Ability Boosts</FieldLabel>
            <HelpText>
              Assign +2/+1 (or +1/+1/+1) among{" "}
              {bg.ability_scores.map((a) => a.name).join(", ")} on the Abilities step.
            </HelpText>
          </Block>

          {feat && (
            <Block>
              <FieldLabel>Origin Feat — {feat.name}</FieldLabel>
              <FeatBox>
                {feat.desc.map((d, i) => (
                  <HelpText key={i}>{d}</HelpText>
                ))}
                {((feat as any).choices ?? []).map((c: any, i: number) => (
                  <FeatChoice
                    key={i}
                    choice={c}
                    idx={i}
                    selected={draft.originFeatChoices?.[i] ?? []}
                    onToggle={toggleFeatChoice}
                    chosenClass={chosenClass}
                  />
                ))}
              </FeatBox>
            </Block>
          )}
        </>
      )}
    </>
  );
}

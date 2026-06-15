import styled from "styled-components";
import {
  backgroundMap,
  backgrounds,
  languages as allLanguages,
  proficiencyMap,
  skillMap,
} from "@/data";
import { useCharacter } from "@/store/characterStore";
import { Grid, Pill, SelectCard, Divider } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block, Chip, ChipRow, Counter } from "../common";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const FeatureBox = styled.div`
  border-left: 3px solid ${({ theme }) => theme.colors.ember};
  padding-left: 0.9rem;
  margin-top: 0.4rem;
`;

export function BackgroundStep() {
  const { draft, update } = useCharacter();
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;

  const select = (index: string) =>
    update((d) => {
      d.backgroundIndex = index;
      d.backgroundLanguageChoices = [];
      d.backgroundEquipmentChoices = {};
    });

  const langCount = bg?.language_options?.choose ?? 0;
  const toggleLang = (idx: string) =>
    update((d) => {
      d.backgroundLanguageChoices ??= [];
      const i = d.backgroundLanguageChoices.indexOf(idx);
      if (i >= 0) d.backgroundLanguageChoices.splice(i, 1);
      else if (d.backgroundLanguageChoices.length < langCount)
        d.backgroundLanguageChoices.push(idx);
    });

  const bgSkills = (bg?.starting_proficiencies ?? [])
    .map((p) => proficiencyMap.get(p.index)?.reference)
    .filter((r) => r && skillMap.has(r.index));

  return (
    <>
      <StepIntro
        eyebrow="Step IV"
        title="Recall Your History"
        desc="Where you came from grants proficiencies, languages, and a defining feature from your former life."
      />

      <Grid $min="240px">
        {backgrounds.map((b) => (
          <SelectCard
            key={b.index}
            $active={draft.backgroundIndex === b.index}
            onClick={() => select(b.index)}
            whileTap={{ scale: 0.99 }}
          >
            <CardTitle>{b.name}</CardTitle>
            <ChipRow>
              {b.starting_proficiencies.map((p) => (
                <Pill key={p.index} $tone="muted">
                  {p.name.replace(/^Skill: /, "")}
                </Pill>
              ))}
            </ChipRow>
          </SelectCard>
        ))}
      </Grid>

      {bg && (
        <>
          <Divider />
          <Block>
            <FieldLabel>Granted Skill Proficiencies</FieldLabel>
            <ChipRow>
              {bgSkills.map((r) => (
                <Pill key={r!.index}>{r!.name}</Pill>
              ))}
            </ChipRow>
          </Block>

          <Block>
            <FieldLabel>Feature — {bg.feature.name}</FieldLabel>
            <FeatureBox>
              {bg.feature.desc.map((d, i) => (
                <HelpText key={i}>{d}</HelpText>
              ))}
            </FeatureBox>
          </Block>

          {langCount > 0 && (
            <Block>
              <FieldLabel>
                Languages{" "}
                <Counter $done={(draft.backgroundLanguageChoices?.length ?? 0) === langCount}>
                  {draft.backgroundLanguageChoices?.length ?? 0}/{langCount}
                </Counter>
              </FieldLabel>
              <ChipRow>
                {allLanguages.map((l) => {
                  const active = draft.backgroundLanguageChoices?.includes(l.index) ?? false;
                  const locked =
                    !active && (draft.backgroundLanguageChoices?.length ?? 0) >= langCount;
                  return (
                    <Chip
                      key={l.index}
                      $active={active}
                      $locked={locked}
                      onClick={() => !locked && toggleLang(l.index)}
                    >
                      {l.name}
                    </Chip>
                  );
                })}
              </ChipRow>
            </Block>
          )}
        </>
      )}
    </>
  );
}

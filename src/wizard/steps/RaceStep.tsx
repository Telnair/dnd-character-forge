import styled from "styled-components";
import {
  ABILITY_ABBR,
  ABILITY_ORDER,
  languages as allLanguages,
  raceMap,
  races,
  skills as allSkills,
  subraceMap,
  subraces,
  type AbilityKey,
} from "@/data";
import {
  RACE_FREE_LANGUAGES,
  RACE_FREE_SKILLS,
  formatModifier,
  raceAbilityChoiceCount,
  raceFixedAbilities,
} from "@/engine";
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

export function RaceStep() {
  const { draft, update } = useCharacter();
  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  const raceSubraces = race ? subraces.filter((s) => s.race.index === race.index) : [];

  const selectRace = (index: string) =>
    update((d) => {
      d.raceIndex = index;
      d.subraceIndex = undefined;
      d.raceAbilityChoices = {};
      d.raceSkillChoices = [];
      d.raceLanguageChoices = [];
    });

  const abilityPicks = raceAbilityChoiceCount(draft);
  const fixed = raceFixedAbilities(draft);
  const abilityChosenTotal = ABILITY_ORDER.reduce(
    (s, k) => s + (draft.raceAbilityChoices?.[k] ?? 0),
    0
  );

  const toggleAbility = (key: AbilityKey) =>
    update((d) => {
      d.raceAbilityChoices ??= {};
      if (d.raceAbilityChoices[key]) {
        delete d.raceAbilityChoices[key];
      } else {
        const total = ABILITY_ORDER.reduce(
          (s, k) => s + (d.raceAbilityChoices?.[k] ?? 0),
          0
        );
        if (total < abilityPicks) d.raceAbilityChoices[key] = 1;
      }
    });

  const freeSkills = draft.raceIndex ? RACE_FREE_SKILLS[draft.raceIndex] ?? 0 : 0;
  const toggleSkill = (idx: string) =>
    update((d) => {
      d.raceSkillChoices ??= [];
      const i = d.raceSkillChoices.indexOf(idx);
      if (i >= 0) d.raceSkillChoices.splice(i, 1);
      else if (d.raceSkillChoices.length < freeSkills) d.raceSkillChoices.push(idx);
    });

  const freeLangs = draft.raceIndex ? RACE_FREE_LANGUAGES[draft.raceIndex] ?? 0 : 0;
  const knownLangs = new Set((race?.languages ?? []).map((l) => l.index));
  const toggleLang = (idx: string) =>
    update((d) => {
      d.raceLanguageChoices ??= [];
      const i = d.raceLanguageChoices.indexOf(idx);
      if (i >= 0) d.raceLanguageChoices.splice(i, 1);
      else if (d.raceLanguageChoices.length < freeLangs) d.raceLanguageChoices.push(idx);
    });

  return (
    <>
      <StepIntro
        eyebrow="Step I"
        title="Choose Your Origin"
        desc="Your race shapes your body, your senses, and the ancient gifts coursing through your blood."
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
                  {r.ability_bonuses.map((b) => (
                    <Pill key={b.ability_score.index}>
                      {ABILITY_ABBR[b.ability_score.index as AbilityKey]} {formatModifier(b.bonus)}
                    </Pill>
                  ))}
                  <Pill $tone="muted">Speed {r.speed}</Pill>
                </div>
              </div>
            </div>
          </SelectCard>
        ))}
      </Grid>

      {race && (
        <>
          <Divider />
          <Block>
            <FieldLabel>{race.name} Traits</FieldLabel>
            <HelpText>{race.size_description}</HelpText>
            <Row>
              {race.traits.map((t) => (
                <Pill key={t.index} $tone="arcane">
                  {t.name}
                </Pill>
              ))}
            </Row>
          </Block>
        </>
      )}

      {raceSubraces.length > 0 && (
        <Block>
          <FieldLabel>Subrace</FieldLabel>
          <Grid $min="240px">
            {raceSubraces.map((s) => {
              const sub = subraceMap.get(s.index)!;
              return (
                <SelectCard
                  key={s.index}
                  $active={draft.subraceIndex === s.index}
                  onClick={() => update((d) => (d.subraceIndex = s.index))}
                  whileTap={{ scale: 0.99 }}
                >
                  <CardTitle>{sub.name}</CardTitle>
                  <Row>
                    {sub.ability_bonuses.map((b) => (
                      <Pill key={b.ability_score.index}>
                        {ABILITY_ABBR[b.ability_score.index as AbilityKey]} {formatModifier(b.bonus)}
                      </Pill>
                    ))}
                  </Row>
                </SelectCard>
              );
            })}
          </Grid>
        </Block>
      )}

      {abilityPicks > 0 && (
        <Block>
          <FieldLabel>
            Versatile Ability Bonus{" "}
            <Counter $done={abilityChosenTotal === abilityPicks}>
              {abilityChosenTotal}/{abilityPicks}
            </Counter>
          </FieldLabel>
          <HelpText>Add +1 to {abilityPicks} abilities of your choice.</HelpText>
          <Row>
            {ABILITY_ORDER.map((k) => {
              const isFixed = fixed.includes(k);
              const active = !!draft.raceAbilityChoices?.[k];
              return (
                <ChipBtn
                  key={k}
                  $active={active}
                  $disabled={isFixed}
                  disabled={isFixed}
                  onClick={() => !isFixed && toggleAbility(k)}
                >
                  {ABILITY_ABBR[k]} {active ? "+1" : ""}
                </ChipBtn>
              );
            })}
          </Row>
        </Block>
      )}

      {freeSkills > 0 && (
        <Block>
          <FieldLabel>
            Skill Versatility{" "}
            <Counter $done={(draft.raceSkillChoices?.length ?? 0) === freeSkills}>
              {draft.raceSkillChoices?.length ?? 0}/{freeSkills}
            </Counter>
          </FieldLabel>
          <Row>
            {allSkills.map((s) => {
              const active = draft.raceSkillChoices?.includes(s.index) ?? false;
              const disabled =
                !active && (draft.raceSkillChoices?.length ?? 0) >= freeSkills;
              return (
                <ChipBtn
                  key={s.index}
                  $active={active}
                  $disabled={disabled}
                  onClick={() => toggleSkill(s.index)}
                >
                  {s.name}
                </ChipBtn>
              );
            })}
          </Row>
        </Block>
      )}

      {freeLangs > 0 && (
        <Block>
          <FieldLabel>
            Bonus Language{" "}
            <Counter $done={(draft.raceLanguageChoices?.length ?? 0) === freeLangs}>
              {draft.raceLanguageChoices?.length ?? 0}/{freeLangs}
            </Counter>
          </FieldLabel>
          <Row>
            {allLanguages
              .filter((l) => !knownLangs.has(l.index))
              .map((l) => {
                const active = draft.raceLanguageChoices?.includes(l.index) ?? false;
                const disabled =
                  !active && (draft.raceLanguageChoices?.length ?? 0) >= freeLangs;
                return (
                  <ChipBtn
                    key={l.index}
                    $active={active}
                    $disabled={disabled}
                    onClick={() => toggleLang(l.index)}
                  >
                    {l.name}
                  </ChipBtn>
                );
              })}
          </Row>
        </Block>
      )}
    </>
  );
}

import styled from "styled-components";
import { ABILITY_ABBR, classes, classMap, type AbilityKey } from "@/data";
import { CLASS_CASTING, SUBCLASS_LEVEL } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Grid, Pill, SelectCard, Divider } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block, ChipRow } from "../common";
import { ClassIcon } from "@/assets/ClassIcon";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const Meta = styled.div`
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
`;

const FeatureList = styled.ul`
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  color: ${({ theme }) => theme.colors.textDim};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.02rem;
  columns: 2;
  @media (max-width: 720px) {
    columns: 1;
  }
`;

export function ClassStep() {
  const { draft, update } = useCharacter();
  const primary = draft.classes.find((c) => c.isPrimary) ?? draft.classes[0];
  const selectedIndex = primary?.classIndex;
  const cls = selectedIndex ? classMap.get(selectedIndex) : undefined;

  const selectClass = (index: string) =>
    update((d) => {
      // Replacing the primary class resets class-specific selections.
      const others = d.classes.filter((c) => !c.isPrimary && c.classIndex !== index);
      const existingLevel = d.classes.find((c) => c.isPrimary)?.level ?? 1;
      d.classes = [
        {
          classIndex: index,
          level: d.classes.length <= 1 ? existingLevel : 1,
          isPrimary: true,
          skillChoices: [],
          cantrips: [],
          spells: [],
          profChoices: {},
          equipmentChoices: {},
        },
        ...others.map((c) => ({ ...c, isPrimary: false })),
      ];
    });

  const level1Features = cls
    ? (cls.levels.find((l) => l.level === 1)?.features ?? []).filter(
        (f) => !/ability-score/.test(f.index) && !/-subclass$/.test(f.index)
      )
    : [];

  return (
    <>
      <StepIntro
        eyebrow="Step II"
        title="Answer the Calling"
        desc="Your class is your vocation — the source of your powers and the role you play in any party of adventurers."
      />

      <Grid $min="250px">
        {classes.map((c) => {
          const cfg = CLASS_CASTING[c.index];
          return (
            <SelectCard
              key={c.index}
              $active={selectedIndex === c.index}
              onClick={() => selectClass(c.index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
            >
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                <ClassIcon index={c.index} name={c.name} size={52} />
                <div>
                  <CardTitle>{c.name}</CardTitle>
                  <Meta>
                    <Pill $tone="ember">d{c.hit_die} HD</Pill>
                    {cfg?.caster !== "none" && (
                      <Pill $tone="arcane">
                        {cfg.caster === "pact" ? "Pact Magic" : "Spellcaster"}
                      </Pill>
                    )}
                  </Meta>
                  <Meta>
                    {c.saving_throws.map((s) => (
                      <Pill key={s.index} $tone="muted">
                        {ABILITY_ABBR[s.index as AbilityKey]} save
                      </Pill>
                    ))}
                  </Meta>
                </div>
              </div>
            </SelectCard>
          );
        })}
      </Grid>

      {cls && (
        <>
          <Divider />
          <Block>
            <FieldLabel>{cls.name} — Level 1 Features</FieldLabel>
            <FeatureList>
              {level1Features.map((f) => (
                <li key={f.index}>{f.name}</li>
              ))}
            </FeatureList>
            <HelpText>
              Subclass chosen at level {SUBCLASS_LEVEL[cls.index]}. Hit die d{cls.hit_die}. Saving
              throws: {cls.saving_throws.map((s) => ABILITY_ABBR[s.index as AbilityKey]).join(", ")}.
            </HelpText>
            <ChipRow>
              {cls.proficiencies
                .filter((p) => !p.index.startsWith("skill-") && !p.index.startsWith("saving-throw"))
                .slice(0, 10)
                .map((p) => (
                  <Pill key={p.index} $tone="muted">
                    {p.name}
                  </Pill>
                ))}
            </ChipRow>
          </Block>
        </>
      )}
    </>
  );
}

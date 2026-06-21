import styled from "styled-components";
import { ABILITY_ABBR, classes, classMap, type AbilityKey } from "@/data";
import { CLASS_CASTING, SUBCLASS_LEVEL } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Grid, Pill, SelectCard, Divider } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block, ChipRow } from "../common";
import { ClassIcon } from "@/assets/ClassIcon";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const CardRow = styled.div`
  display: flex;
  gap: 0.85rem;
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
  margin-top: 0.4rem;
  width: 100%;
`;

const ClassPill = styled(Pill)`
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  padding: 0.18rem 0.48rem;
`;

const SubclassNote = styled(HelpText)`
  margin-top: 0.85rem;
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
              <CardRow>
                <ClassIcon index={c.index} name={c.name} size={52} />
                <CardBody>
                  <CardTitle>{c.name}</CardTitle>
                  <PillRow>
                    <ClassPill $tone="ember">d{c.hit_die} HD</ClassPill>
                    {cfg?.caster !== "none" && (
                      <ClassPill $tone="arcane">
                        {cfg.caster === "pact" ? "Pact Magic" : "Spellcaster"}
                      </ClassPill>
                    )}
                    {c.saving_throws.map((s) => (
                      <ClassPill key={s.index} $tone="muted">
                        {ABILITY_ABBR[s.index as AbilityKey]} save
                      </ClassPill>
                    ))}
                  </PillRow>
                </CardBody>
              </CardRow>
            </SelectCard>
          );
        })}
      </Grid>

      {cls && (
        <>
          <Divider />
          <Block>
            <FieldLabel>{cls.name} — Level 1 Features</FieldLabel>
            <ChipRow>
              {level1Features.map((f) => (
                <Pill key={f.index} $tone="muted">
                  {f.name}
                </Pill>
              ))}
            </ChipRow>
            <SubclassNote>
              Subclass chosen at level {SUBCLASS_LEVEL[cls.index]}. Hit die d{cls.hit_die}. Saving
              throws: {cls.saving_throws.map((s) => ABILITY_ABBR[s.index as AbilityKey]).join(", ")}.
            </SubclassNote>
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

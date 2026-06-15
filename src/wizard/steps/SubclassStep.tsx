import styled from "styled-components";
import { classMap, subclassesByClass } from "@/data";
import { SUBCLASS_LEVEL, subclassUnlockedFor } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { SelectCard, Divider, Pill } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block } from "../common";
import { ClassIcon } from "@/assets/ClassIcon";

const CardTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const Desc = styled.p`
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.textDim};
  font-size: 1rem;
  margin: 0.5rem 0 0;
`;

export function SubclassStep() {
  const { draft, update } = useCharacter();
  const unlocked = draft.classes.filter(subclassUnlockedFor);

  const choose = (classIndex: string, subclassIndex: string) =>
    update((d) => {
      const entry = d.classes.find((c) => c.classIndex === classIndex);
      if (entry) entry.subclassIndex = subclassIndex;
    });

  return (
    <>
      <StepIntro
        eyebrow="Step VI"
        title="Walk Your Path"
        desc="A subclass refines your archetype with signature powers that set you apart from others of your calling."
      />

      {unlocked.map((entry) => {
        const cls = classMap.get(entry.classIndex);
        const options = subclassesByClass[entry.classIndex] ?? [];
        return (
          <Block key={entry.classIndex}>
            <Divider />
            <FieldLabel>
              {cls?.name} — choose your path (level {SUBCLASS_LEVEL[entry.classIndex]})
            </FieldLabel>
            {options.map((sub) => (
              <SelectCard
                key={sub.index}
                $active={entry.subclassIndex === sub.index}
                onClick={() => choose(entry.classIndex, sub.index)}
                whileTap={{ scale: 0.99 }}
                style={{ marginTop: "0.6rem", width: "100%" }}
              >
                <div style={{ display: "flex", gap: "0.9rem", alignItems: "flex-start" }}>
                  <ClassIcon index={sub.index} name={sub.name} size={50} kind="subclasses" />
                  <div>
                    <CardTitle>{sub.name}</CardTitle>
                    <Pill $tone="arcane">{sub.subclass_flavor}</Pill>
                    {sub.desc?.slice(0, 2).map((d, i) => (
                      <Desc key={i}>{d}</Desc>
                    ))}
                  </div>
                </div>
              </SelectCard>
            ))}
          </Block>
        );
      })}

      {unlocked.length === 0 && (
        <HelpText>No subclass is available yet at your current levels.</HelpText>
      )}
    </>
  );
}

import styled from "styled-components";
import { useCharacter } from "@/store/characterStore";
import { StepIntro, FieldLabel, Block, TextInput, TextArea, Chip, ChipRow } from "../common";

const Two = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

export function DetailsStep() {
  const { draft, update } = useCharacter();

  return (
    <>
      <StepIntro
        eyebrow="Step X"
        title="Define Your Persona"
        desc="Give your hero a name, a moral compass, and the quirks that bring them to life at the table."
      />

      <Block>
        <FieldLabel>Character Name</FieldLabel>
        <TextInput
          value={draft.name}
          placeholder="e.g. Aelar Moonwhisper"
          onChange={(e) => update((d) => (d.name = e.target.value))}
        />
      </Block>

      <Block>
        <FieldLabel>Alignment</FieldLabel>
        <ChipRow>
          {ALIGNMENTS.map((a) => (
            <Chip
              key={a}
              $active={draft.alignment === a}
              onClick={() => update((d) => (d.alignment = d.alignment === a ? undefined : a))}
            >
              {a}
            </Chip>
          ))}
        </ChipRow>
      </Block>

      <Two>
        <Block>
          <FieldLabel>Personality Traits</FieldLabel>
          <TextArea
            value={draft.personality ?? ""}
            onChange={(e) => update((d) => (d.personality = e.target.value))}
          />
        </Block>
        <Block>
          <FieldLabel>Ideals</FieldLabel>
          <TextArea
            value={draft.ideals ?? ""}
            onChange={(e) => update((d) => (d.ideals = e.target.value))}
          />
        </Block>
        <Block>
          <FieldLabel>Bonds</FieldLabel>
          <TextArea
            value={draft.bonds ?? ""}
            onChange={(e) => update((d) => (d.bonds = e.target.value))}
          />
        </Block>
        <Block>
          <FieldLabel>Flaws</FieldLabel>
          <TextArea
            value={draft.flaws ?? ""}
            onChange={(e) => update((d) => (d.flaws = e.target.value))}
          />
        </Block>
      </Two>

      <Block>
        <FieldLabel>Appearance</FieldLabel>
        <TextArea
          value={draft.appearance ?? ""}
          onChange={(e) => update((d) => (d.appearance = e.target.value))}
        />
      </Block>

      <Block>
        <FieldLabel>Backstory</FieldLabel>
        <TextArea
          style={{ minHeight: 140 }}
          value={draft.backstory ?? ""}
          onChange={(e) => update((d) => (d.backstory = e.target.value))}
        />
      </Block>
    </>
  );
}

import { backgroundMap, classMap, proficiencyMap, skillMap } from "@/data";
import {
  RACE_FIXED_SKILLS,
  classOtherProfChoices,
  classSkillChoice,
  expertiseSlots,
} from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider, Pill } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block, Chip, ChipRow, Counter } from "../common";
import { SkillIcon } from "@/assets/SkillIcon";

function skillsFromBackground(bgIndex?: string): string[] {
  if (!bgIndex) return [];
  const bg = backgroundMap.get(bgIndex);
  return (bg?.starting_proficiencies ?? [])
    .map((p) => proficiencyMap.get(p.index)?.reference?.index)
    .filter((x): x is string => !!x && skillMap.has(x));
}

export function SkillsStep() {
  const { draft, update } = useCharacter();

  const fixedRace = draft.raceIndex ? RACE_FIXED_SKILLS[draft.raceIndex] ?? [] : [];
  const raceChosen = draft.raceSkillChoices ?? [];
  const bgSkills = skillsFromBackground(draft.backgroundIndex);

  const proficientElsewhere = (classIndex: string) => {
    const set = new Set<string>([...fixedRace, ...raceChosen, ...bgSkills]);
    for (const entry of draft.classes) {
      if (entry.classIndex === classIndex) continue;
      for (const s of entry.skillChoices ?? []) set.add(s);
    }
    return set;
  };

  const toggleSkill = (classIndex: string, skill: string, max: number) =>
    update((d) => {
      const entry = d.classes.find((c) => c.classIndex === classIndex);
      if (!entry) return;
      entry.skillChoices ??= [];
      const i = entry.skillChoices.indexOf(skill);
      if (i >= 0) entry.skillChoices.splice(i, 1);
      else if (entry.skillChoices.length < max) entry.skillChoices.push(skill);
    });

  const toggleProf = (classIndex: string, choiceIdx: number, opt: string, max: number) =>
    update((d) => {
      const entry = d.classes.find((c) => c.classIndex === classIndex);
      if (!entry) return;
      entry.profChoices ??= {};
      entry.profChoices[choiceIdx] ??= [];
      const arr = entry.profChoices[choiceIdx];
      const i = arr.indexOf(opt);
      if (i >= 0) arr.splice(i, 1);
      else if (arr.length < max) arr.push(opt);
    });

  const expSlots = expertiseSlots(draft);
  const allProficientSkills = (() => {
    const set = new Set<string>([...fixedRace, ...raceChosen, ...bgSkills]);
    for (const entry of draft.classes) for (const s of entry.skillChoices ?? []) set.add(s);
    return [...set];
  })();

  const toggleExpertise = (skill: string) =>
    update((d) => {
      d.expertiseChoices ??= [];
      const i = d.expertiseChoices.indexOf(skill);
      if (i >= 0) d.expertiseChoices.splice(i, 1);
      else if (d.expertiseChoices.length < expSlots) d.expertiseChoices.push(skill);
    });

  return (
    <>
      <StepIntro
        eyebrow="Step V"
        title="Hone Your Training"
        desc="Pick the skills your class lets you master. Proficiencies already granted by your race or background cannot be chosen twice."
      />

      {(fixedRace.length > 0 || raceChosen.length > 0 || bgSkills.length > 0) && (
        <Block>
          <FieldLabel>Already Proficient</FieldLabel>
          <ChipRow>
            {[...new Set([...fixedRace, ...raceChosen, ...bgSkills])].map((s) => (
              <Pill key={s} $tone="muted">
                {skillMap.get(s)?.name ?? s}
              </Pill>
            ))}
          </ChipRow>
        </Block>
      )}

      {draft.classes.map((entry) => {
        const spec = classSkillChoice(entry.classIndex);
        const otherProfs = classOtherProfChoices(entry.classIndex);
        const cls = classMap.get(entry.classIndex);
        const elsewhere = proficientElsewhere(entry.classIndex);
        if (!spec && otherProfs.length === 0) return null;
        return (
          <Block key={entry.classIndex}>
            <Divider />
            {spec && (
              <>
                <FieldLabel>
                  {cls?.name} Skills{" "}
                  <Counter $done={(entry.skillChoices?.length ?? 0) === spec.choose}>
                    {entry.skillChoices?.length ?? 0}/{spec.choose}
                  </Counter>
                </FieldLabel>
                <ChipRow>
                  {spec.options.map((s) => {
                    const active = entry.skillChoices?.includes(s) ?? false;
                    const lockedElsewhere = elsewhere.has(s);
                    const atMax = !active && (entry.skillChoices?.length ?? 0) >= spec.choose;
                    const locked = lockedElsewhere || atMax;
                    return (
                      <Chip
                        key={s}
                        $active={active}
                        $locked={locked}
                        onClick={() => !locked && toggleSkill(entry.classIndex, s, spec.choose)}
                        title={lockedElsewhere ? "Already proficient" : ""}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <SkillIcon index={s} size={16} />
                          {skillMap.get(s)?.name ?? s}
                        </span>
                      </Chip>
                    );
                  })}
                </ChipRow>
              </>
            )}

            {otherProfs.map((pc) => (
              <Block key={pc.choiceIdx}>
                <FieldLabel>
                  {cls?.name} — {pc.label}{" "}
                  <Counter
                    $done={(entry.profChoices?.[pc.choiceIdx]?.length ?? 0) === pc.choose}
                  >
                    {entry.profChoices?.[pc.choiceIdx]?.length ?? 0}/{pc.choose}
                  </Counter>
                </FieldLabel>
                <ChipRow>
                  {pc.options.map((o) => {
                    const active = entry.profChoices?.[pc.choiceIdx]?.includes(o.index) ?? false;
                    const atMax =
                      !active &&
                      (entry.profChoices?.[pc.choiceIdx]?.length ?? 0) >= pc.choose;
                    return (
                      <Chip
                        key={o.index}
                        $active={active}
                        $locked={atMax}
                        onClick={() =>
                          !atMax && toggleProf(entry.classIndex, pc.choiceIdx, o.index, pc.choose)
                        }
                      >
                        {o.name}
                      </Chip>
                    );
                  })}
                </ChipRow>
              </Block>
            ))}
          </Block>
        );
      })}

      {expSlots > 0 && (
        <Block>
          <Divider />
          <FieldLabel>
            Expertise (double proficiency){" "}
            <Counter $done={(draft.expertiseChoices?.length ?? 0) === expSlots}>
              {draft.expertiseChoices?.length ?? 0}/{expSlots}
            </Counter>
          </FieldLabel>
          <HelpText>Choose proficient skills to double your proficiency bonus.</HelpText>
          <ChipRow>
            {allProficientSkills.map((s) => {
              const active = draft.expertiseChoices?.includes(s) ?? false;
              const atMax = !active && (draft.expertiseChoices?.length ?? 0) >= expSlots;
              return (
                <Chip
                  key={s}
                  $active={active}
                  $locked={atMax}
                  onClick={() => !atMax && toggleExpertise(s)}
                >
                  {skillMap.get(s)?.name ?? s}
                </Chip>
              );
            })}
          </ChipRow>
        </Block>
      )}
    </>
  );
}

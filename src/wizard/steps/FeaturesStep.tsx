import { useEffect } from "react";
import { featureChoiceSpecs, normalizeFeatureChoices } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider } from "@/ui/primitives";
import { FeatureTooltip } from "@/ui/FeatureCard";
import { StepIntro, FieldLabel, HelpText, Block, Chip, ChipRow, Counter } from "../common";

function helpFor(kind: "invocation" | "subfeature" | "benefit"): string {
  switch (kind) {
    case "invocation":
      return "Your Pact Boon (Pact of the Blade, Chain, or Tome) is itself an invocation — pick one. Locked options need a higher Warlock level or a prerequisite invocation; hover to see why.";
    case "benefit":
      return "Optional — this benefit is chosen anew each time you use the feature. Record a preferred choice to show on your sheet; you can change it freely in play.";
    default:
      return "Hover an option for its full description. Locked options require a higher level.";
  }
}

export function FeaturesStep() {
  const { draft, update } = useCharacter();
  const specs = featureChoiceSpecs(draft);

  // Entering the step, drop any picks left stale by a later level/multiclass
  // change (e.g. lowering level past an invocation's prerequisite).
  useEffect(() => {
    update((d) => normalizeFeatureChoices(d));
    // Run once on mount; `update` is stable from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key: string, option: string, choose: number, available: boolean) =>
    update((d) => {
      d.featureChoices ??= {};
      const arr = (d.featureChoices[key] ??= []);
      const i = arr.indexOf(option);
      if (i >= 0) {
        arr.splice(i, 1);
      } else if (available) {
        // A "choose 1" group behaves like a radio: selecting swaps the pick.
        if (choose === 1) d.featureChoices[key] = [option];
        else if (arr.length < choose) arr.push(option);
      }
      normalizeFeatureChoices(d);
    });

  return (
    <>
      <StepIntro
        eyebrow="Step X"
        title="Master Your Talents"
        desc="Choose the invocations, fighting styles, and other feature options your class and subclass grant at this level."
      />

      {specs.map((spec) => {
        const count = spec.selected.length;
        return (
          <Block key={spec.key}>
            <Divider />
            <FieldLabel>
              {spec.className} — {spec.featureName}{" "}
              <Counter $done={spec.optional || count === spec.choose}>
                {spec.optional ? `${count}/${spec.choose} · optional` : `${count}/${spec.choose}`}
              </Counter>
            </FieldLabel>
            <HelpText>{helpFor(spec.kind)}</HelpText>
            <ChipRow>
              {spec.options.map((o) => {
                const active = o.selected;
                const atMax = !active && spec.choose > 1 && count >= spec.choose;
                const locked = !active && (!o.available || atMax);
                return (
                  <FeatureTooltip
                    key={o.index}
                    feature={{
                      name: o.name,
                      source: o.available ? spec.featureName : (o.reason ?? ""),
                      desc: o.desc,
                      activation: o.activation,
                      recharge: o.recharge,
                    }}
                  >
                    <Chip
                      $active={active}
                      $locked={locked}
                      onClick={() => !locked && toggle(spec.key, o.index, spec.choose, o.available)}
                    >
                      {o.name}
                    </Chip>
                  </FeatureTooltip>
                );
              })}
            </ChipRow>
          </Block>
        );
      })}
    </>
  );
}

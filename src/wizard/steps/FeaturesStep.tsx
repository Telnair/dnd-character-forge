import { useEffect } from "react";
import {
  baseOf,
  cantripChoiceOptions,
  featOptionsFromChoice,
  featureChoiceSpecs,
  nextInstanceKey,
  normalizeFeatureChoices,
  type FeatureChoiceSpec,
} from "@/engine";
import { featMap } from "@/data";
import { useCharacter } from "@/store/characterStore";
import { Divider, ScrollArea } from "@/ui/primitives";
import { FeatureTooltip } from "@/ui/FeatureCard";
import { SpellTooltip, slotAccess } from "@/ui/SpellCard";
import { StepIntro, FieldLabel, HelpText, Block, Chip, ChipRow, Counter } from "../common";
import { FeatChoice } from "./FeatChoice";

function helpFor(kind: "invocation" | "subfeature" | "benefit"): string {
  switch (kind) {
    case "invocation":
      return "Your Pact Boon (Pact of the Blade, Chain, or Tome) is itself an invocation — pick one. A Repeatable invocation (Repelling Blast, Agonizing Blast, …) can be taken more than once via “Add another”; each pick chooses a different cantrip. Locked options need a higher Warlock level or a prerequisite invocation; hover to see why.";
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

  // Turn an option on (first instance) or off (all its instances).
  const toggleOption = (key: string, optIndex: string, choose: number, available: boolean) =>
    update((d) => {
      d.featureChoices ??= {};
      const arr = (d.featureChoices[key] ??= []);
      const has = arr.some((s) => baseOf(s) === optIndex);
      if (has) {
        d.featureChoices[key] = arr.filter((s) => baseOf(s) !== optIndex);
      } else if (available) {
        if (choose === 1) d.featureChoices[key] = [optIndex];
        else if (arr.length < choose) arr.push(optIndex);
      }
      normalizeFeatureChoices(d);
    });

  // Add another instance of a Repeatable option (up to the remaining budget).
  const addInstance = (key: string, base: string, choose: number) =>
    update((d) => {
      d.featureChoices ??= {};
      const arr = (d.featureChoices[key] ??= []);
      if (arr.length >= choose) return;
      arr.push(nextInstanceKey(base, arr));
      normalizeFeatureChoices(d);
    });

  const removeInstance = (key: string, inst: string) =>
    update((d) => {
      const arr = d.featureChoices?.[key];
      if (arr) d.featureChoices![key] = arr.filter((s) => s !== inst);
      normalizeFeatureChoices(d); // prunes the instance's orphaned sub-choices
    });

  // A multi-select sub-choice (cantrip pick); radio when choose === 1.
  const toggleSub = (storeKey: string, ci: number, option: string, choose: number) =>
    update((d) => {
      d.featureOptionChoices ??= {};
      const rec = (d.featureOptionChoices[storeKey] ??= {});
      const arr = (rec[ci] ??= []);
      const i = arr.indexOf(option);
      if (i >= 0) arr.splice(i, 1);
      else if (choose === 1) rec[ci] = [option];
      else if (arr.length < choose) arr.push(option);
    });

  // Pick (or clear) the Origin feat a feats-type choice grants; switching feats
  // resets that feat's own nested picks.
  const selectFeat = (inst: string, ci: number, featIndex: string) =>
    update((d) => {
      d.featureOptionChoices ??= {};
      const rec = (d.featureOptionChoices[inst] ??= {});
      const cur = rec[ci]?.[0];
      rec[ci] = cur === featIndex ? [] : [featIndex];
      d.featureOptionChoices[`${inst}::feat`] = {};
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
        const panelOptions = spec.options.filter(
          (o) => o.selected && (o.repeatable || (o.choices?.length ?? 0) > 0)
        );
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
                const instCount = spec.selected.filter((s) => baseOf(s) === o.index).length;
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
                      onClick={() =>
                        !locked && toggleOption(spec.key, o.index, spec.choose, o.available)
                      }
                    >
                      {o.name}
                      {o.repeatable && instCount > 1 ? ` ×${instCount}` : ""}
                    </Chip>
                  </FeatureTooltip>
                );
              })}
            </ChipRow>

            {/* Per-instance sub-choices: which cantrip an invocation improves, or
                which Origin feat Lessons of the First Ones grants. */}
            {panelOptions.map((o) => {
              const instances = spec.selected.filter((s) => baseOf(s) === o.index);
              return (
                <div key={`panel-${o.index}`}>
                  {instances.map((inst, idx) => (
                    <div
                      key={inst}
                      style={{
                        borderLeft: "2px solid rgba(255,255,255,0.12)",
                        paddingLeft: "0.7rem",
                        marginTop: "0.55rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <strong style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                          {o.name}
                          {instances.length > 1 ? ` · ${idx + 1}` : ""}
                        </strong>
                        <button
                          type="button"
                          onClick={() => removeInstance(spec.key, inst)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "rgba(255,255,255,0.5)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          ✕ remove
                        </button>
                      </div>
                      {(o.choices ?? []).map((ch: any, ci: number) =>
                        renderSubChoice(spec, inst, ch, ci)
                      )}
                    </div>
                  ))}
                  {o.repeatable && count < spec.choose && (
                    <Chip
                      style={{ marginTop: "0.5rem" }}
                      onClick={() => addInstance(spec.key, o.index, spec.choose)}
                    >
                      + Add another {o.name}
                    </Chip>
                  )}
                </div>
              );
            })}
          </Block>
        );
      })}
    </>
  );

  // --- sub-choice renderers (close over draft + handlers) -------------------

  // Picks made by *other* instances of the same Repeatable option for this choice
  // index — a Repeatable invocation must choose a different cantrip/feat each time.
  function siblingPicks(spec: FeatureChoiceSpec, inst: string, ci: number): Set<string> {
    const base = baseOf(inst);
    const taken = new Set<string>();
    for (const sib of spec.selected) {
      if (sib === inst || baseOf(sib) !== base) continue;
      for (const p of draft.featureOptionChoices?.[sib]?.[ci] ?? []) taken.add(p);
    }
    return taken;
  }

  function renderSubChoice(spec: FeatureChoiceSpec, inst: string, ch: any, ci: number) {
    if (ch?.type === "feats") return renderFeatChoice(spec, inst, ch, ci);
    return renderCantripChoice(spec, inst, ch, ci);
  }

  function renderCantripChoice(spec: FeatureChoiceSpec, inst: string, ch: any, ci: number) {
    const choose: number = ch?.choose ?? 1;
    const opts = cantripChoiceOptions(draft, spec.classIndex, ch?.spell_source);
    const sel = draft.featureOptionChoices?.[inst]?.[ci] ?? [];
    const taken = siblingPicks(spec, inst, ci);
    return (
      <Block key={ci}>
        <FieldLabel>
          {ch?.desc ?? "Choose a cantrip"}{" "}
          <Counter $done={sel.length >= choose}>
            {sel.length}/{choose}
          </Counter>
        </FieldLabel>
        {opts.length === 0 ? (
          <HelpText>
            Choose your {classMapName(spec.classIndex)} cantrips first — eligible ones will appear here.
          </HelpText>
        ) : (
          <ScrollArea $max="160px">
            <ChipRow>
              {opts.map((c) => {
                const active = sel.includes(c.index);
                // Locked when full, or already taken by another repeat of this invocation.
                const locked =
                  !active && (taken.has(c.index) || (choose > 1 && sel.length >= choose));
                return (
                  <SpellTooltip key={c.index} index={c.index} access={slotAccess(c.index)}>
                    <Chip
                      $active={active}
                      $locked={locked}
                      onClick={() => !locked && toggleSub(inst, ci, c.index, choose)}
                    >
                      {c.name}
                    </Chip>
                  </SpellTooltip>
                );
              })}
            </ChipRow>
          </ScrollArea>
        )}
      </Block>
    );
  }

  function renderFeatChoice(spec: FeatureChoiceSpec, inst: string, ch: any, ci: number) {
    const fo = featOptionsFromChoice(ch);
    const sel = draft.featureOptionChoices?.[inst]?.[ci] ?? [];
    const taken = siblingPicks(spec, inst, ci);
    const chosenFeat = sel[0] ? featMap.get(sel[0]) : undefined;
    const featChoiceDefs: any[] = (chosenFeat as any)?.choices ?? [];
    const nested = draft.featureOptionChoices?.[`${inst}::feat`];
    const classChoiceIdx = featChoiceDefs.findIndex((c) => c?.type === "classes");
    const chosenClass = classChoiceIdx >= 0 ? nested?.[classChoiceIdx]?.[0] : undefined;
    const toggleNested = (ni: number, option: string, choose: number) =>
      update((d) => {
        d.featureOptionChoices ??= {};
        const rec = (d.featureOptionChoices[`${inst}::feat`] ??= {});
        const arr = (rec[ni] ??= []);
        const i = arr.indexOf(option);
        if (i >= 0) arr.splice(i, 1);
        else if (choose === 1) rec[ni] = [option];
        else if (arr.length < choose) arr.push(option);
      });
    return (
      <Block key={ci}>
        <FieldLabel>
          {ch?.desc ?? "Choose a feat"}{" "}
          <Counter $done={!!chosenFeat}>
            {chosenFeat ? 1 : 0}/{fo?.choose ?? 1}
          </Counter>
        </FieldLabel>
        <ScrollArea $max="170px">
          <ChipRow>
            {(fo?.feats ?? []).map((f) => {
              const active = sel[0] === f.index;
              const locked = !active && taken.has(f.index); // taken by another repeat
              return (
                <Chip
                  key={f.index}
                  $active={active}
                  $locked={locked}
                  onClick={() => !locked && selectFeat(inst, ci, f.index)}
                >
                  {f.name}
                </Chip>
              );
            })}
          </ChipRow>
        </ScrollArea>
        {chosenFeat && (
          <div style={{ marginTop: "0.35rem" }}>
            {chosenFeat.desc.map((d, i) => (
              <HelpText key={i}>{d}</HelpText>
            ))}
            {featChoiceDefs.map((c, i) => (
              <FeatChoice
                key={i}
                choice={c}
                idx={i}
                selected={nested?.[i] ?? []}
                onToggle={toggleNested}
                chosenClass={chosenClass}
              />
            ))}
          </div>
        )}
      </Block>
    );
  }
}

/** Display name for a class index, for the "choose your <Class> cantrips" hint. */
function classMapName(classIndex: string): string {
  return classIndex.charAt(0).toUpperCase() + classIndex.slice(1);
}

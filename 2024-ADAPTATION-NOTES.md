# 2024 PHB Adaptation — Notes & Known Approximations

This builder was originally written against the 5e-bits **2014 SRD**. It has been
adapted to run on the **2024 PHB** dataset produced by the sibling `dnd2024`
project. This file records how the data is wired and the places where the
implementation is an approximation rather than a full 2024-rules model — so the
gaps are known and easy to revisit.

## How the data is wired

- The forge imports the 2024 JSON arrays **directly** from `../dnd2024/data/out/*.json`
  and the **types** from `../dnd2024/src/pipeline/schemas/*-2024.ts` (zod-inferred).
  Nothing is copied. See [src/data/index.ts](src/data/index.ts) and
  [src/data/types.ts](src/data/types.ts), wired via the `@2024` alias in
  [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json).
- Reshaping the engine needs happens in-memory at load: per-class `levels` are
  merged from `5e-SRD-Levels.json`; subclass `levels` are built from
  `5e-SRD-Features.json`; species are normalized to the engine's race shape.
- **Build-time dependency:** the sibling `dnd2024` project must be present at
  `../dnd2024`. At runtime the data is bundled, so the app stays offline.
- `skills` and `ability-scores` are **not** emitted by the 2024 pipeline (they're
  identical across editions), so the local `src/data/srd/skills.json` and
  `src/data/srd/ability-scores.json` are kept and used as-is.
- The persisted-store key was bumped to `dnd-character-forge-2024`, so any saved
  2014-era drafts will **not** rehydrate (they'd reference non-existent indexes).

## Species lineage / ancestry choices

Species express an in-species variant choice in two shapes:
- **As subspecies** — Elf, Gnome, Tiefling pick a lineage from the subspecies cards.
- **As a trait `subtrait_options`** — Dragonborn (Draconic Ancestry), Goliath (Giant
  Ancestry), Shifter (Shifting) choose inside a species trait.

Two things were needed:
1. **Data fix (upstream in `dnd2024`):** Elf/Gnome/Tiefling originally carried the
   lineage *both* ways — a subspecies **and** a redundant `subtrait_options` on a
   species-level trait — which made the builder ask for the same pick twice (and
   soft-lock). `validate.ts`'s `stripRedundantLineageChoice` transform drops the
   redundant `subtrait_options` at assembly for any species that has subspecies; a
   regression test in `traits.test.ts` guards it.
2. **Forge handling:** the species step renders `subtrait_options` whose options are
   either `reference` (Dragonborn) **or** `string` (Goliath/Shifter). With the data
   normalized upstream, no forge-side suppression of redundant lineage choosers is
   needed.

## Now modeled from 2024 data

These were previously approximations and have since been resolved.

1. **Spell counts (known/prepared).** Known and prepared limits now come straight
   from the 2024 level data's per-level `spells_known` column in
   [src/engine/spells.ts](src/engine/spells.ts) — the old `level + ability mod`
   prepared formula is gone. This also fixed a live bug: 2024 paladins and rangers
   cast from **level 1**, but a 2014-era `paladin && level < 2 → 0` special-case had
   been suppressing it. The **wizard** is the deliberate exception: its picker still
   chooses the *spellbook* (`6 + 2×(level−1)`), which is the superset you scribe,
   not the smaller prepared count the data carries.

2. **Epic Boon ability increase (+1, max 30).** Every epic boon's "+1 to an ability
   score, to a maximum of 30" was prose only — the `dnd2024` feat extractor had been
   dropping chooseable Ability Score Increases (its grappler worked example modeled
   one without a `choices` entry, which taught it to skip them). The fix was in the
   pipeline, not a post-hoc patch: the feat-extraction prompt was corrected (grappler
   now shows the choice; an epic-boon example was added) and the **88 affected feats
   were re-extracted** so each chooseable increase is a real `abilities` choice,
   honoring its allowed set (e.g. Boon of Combat Prowess → any of six; Boon of
   Irresistible Offense → STR/DEX). `feats.test.ts` guards every epic boon. On the
   forge side, [src/engine/abilities.ts](src/engine/abilities.ts) splits feat
   increases so boon-sourced ones may exceed 20 up to a hard cap of 30, while normal
   advancement (background, ASIs, non-epic feats) still caps at 20.

3. **Weapon Mastery counts scale with level.** `weaponMasteriesForClass` in
   [src/engine/config.ts](src/engine/config.ts) now scales the Fighter 3→4→5→6 (at
   levels 1/4/10/16); the other granting classes stay flat at 2. (Mastery
   *descriptions* are still the static `WEAPON_MASTERY_DESC` map — the dataset
   carries none.)

4. **Feat eligibility at ASIs.** The advancement feat picker
   ([src/wizard/steps/AdvancementStep.tsx](src/wizard/steps/AdvancementStep.tsx))
   now hard-enforces **ability-score** and **other-feat** prerequisites (using the
   character's final scores and the feats already taken from the background + ASIs)
   in addition to the level filter. It offers **general AND origin** feats (plus
   **epic boons** at 19+): in 2024 an ASI may be traded for any feat you qualify
   for, and origin feats have no level prerequisite. Feats already taken (background
   or another slot) are withheld unless `repeatable` (see item 9). **Fighting-style**
   feats (class-feature-granted) and the bare `ability-score-improvement` (the
   toggle) are excluded. `spellcasting` / `proficiency` / free-text gates still
   aren't enforced (they can't be checked from the structured data).

5. **Subclass spells surfaced as always-prepared.** Domain/oath/circle spells on
   `subclass.spells` are now derived (filtered by the subclass level you've reached)
   and shown as a dedicated "Subclass Spells · Always Prepared" section on the sheet
   and PDF. *Caveat:* Circle of the Land's list is a choice of one land type, so it
   over-lists there; every other subclass grants its whole list, so it's exact.

6. **Fixed single-ability feat bonuses.** A feat whose Ability Score Increase is a
   *fixed* ability (Great Weapon Master → +1 STR, Boon of Terror → +1 CHA, … — 12 in
   all) now carries a structured **`ability_bonuses`** field (added to the feat
   schema + extraction prompt; those 12 were re-extracted), distinct from the
   chooseable `choices` form. The forge's [abilities.ts](src/engine/abilities.ts)
   applies both, so these +1s now land on the score — and a boon-sourced fixed bonus
   (Terror) is subject to the same 30 cap as the chooseable boons.

7. **Multiclass proficiencies — data-derived & surfaced.** Per the 2024 rules
   (`class:multiclassing`), a class's multiclass proficiency grants live in each
   class's description, and the dataset carries them structurally as
   `multi_classing.proficiencies`. The forge now reads those directly
   (`multiclassProficiencies` in [src/engine/multiclass.ts](src/engine/multiclass.ts))
   and shows them in the Advancement step — on each non-primary class row and the
   "+ class" buttons' tooltip. The old hand-written `MULTICLASS_PROF_NOTES` constant
   was deleted; it was both unused and wrong in 5 of 12 cases (e.g. it gave Bard/
   Rogue a phantom skill, Druid phantom Medium armor, Warlock phantom Simple weapons,
   and listed Monk grants where 2024 gives none).

8. **Feat grants reach the sheet (proficiencies, Expertise, spells).** Previously a
   feat's *only* effect on the sheet was its ability increase; the skill/tool
   proficiencies, Expertise, and spells it granted were collected in the wizard but
   never derived. `collectFeatGrants` in [src/engine/feats.ts](src/engine/feats.ts)
   now resolves all of them — for the background Origin feat **and** every ASI feat —
   driven by the player's recorded picks:
   The proficiency-vs-Expertise distinction and the spell source are read from
   **structured choice fields** (added to the schema + extraction prompt and
   re-extracted), never parsed from `desc` prose:
   - **Skill/tool proficiencies** (Skilled, Crafter, Musician, Skill Expert, …) fold
     into [proficiency.ts](src/engine/proficiency.ts)'s `proficientSkillSet` /
     `computeOtherProficiencies`.
   - **Expertise** — a `proficiencies` choice carries a `grants` field
     (`proficiency` | `expertise` | `proficiency_or_expertise`; absent = proficiency).
     `expertiseSkillSet` reads it; the `proficiency_or_expertise` feats (Keen Mind,
     Observant) grant Expertise only where the skill is already proficient from
     another source, and plain proficiency otherwise.
   - **Spells** — a `spells` choice carries a structured `spell_source`: `level`
     (exact) or `max_level` (≤), plus optional `classes` / `schools` /
     `from_class_choice` / `ritual_only` / `casting_time`, and `also_spells` (explicit
     extra spell indexes unioned in). The shared
     [FeatChoice](src/wizard/steps/FeatChoice.tsx) component enumerates the pool from
     it — so **every** spell-granting feat presents real, pickable spells: Magic
     Initiate (its chosen class), the school-filtered Touched feats (Fey/Shadow/
     Vampire), Genie Magic (action casting time only), Ritual Caster (level-1 rituals),
     and Boon of Siberys (Sorcerer ≤ level 8 ∪ its 12 Dragonmark-table spells). Picks
     render in a dedicated "Feat Spells" section on the sheet and PDF.

   This also fixed a latent bug: a few feats reuse the `abilities` choice shape to
   pick a *spellcasting ability* (Magic Initiate, Mark of Detection, Boon of Siberys)
   or a *temp-HP ability* (Greater Mark of Hospitality) rather than an increase. A
   structured **`ability_use`** field (`increase` | `spellcasting` | `hit_points`;
   absent = increase) marks these, so [abilities.ts](src/engine/abilities.ts) only
   adds +1 for a genuine increase — no prose is read. (Notably Boon of Siberys carries
   both kinds: its score-increase choice bumps, its spellcasting choice doesn't.)

9. **Repeatable feats are data-driven; no duplicate feats across ASIs.** The feat
   schema carries a structured **`repeatable`** flag (added to the schema +
   extraction prompt; the 4 repeatable feats — Ability Score Improvement, Elemental
   Adept, Magic Initiate, Skilled — were re-extracted to set it). The advancement
   picker ([AdvancementStep.tsx](src/wizard/steps/AdvancementStep.tsx)) now computes
   eligibility **per ASI slot**: a feat already taken (at the background or another
   slot) is withheld, **unless** it's `repeatable`. The old prose-only assumption is
   gone.

## Remaining approximations

1. **Languages from feats.** A few feats grant a language in prose — only ~3 grant a
   concrete one (cult-of-the-dragon-initiate → Draconic, fey-pact → Sylvan, both
   non-core FR feats; echoing-soul → one of choice); the rest
   (boon-of-communication, the Scribing marks, telepathic, …) are comprehension/
   telepathy flavor, not a language proficiency. These aren't folded into the
   character's language list (would need a structured language-grant field like
   `ability_bonuses`). Low value given the count and that most are non-core.

## Removed

- **Alignment.** 2024 de-emphasizes alignment, and it drove nothing mechanical, so
  it was removed entirely — from the `CharacterDraft`/`DerivedSheet` types, the
  DetailsStep editor, and the sheet/PDF output.

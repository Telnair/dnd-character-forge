import { jsPDF } from "jspdf";
import { ABILITY_NAMES, ABILITY_ORDER, spellMap } from "@/data";
import type { SrdSpell } from "@/data/types";
import { formatModifier, type DerivedSheet, type PlayState } from "@/engine";

function sanitize(name: string): string {
  return (name || "character").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
}

type RGB = [number, number, number];

const COLOR = {
  ink: [26, 22, 18] as RGB,
  text: [44, 39, 32] as RGB,
  muted: [122, 112, 96] as RGB,
  accent: [150, 110, 28] as RGB,
  ember: [178, 82, 36] as RGB,
  rule: [206, 197, 178] as RGB,
  boxBg: [246, 242, 233] as RGB,
  boxBorder: [219, 211, 194] as RGB,
  badge: [150, 110, 28] as RGB,
};

const FONT = "helvetica";

interface Ctx {
  pdf: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  usableW: number;
  y: number;
}

function fill(ctx: Ctx, c: RGB): void {
  ctx.pdf.setFillColor(c[0], c[1], c[2]);
}
function stroke(ctx: Ctx, c: RGB): void {
  ctx.pdf.setDrawColor(c[0], c[1], c[2]);
}
function text(ctx: Ctx, c: RGB): void {
  ctx.pdf.setTextColor(c[0], c[1], c[2]);
}
function font(ctx: Ctx, style: "normal" | "bold" | "italic", size: number): void {
  ctx.pdf.setFont(FONT, style);
  ctx.pdf.setFontSize(size);
}

function ensureSpace(ctx: Ctx, h: number): void {
  if (ctx.y + h > ctx.pageH - ctx.margin) {
    ctx.pdf.addPage();
    ctx.y = ctx.margin;
  }
}

/** Vertical rhythm: large gaps between sections, tight gaps within them. */
const SECTION_GAP = 16;
const SLOT_R = 4.2;
const SLOT_STEP = 20;
const ITEM_GAP = 12;
const SKILL_ITEM_GAP = 4;
const SIDEBAR_PAD = 10;

function truncate(ctx: Ctx, str: string, maxW: number): string {
  if (ctx.pdf.getTextWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && ctx.pdf.getTextWidth(s + "...") > maxW) {
    s = s.slice(0, -1);
  }
  return s.trimEnd() + "...";
}

/**
 * Draw a proficiency marker as a vector shape (built-in PDF fonts can't render
 * unicode bullets/diamonds, which is what produced the garbage glyphs).
 */
function drawMarker(
  ctx: Ctx,
  kind: "prof" | "none" | "expertise",
  x: number,
  baselineY: number
): void {
  const cx = x + 3.5;
  const cy = baselineY - 3;
  const r = 2.4;
  if (kind === "expertise") {
    fill(ctx, COLOR.ember);
    ctx.pdf.lines(
      [
        [r, r],
        [-r, r],
        [-r, -r],
        [r, -r],
      ],
      cx,
      cy - r,
      [1, 1],
      "F",
      true
    );
  } else if (kind === "prof") {
    fill(ctx, COLOR.accent);
    ctx.pdf.circle(cx, cy, r, "F");
  } else {
    stroke(ctx, COLOR.muted);
    ctx.pdf.setLineWidth(0.6);
    ctx.pdf.circle(cx, cy, r, "S");
  }
}

/** Uppercase accent title with an underline rule, preceded by a section gap. */
function sectionHeader(ctx: Ctx, title: string, tags?: string[]): void {
  ctx.y += SECTION_GAP;
  ensureSpace(ctx, 40);
  const rowY = ctx.y;
  font(ctx, "bold", 10.5);
  text(ctx, COLOR.accent);
  ctx.pdf.text(title.toUpperCase(), ctx.margin, rowY + 9, { charSpace: 0.8 });

  if (tags && tags.length > 0) {
    font(ctx, "normal", 8);
    text(ctx, COLOR.muted);
    const tagLine = tags.join("   ·   ");
    ctx.pdf.text(truncate(ctx, tagLine, ctx.usableW * 0.55), ctx.margin + ctx.usableW, rowY + 9, {
      align: "right",
    });
  }

  ctx.y = rowY + 14;
  stroke(ctx, COLOR.rule);
  ctx.pdf.setLineWidth(0.6);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.usableW, ctx.y);
  ctx.y += 9;
}

interface BoxData {
  label: string;
  big: string;
  small?: string;
}

function drawBoxes(ctx: Ctx, boxes: BoxData[], perRow: number, h = 44): void {
  const gap = 6;
  const w = (ctx.usableW - gap * (perRow - 1)) / perRow;
  for (let i = 0; i < boxes.length; i += perRow) {
    ensureSpace(ctx, h + gap);
    const rowY = ctx.y;
    const slice = boxes.slice(i, i + perRow);
    slice.forEach((b, j) => {
      const x = ctx.margin + j * (w + gap);
      fill(ctx, COLOR.boxBg);
      stroke(ctx, COLOR.boxBorder);
      ctx.pdf.setLineWidth(0.6);
      ctx.pdf.roundedRect(x, rowY, w, h, 4, 4, "FD");
      const cx = x + w / 2;
      font(ctx, "bold", 7);
      text(ctx, COLOR.ember);
      ctx.pdf.text(b.label.toUpperCase(), cx, rowY + 11, {
        align: "center",
        charSpace: 0.5,
      });
      font(ctx, "bold", b.small ? 17 : 16);
      text(ctx, COLOR.ink);
      ctx.pdf.text(b.big, cx, rowY + (b.small ? 28 : 30), { align: "center" });
      if (b.small) {
        font(ctx, "normal", 8);
        text(ctx, COLOR.muted);
        ctx.pdf.text(b.small, cx, rowY + 38, { align: "center" });
      }
    });
    ctx.y += h + gap;
  }
  ctx.y -= gap;
}

/** Bold lead label followed by wrapped value text. */
function labelledParagraph(ctx: Ctx, label: string, value: string): void {
  font(ctx, "bold", 8.5);
  const labelText = `${label.toUpperCase()}  `;
  const labelW = ctx.pdf.getTextWidth(labelText);
  font(ctx, "normal", 9.5);
  const lines = ctx.pdf.splitTextToSize(value, ctx.usableW - labelW) as string[];
  const lineH = 12;
  ensureSpace(ctx, lineH * lines.length);
  const startY = ctx.y;
  font(ctx, "bold", 8.5);
  text(ctx, COLOR.accent);
  ctx.pdf.text(labelText, ctx.margin, startY + 9);
  font(ctx, "normal", 9.5);
  text(ctx, COLOR.text);
  lines.forEach((ln, idx) => {
    const x = idx === 0 ? ctx.margin + labelW : ctx.margin;
    ctx.pdf.text(ln, x, startY + 9 + idx * lineH);
  });
  ctx.y = startY + lineH * lines.length + 2;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function spellSchoolLine(spell: SrdSpell): string {
  return spell.level === 0
    ? `${spell.school.name} Cantrip`
    : `${ordinal(spell.level)}-level ${spell.school.name}`;
}

/** Feature/trait-style block: bold name, optional italic source, wrapped description. */
function drawDescribedEntry(
  ctx: Ctx,
  name: string,
  source: string | undefined,
  desc: string[],
  maxW = ctx.usableW,
  gapAfter = 4
): void {
  if (!desc.length && !source) return;
  ensureSpace(ctx, 14);
  font(ctx, "bold", 9);
  text(ctx, COLOR.ink);
  ctx.pdf.text(truncate(ctx, name, maxW), ctx.margin, ctx.y + 9);
  ctx.y += 11;
  if (source) {
    font(ctx, "italic", 8);
    text(ctx, COLOR.muted);
    ctx.pdf.text(truncate(ctx, source, maxW), ctx.margin, ctx.y + 8);
    ctx.y += 10;
  }
  if (desc.length > 0) {
    paragraph(ctx, desc.join("\n\n"), 7.5, COLOR.muted, maxW);
  }
  ctx.y += gapAfter;
}

function drawSpellDescriptions(ctx: Ctx, spells: { index: string; name: string }[]): void {
  for (const ref of spells) {
    const spell = spellMap.get(ref.index);
    if (!spell) continue;
    drawDescribedEntry(ctx, spell.name, spellSchoolLine(spell), spell.desc ?? [], ctx.usableW, ITEM_GAP);
  }
}

function paragraph(
  ctx: Ctx,
  value: string,
  size = 9.5,
  color: RGB = COLOR.text,
  maxW = ctx.usableW
): void {
  font(ctx, "normal", size);
  const lines = ctx.pdf.splitTextToSize(value, maxW) as string[];
  const lineH = size + 2.5;
  text(ctx, color);
  lines.forEach((ln) => {
    ensureSpace(ctx, lineH);
    ctx.pdf.text(ln, ctx.margin, ctx.y + size);
    ctx.y += lineH;
  });
}

function subTitle(ctx: Ctx, label: string): void {
  ensureSpace(ctx, 14);
  font(ctx, "bold", 9);
  text(ctx, COLOR.ink);
  ctx.pdf.text(label, ctx.margin, ctx.y + 9);
  ctx.y += 14;
}

/** Spell/feature subgroup label — visually distinct from described items below. */
function groupHeading(ctx: Ctx, title: string): void {
  ctx.y += 10;
  ensureSpace(ctx, 36);
  const rowY = ctx.y;
  fill(ctx, COLOR.boxBg);
  stroke(ctx, COLOR.boxBorder);
  ctx.pdf.setLineWidth(0.6);
  ctx.pdf.roundedRect(ctx.margin, rowY, ctx.usableW, 20, 3, 3, "FD");
  font(ctx, "bold", 8.5);
  text(ctx, COLOR.accent);
  ctx.pdf.text(title.toUpperCase(), ctx.margin + 8, rowY + 13, { charSpace: 0.6 });
  ctx.y = rowY + 20 + 14;
}

function drawHeader(ctx: Ctx, sheet: DerivedSheet): void {
  const badgeW = 84;
  const badgeH = 34;
  const badgeX = ctx.margin + ctx.usableW - badgeW;
  const nameMaxW = ctx.usableW - badgeW - 12;
  const rowTop = ctx.y;

  font(ctx, "bold", 22);
  text(ctx, COLOR.ink);
  const nameBaseline = rowTop + 24;
  ctx.pdf.text(truncate(ctx, sheet.name || "Unnamed Hero", nameMaxW), ctx.margin, nameBaseline);

  const badgeY = rowTop + 4;
  fill(ctx, COLOR.badge);
  ctx.pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, "F");
  font(ctx, "bold", 13);
  text(ctx, [255, 250, 240]);
  ctx.pdf.text(`LEVEL ${sheet.level}`, badgeX + badgeW / 2, badgeY + 22, {
    align: "center",
    charSpace: 0.5,
  });

  const subParts = [
    sheet.classLine,
    sheet.subraceName ?? sheet.raceName,
    sheet.backgroundName,
  ].filter(Boolean);
  font(ctx, "normal", 12);
  text(ctx, COLOR.text);
  ctx.pdf.text(truncate(ctx, subParts.join("  ·  "), ctx.usableW), ctx.margin, rowTop + 44);

  ctx.y = rowTop + 54;
  stroke(ctx, COLOR.accent);
  ctx.pdf.setLineWidth(1.2);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.usableW, ctx.y);
  ctx.y += 6;
}

function slotArray(playState: PlayState | undefined, key: string, total: number): boolean[] {
  const existing = playState?.usedSlots?.[key];
  if (existing && existing.length === total) return existing;
  return Array.from({ length: total }, () => false);
}

function ensureColumns(ctx: Ctx, leftY: number, rightY: number, h: number): { leftY: number; rightY: number } {
  const maxY = Math.max(leftY, rightY);
  if (maxY + h > ctx.pageH - ctx.margin) {
    ctx.pdf.addPage();
    return { leftY: ctx.margin, rightY: ctx.margin };
  }
  return { leftY, rightY };
}

function resourceRowHeight(total: number, maxW: number): number {
  if (total <= 0) return 0;
  const cols = Math.max(1, Math.floor(maxW / SLOT_STEP));
  const rows = Math.ceil(total / cols);
  return 16 + rows * (SLOT_STEP + 4) + ITEM_GAP;
}

function spellSidebarHeight(sheet: DerivedSheet, innerW: number): number {
  const cantripTotal = sheet.knownSpells.reduce((n, ks) => n + ks.cantrips.length, 0);
  let h = SIDEBAR_PAD * 2 + 28;
  if (cantripTotal > 0) h += resourceRowHeight(cantripTotal, innerW);
  for (const s of sheet.spellSlots) {
    if (s.total > 0) h += resourceRowHeight(s.total, innerW);
  }
  if (sheet.pactSlots) h += resourceRowHeight(sheet.pactSlots.count, innerW);
  return h;
}

function drawResourceCirclesAt(
  ctx: Ctx,
  x: number,
  y: number,
  maxW: number,
  label: string,
  total: number,
  used: boolean[]
): number {
  if (total <= 0) return y;
  font(ctx, "bold", 8);
  text(ctx, COLOR.accent);
  ctx.pdf.text(label.toUpperCase(), x, y + 8);
  y += 16;
  let slotX = x;
  const rowH = SLOT_STEP + 4;
  for (let i = 0; i < total; i++) {
    if (slotX + SLOT_STEP > x + maxW) {
      slotX = x;
      y += rowH;
    }
    const cx = slotX + SLOT_R + 2;
    const cy = y + SLOT_R + 2;
    if (used[i]) {
      stroke(ctx, COLOR.muted);
      ctx.pdf.setLineWidth(0.9);
      ctx.pdf.circle(cx, cy, SLOT_R, "S");
    } else {
      fill(ctx, COLOR.accent);
      ctx.pdf.circle(cx, cy, SLOT_R, "F");
    }
    slotX += SLOT_STEP;
  }
  return y + rowH;
}

function drawSpellSidebar(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  sheet: DerivedSheet,
  playState?: PlayState
): number {
  const cantripTotal = sheet.knownSpells.reduce((n, ks) => n + ks.cantrips.length, 0);
  const hasResources =
    cantripTotal > 0 ||
    sheet.spellSlots.some((s) => s.total > 0) ||
    !!sheet.pactSlots;
  if (!hasResources) return y;

  const innerX = x + SIDEBAR_PAD;
  const innerW = w - SIDEBAR_PAD * 2;
  const boxH = spellSidebarHeight(sheet, innerW);
  const boxY = y;

  fill(ctx, COLOR.boxBg);
  stroke(ctx, COLOR.boxBorder);
  ctx.pdf.setLineWidth(0.8);
  ctx.pdf.roundedRect(x, boxY, w, boxH, 5, 5, "FD");

  let cy = boxY + SIDEBAR_PAD;
  font(ctx, "bold", 8.5);
  text(ctx, COLOR.accent);
  ctx.pdf.text("SPELL SLOTS", innerX, cy + 9, { charSpace: 0.6 });
  cy += 18;
  stroke(ctx, COLOR.rule);
  ctx.pdf.setLineWidth(0.6);
  ctx.pdf.line(innerX, cy, innerX + innerW, cy);
  cy += 10;

  cy = drawResourceCirclesAt(
    ctx,
    innerX,
    cy,
    innerW,
    "Cantrip Uses",
    cantripTotal,
    slotArray(playState, "cantrip", cantripTotal)
  );
  if (cantripTotal > 0) cy += ITEM_GAP;

  for (const s of sheet.spellSlots) {
    if (s.total <= 0) continue;
    cy = drawResourceCirclesAt(
      ctx,
      innerX,
      cy,
      innerW,
      `Level ${s.level} Slots`,
      s.total,
      slotArray(playState, String(s.level), s.total)
    );
    cy += ITEM_GAP;
  }

  if (sheet.pactSlots) {
    cy = drawResourceCirclesAt(
      ctx,
      innerX,
      cy,
      innerW,
      `Pact Slots (Lv ${sheet.pactSlots.level})`,
      sheet.pactSlots.count,
      slotArray(playState, "pact", sheet.pactSlots.count)
    );
  }

  return boxY + boxH;
}

function drawSpellcasting(ctx: Ctx, sheet: DerivedSheet): void {
  // A non-caster class can still carry always-prepared subclass spells (e.g. a
  // Psi Warrior fighter's Telekinesis at level 18), so render the section if
  // either is present.
  if (
    sheet.spellcasting.length === 0 &&
    sheet.subclassSpells.length === 0 &&
    sheet.speciesSpells.length === 0 &&
    sheet.featSpells.length === 0
  )
    return;
  sectionHeader(ctx, "Spellcasting");

  for (const sc of sheet.spellcasting) {
    const statLine = `${sc.classIndex.toUpperCase()}  ·  Ability ${sc.ability.toUpperCase()}  ·  Save DC ${sc.saveDc}  ·  Atk ${formatModifier(
      sc.attackBonus
    )}`;
    ensureSpace(ctx, 16);
    font(ctx, "bold", 9.5);
    text(ctx, COLOR.text);
    ctx.pdf.text(truncate(ctx, statLine, ctx.usableW), ctx.margin, ctx.y + 9);
    ctx.y += 18;

    const known = sheet.knownSpells.find((k) => k.classIndex === sc.classIndex);
    if (known) {
      if (known.cantrips.length > 0) {
        groupHeading(ctx, "Cantrips");
        drawSpellDescriptions(ctx, known.cantrips);
      }
      if (known.spells.length > 0) {
        const sorted = [...known.spells].sort(
          (a, b) =>
            (spellMap.get(a.index)?.level ?? 0) - (spellMap.get(b.index)?.level ?? 0)
        );
        groupHeading(ctx, "Spells");
        drawSpellDescriptions(ctx, sorted);
      }
    }
  }

  for (const ss of sheet.subclassSpells) {
    groupHeading(ctx, `${ss.subclassName} · Always Prepared`);
    drawSpellDescriptions(ctx, ss.spells);
  }

  for (const ss of sheet.speciesSpells) {
    const label = [ss.source, ss.traitName, ss.ability.join(" / ")].filter(Boolean).join(" · ");
    groupHeading(ctx, `${label} · Always Prepared`);
    drawSpellDescriptions(ctx, ss.spells);
  }

  for (const fs of sheet.featSpells) {
    if (fs.spells.length > 0) {
      groupHeading(ctx, fs.featName);
      drawSpellDescriptions(ctx, fs.spells);
    }
    for (const note of fs.notes) {
      labelledParagraph(ctx, fs.featName, `${note} (choose on sheet)`);
      ctx.y += 4;
    }
  }
}

function drawFeatures(ctx: Ctx, sheet: DerivedSheet): void {
  if (sheet.features.length === 0) return;
  sectionHeader(ctx, "Features & Traits");
  for (const f of sheet.features) {
    drawDescribedEntry(ctx, f.name, f.source, f.desc, ctx.usableW, ITEM_GAP);
  }
}

const SKILL_ROW_H = 13;

function drawSavingThrowsAndSkills(
  ctx: Ctx,
  sheet: DerivedSheet,
  playState?: PlayState
): void {
  sectionHeader(ctx, "Saving Throws & Skills");
  const colGap = 16;
  const rightW = Math.min(228, ctx.usableW * 0.38);
  const leftW = ctx.usableW - rightW - colGap;
  const leftX = ctx.margin;
  const rightX = ctx.margin + leftW + colGap;
  const dividerX = ctx.margin + leftW + colGap / 2;
  const hasResources =
    sheet.knownSpells.some((ks) => ks.cantrips.length > 0) ||
    sheet.spellSlots.some((s) => s.total > 0) ||
    !!sheet.pactSlots;

  let leftY = ctx.y + 4;
  let rightY = ctx.y + 4;
  const contentStartY = ctx.y + 4;

  if (hasResources) {
    const sidebarH = spellSidebarHeight(sheet, rightW - SIDEBAR_PAD * 2);
    ({ leftY, rightY } = ensureColumns(ctx, leftY, rightY, sidebarH));
    rightY = drawSpellSidebar(ctx, rightX, rightY, rightW, sheet, playState);
  }

  const savedMargin = ctx.margin;
  const savedUsableW = ctx.usableW;

  for (const ab of ABILITY_ORDER) {
    const group = sheet.skills.filter((s) => s.ability === ab);
    const save = sheet.savingThrows.find((st) => st.ability === ab);
    if (!save && group.length === 0) continue;

    const blockH = 14 + group.length * (SKILL_ROW_H + SKILL_ITEM_GAP) + ITEM_GAP;
    ({ leftY, rightY } = ensureColumns(ctx, leftY, rightY, blockH));

    ctx.margin = leftX;
    ctx.usableW = leftW;
    ctx.y = leftY;

    const rowY = ctx.y;
    font(ctx, "bold", 9);
    text(ctx, COLOR.accent);
    const abLabel = ABILITY_NAMES[ab].toUpperCase();
    ctx.pdf.text(abLabel, leftX, rowY + 9);
    if (save) {
      font(ctx, "bold", 8.5);
      text(ctx, save.proficient ? COLOR.ink : COLOR.muted);
      ctx.pdf.text(
        formatModifier(save.modifier),
        leftX + ctx.pdf.getTextWidth(abLabel) + 8,
        rowY + 9
      );
    }
    leftY = rowY + 14;

    for (const s of group) {
      ({ leftY, rightY } = ensureColumns(ctx, leftY, rightY, SKILL_ROW_H + SKILL_ITEM_GAP));
      const baselineY = leftY + 9;
      drawMarker(ctx, s.expertise ? "expertise" : s.proficient ? "prof" : "none", leftX, baselineY);
      const nameX = leftX + 11;
      const mod = formatModifier(s.modifier);
      font(ctx, "bold", 9);
      text(ctx, COLOR.accent);
      const modW = ctx.pdf.getTextWidth(mod) + 8;
      font(ctx, "normal", 9);
      text(ctx, s.proficient || s.expertise ? COLOR.ink : COLOR.muted);
      const name = truncate(ctx, s.name, leftW - 11 - modW);
      ctx.pdf.text(name, nameX, baselineY);
      font(ctx, "bold", 9);
      text(ctx, COLOR.accent);
      ctx.pdf.text(mod, nameX + ctx.pdf.getTextWidth(name) + 6, baselineY);
      leftY += SKILL_ROW_H + SKILL_ITEM_GAP;
    }
    leftY += ITEM_GAP;
  }

  if (hasResources) {
    const sectionEndY = Math.max(leftY, rightY);
    stroke(ctx, COLOR.rule);
    ctx.pdf.setLineWidth(0.6);
    ctx.pdf.line(dividerX, contentStartY - 2, dividerX, sectionEndY);
  }

  ctx.margin = savedMargin;
  ctx.usableW = savedUsableW;
  ctx.y = Math.max(leftY, hasResources ? rightY : leftY);
}

function buildPdf(sheet: DerivedSheet, playState?: PlayState): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 36;
  const ctx: Ctx = {
    pdf,
    pageW: pdf.internal.pageSize.getWidth(),
    pageH: pdf.internal.pageSize.getHeight(),
    margin,
    usableW: pdf.internal.pageSize.getWidth() - margin * 2,
    y: margin,
  };

  drawHeader(ctx, sheet);

  sectionHeader(ctx, "Ability Scores");
  drawBoxes(
    ctx,
    ABILITY_ORDER.map((k) => ({
      label: ABILITY_NAMES[k].slice(0, 3),
      big: formatModifier(sheet.abilityMods[k]),
      small: String(sheet.finalAbilities[k]),
    })),
    6
  );

  const hitDiceTags = Object.entries(sheet.hitDice).map(([die, n]) => `${n}${die} Hit Dice`);
  const combatTags = [...hitDiceTags, ...(sheet.acNote ? [sheet.acNote] : [])];
  sectionHeader(ctx, "Combat", combatTags.length > 0 ? combatTags : undefined);
  const currentHp = playState?.currentHp;
  const hpChanged = currentHp != null && currentHp !== sheet.maxHp;
  drawBoxes(
    ctx,
    [
      { label: "Armor Class", big: String(sheet.armorClass) },
      { label: "Initiative", big: formatModifier(sheet.initiative) },
      {
        label: hpChanged ? "Hit Points" : "Max HP",
        big: hpChanged ? `${currentHp}/${sheet.maxHp}` : String(sheet.maxHp),
      },
      { label: "Speed", big: String(sheet.speed) },
      { label: "Prof. Bonus", big: formatModifier(sheet.proficiencyBonus) },
      { label: "Passive Per.", big: String(sheet.passivePerception) },
    ],
    6,
    40
  );

  drawSavingThrowsAndSkills(ctx, sheet, playState);

  drawSpellcasting(ctx, sheet);

  drawFeatures(ctx, sheet);

  if (sheet.weaponMasteries.length > 0) {
    sectionHeader(ctx, "Weapon Masteries");
    for (const m of sheet.weaponMasteries) {
      ensureSpace(ctx, 14);
      font(ctx, "bold", 9.5);
      text(ctx, COLOR.text);
      ctx.pdf.text(truncate(ctx, `${m.weapon} (${m.mastery})`, ctx.usableW), ctx.margin, ctx.y + 9);
      ctx.y += 12;
      if (m.desc) {
        paragraph(ctx, m.desc, 7.5, COLOR.muted);
        ctx.y += 2;
      }
    }
  }

  if (sheet.equipment.length > 0) {
    sectionHeader(ctx, "Equipment");
    paragraph(
      ctx,
      sheet.equipment
        .map((e) =>
          e.unit ? `${e.quantity} ${e.unit}` : e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name
        )
        .join(", ")
    );
  }

  sectionHeader(ctx, "Proficiencies & Languages");
  let firstProf = true;
  const profSections: [string, string[]][] = [
    ["Armor", sheet.proficiencies.armor],
    ["Weapons", sheet.proficiencies.weapons],
    ["Tools", sheet.proficiencies.tools],
    ["Languages", sheet.languages],
  ];
  for (const [label, items] of profSections) {
    if (items.length === 0) continue;
    if (!firstProf) ctx.y += 14;
    firstProf = false;
    subTitle(ctx, label);
    paragraph(ctx, items.join(", "), 9.5, COLOR.text);
  }

  const character: [string, string | undefined][] = [
    ["Personality", sheet.personality],
    ["Ideals", sheet.ideals],
    ["Bonds", sheet.bonds],
    ["Flaws", sheet.flaws],
    ["Appearance", sheet.appearance],
    ["Backstory", sheet.backstory],
  ];
  if (character.some(([, v]) => v)) {
    sectionHeader(ctx, "Character");
    let firstField = true;
    for (const [label, value] of character) {
      if (!value) continue;
      if (!firstField) ctx.y += 14;
      firstField = false;
      subTitle(ctx, label);
      paragraph(ctx, value, 9.5, COLOR.text);
    }
  }

  // Page numbers
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    font(ctx, "normal", 8);
    text(ctx, COLOR.muted);
    pdf.text(
      `${sheet.name || "Character"}  ·  ${p} / ${total}`,
      ctx.pageW / 2,
      ctx.pageH - 18,
      { align: "center" }
    );
  }

  return pdf;
}

export async function exportPdf(sheet: DerivedSheet, playState?: PlayState): Promise<void> {
  const pdf = buildPdf(sheet, playState);
  pdf.save(`${sanitize(sheet.name)}_character_sheet.pdf`);
}

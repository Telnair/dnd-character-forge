import { jsPDF } from "jspdf";
import { ABILITY_NAMES, ABILITY_ORDER, spellMap, type AbilityKey } from "@/data";
import { formatModifier, type DerivedSheet } from "@/engine";

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
function sectionHeader(ctx: Ctx, title: string): void {
  ctx.y += SECTION_GAP;
  ensureSpace(ctx, 40);
  font(ctx, "bold", 10.5);
  text(ctx, COLOR.accent);
  ctx.pdf.text(title.toUpperCase(), ctx.margin, ctx.y, { charSpace: 0.8 });
  ctx.y += 5;
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

/** Row-major multi-column list. `draw` paints one cell. */
function drawList<T>(
  ctx: Ctx,
  items: T[],
  cols: number,
  lineH: number,
  draw: (item: T, x: number, baselineY: number, colW: number) => void
): void {
  if (items.length === 0) return;
  const colW = ctx.usableW / cols;
  let i = 0;
  while (i < items.length) {
    ensureSpace(ctx, lineH);
    const baselineY = ctx.y + lineH - 4;
    for (let c = 0; c < cols && i < items.length; c++, i++) {
      const x = ctx.margin + c * colW;
      draw(items[i], x, baselineY, colW);
    }
    ctx.y += lineH;
  }
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

function paragraph(ctx: Ctx, value: string, size = 9.5, color: RGB = COLOR.text): void {
  font(ctx, "normal", size);
  const lines = ctx.pdf.splitTextToSize(value, ctx.usableW) as string[];
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

function drawHeader(ctx: Ctx, sheet: DerivedSheet): void {
  const badgeW = 84;
  const badgeH = 34;
  const badgeX = ctx.margin + ctx.usableW - badgeW;

  font(ctx, "bold", 22);
  text(ctx, COLOR.ink);
  const nameMaxW = ctx.usableW - badgeW - 12;
  ctx.pdf.text(truncate(ctx, sheet.name || "Unnamed Hero", nameMaxW), ctx.margin, ctx.y + 20);

  const subParts = [
    sheet.classLine,
    sheet.subraceName ?? sheet.raceName,
    sheet.backgroundName,
  ].filter(Boolean);
  font(ctx, "normal", 10.5);
  text(ctx, COLOR.muted);
  ctx.pdf.text(truncate(ctx, subParts.join("  ·  "), nameMaxW), ctx.margin, ctx.y + 36);

  fill(ctx, COLOR.badge);
  ctx.pdf.roundedRect(badgeX, ctx.y, badgeW, badgeH, 5, 5, "F");
  font(ctx, "bold", 13);
  text(ctx, [255, 250, 240]);
  ctx.pdf.text(`LEVEL ${sheet.level}`, badgeX + badgeW / 2, ctx.y + 22, {
    align: "center",
    charSpace: 0.5,
  });

  ctx.y += 46;
  stroke(ctx, COLOR.accent);
  ctx.pdf.setLineWidth(1.2);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.usableW, ctx.y);
  ctx.y += 6;
}

function drawSpellcasting(ctx: Ctx, sheet: DerivedSheet): void {
  // A non-caster class can still carry always-prepared subclass spells (e.g. a
  // Psi Warrior fighter's Telekinesis at level 18), so render the section if
  // either is present.
  if (
    sheet.spellcasting.length === 0 &&
    sheet.subclassSpells.length === 0 &&
    sheet.featSpells.length === 0
  )
    return;
  sectionHeader(ctx, "Spellcasting");

  for (const sc of sheet.spellcasting) {
    const statLine = `${sc.classIndex.toUpperCase()}  ·  Ability ${sc.ability.toUpperCase()}  ·  Save DC ${sc.saveDc}  ·  Atk ${formatModifier(
      sc.attackBonus
    )}  ·  ${sc.cantripsKnown} cantrips  ·  ${sc.spellsKnownOrPrepared} ${sc.prepStyle.toLowerCase()}`;
    ensureSpace(ctx, 14);
    font(ctx, "bold", 9.5);
    text(ctx, COLOR.text);
    ctx.pdf.text(truncate(ctx, statLine, ctx.usableW), ctx.margin, ctx.y + 9);
    ctx.y += 14;

    const known = sheet.knownSpells.find((k) => k.classIndex === sc.classIndex);
    if (known) {
      if (known.cantrips.length > 0) {
        labelledParagraph(
          ctx,
          "Cantrips",
          known.cantrips.map((c) => c.name).join(", ")
        );
      }
      if (known.spells.length > 0) {
        const sorted = [...known.spells].sort(
          (a, b) =>
            (spellMap.get(a.index)?.level ?? 0) - (spellMap.get(b.index)?.level ?? 0)
        );
        labelledParagraph(ctx, "Spells", sorted.map((s) => s.name).join(", "));
      }
    }
  }

  const slotParts = sheet.spellSlots.map((s) => `L${s.level}: ${s.total}`);
  if (sheet.pactSlots) {
    slotParts.push(`Pact L${sheet.pactSlots.level}: ${sheet.pactSlots.count}`);
  }
  if (slotParts.length > 0) {
    labelledParagraph(ctx, "Slots", slotParts.join("   "));
  }

  for (const ss of sheet.subclassSpells) {
    labelledParagraph(
      ctx,
      `${ss.subclassName} (always prepared)`,
      ss.spells.map((s) => s.name).join(", ")
    );
  }

  for (const fs of sheet.featSpells) {
    const parts = [
      ...fs.spells.map((s) => s.name),
      ...fs.notes.map((n) => `${n} (choose on sheet)`),
    ];
    if (parts.length) labelledParagraph(ctx, fs.featName, parts.join("  ·  "));
  }
}

function buildPdf(sheet: DerivedSheet): jsPDF {
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

  // Abilities
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

  // Combat
  sectionHeader(ctx, "Combat");
  drawBoxes(
    ctx,
    [
      { label: "Armor Class", big: String(sheet.armorClass) },
      { label: "Initiative", big: formatModifier(sheet.initiative) },
      { label: "Max HP", big: String(sheet.maxHp) },
      { label: "Speed", big: String(sheet.speed) },
      { label: "Prof. Bonus", big: formatModifier(sheet.proficiencyBonus) },
      { label: "Passive Per.", big: String(sheet.passivePerception) },
    ],
    6,
    40
  );
  const hitDice = Object.entries(sheet.hitDice)
    .map(([die, n]) => `${n}${die}`)
    .join(", ");
  if (hitDice || sheet.acNote) {
    ctx.y += 8;
    font(ctx, "normal", 8.5);
    text(ctx, COLOR.muted);
    const note = [hitDice ? `Hit Dice: ${hitDice}` : "", sheet.acNote]
      .filter(Boolean)
      .join("   ·   ");
    ensureSpace(ctx, 12);
    ctx.pdf.text(truncate(ctx, note, ctx.usableW), ctx.margin, ctx.y + 8);
    ctx.y += 12;
  }

  // Saving Throws
  sectionHeader(ctx, "Saving Throws");
  drawList(ctx, sheet.savingThrows, 3, 14, (st, x, by, colW) => {
    drawMarker(ctx, st.proficient ? "prof" : "none", x, by);
    font(ctx, "normal", 9.5);
    text(ctx, st.proficient ? COLOR.ink : COLOR.muted);
    ctx.pdf.text(ABILITY_NAMES[st.ability as AbilityKey], x + 11, by);
    font(ctx, "bold", 9.5);
    text(ctx, COLOR.accent);
    ctx.pdf.text(formatModifier(st.modifier), x + colW - 18, by);
  });

  // Skills
  sectionHeader(ctx, "Skills");
  drawList(ctx, sheet.skills, 2, 13.5, (s, x, by, colW) => {
    drawMarker(ctx, s.expertise ? "expertise" : s.proficient ? "prof" : "none", x, by);
    font(ctx, "normal", 9.5);
    text(ctx, s.proficient || s.expertise ? COLOR.ink : COLOR.muted);
    ctx.pdf.text(truncate(ctx, s.name, colW - 38), x + 11, by);
    font(ctx, "bold", 9.5);
    text(ctx, COLOR.accent);
    ctx.pdf.text(formatModifier(s.modifier), x + colW - 22, by);
  });

  drawSpellcasting(ctx, sheet);

  // Features & Traits
  if (sheet.features.length > 0) {
    sectionHeader(ctx, "Features & Traits");
    drawList(ctx, sheet.features, 2, 12.5, (f, x, by, colW) => {
      font(ctx, "bold", 9);
      text(ctx, COLOR.text);
      const nameW = ctx.pdf.getTextWidth(f.name + " ");
      const name = truncate(ctx, f.name, colW - 24);
      ctx.pdf.text(name, x, by);
      if (nameW < colW - 30) {
        font(ctx, "italic", 7.5);
        text(ctx, COLOR.muted);
        ctx.pdf.text(truncate(ctx, f.source, colW - nameW - 24), x + nameW, by);
      }
    });
  }

  // Proficiencies & Languages
  sectionHeader(ctx, "Proficiencies & Languages");
  if (sheet.proficiencies.armor.length > 0)
    labelledParagraph(ctx, "Armor", sheet.proficiencies.armor.join(", "));
  if (sheet.proficiencies.weapons.length > 0)
    labelledParagraph(ctx, "Weapons", sheet.proficiencies.weapons.join(", "));
  if (sheet.proficiencies.tools.length > 0)
    labelledParagraph(ctx, "Tools", sheet.proficiencies.tools.join(", "));
  if (sheet.languages.length > 0)
    labelledParagraph(ctx, "Languages", sheet.languages.join(", "));
  if (sheet.weaponMasteries.length > 0)
    labelledParagraph(
      ctx,
      "Weapon Masteries",
      sheet.weaponMasteries.map((m) => `${m.weapon} (${m.mastery})`).join(", ")
    );

  // Equipment
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

  // Character
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
      if (!firstField) ctx.y += 8;
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

export async function exportPdf(sheet: DerivedSheet): Promise<void> {
  const pdf = buildPdf(sheet);
  pdf.save(`${sanitize(sheet.name)}_character_sheet.pdf`);
}

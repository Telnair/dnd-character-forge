import type { Feature } from "@/data/types";

/** The resource a feature spends on activation (the cost enum from feature-2024). */
export type CostToken = NonNullable<NonNullable<Feature["activation"]>["cost"]>;

/** Display-only superset: a Warlock's "spell slot" is really a Pact Magic slot.
 *  `pact_slot` is not in the data schema — the forge derives it from class context. */
export type SlotKind = CostToken | "pact_slot";

/** Human label for each resource token. */
export const COST_LABEL: Record<SlotKind, string> = {
  bardic_inspiration: "Bardic Inspiration",
  channel_divinity: "Channel Divinity",
  focus_point: "Focus Point",
  psionic_energy: "Psionic Energy Die",
  rage: "Rage",
  sorcery_point: "Sorcery Point",
  spell_slot: "Spell Slot",
  superiority_die: "Superiority Die",
  wild_shape: "Wild Shape",
  pact_slot: "Pact Slot",
};

// Eight rays for the Channel Divinity sun.
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
  const r = (deg * Math.PI) / 180;
  return (
    <line
      key={deg}
      x1={12 + Math.cos(r) * 6.5}
      y1={12 + Math.sin(r) * 6.5}
      x2={12 + Math.cos(r) * 9.5}
      y2={12 + Math.sin(r) * 9.5}
    />
  );
});

/** Monochrome glyph per resource token (inherits `currentColor`). 24×24 viewBox. */
const GLYPHS: Record<SlotKind, React.ReactNode> = {
  // diamond — a spell slot
  spell_slot: <path d="M12 2 21 12 12 22 3 12Z" />,
  // hollow diamond with a core — a Pact Magic slot (a slot, but distinct)
  pact_slot: (
    <>
      <path d="M12 2 21 12 12 22 3 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // four-point sparkle — sorcery point
  sorcery_point: <path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z" />,
  // die face — superiority die
  superiority_die: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  // radiant sun — channel divinity
  channel_divinity: (
    <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none" />
      {RAYS}
    </g>
  ),
  // ring with a core — focus point (ki)
  focus_point: (
    <>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  // Greek psi — psionic energy
  psionic_energy: (
    <text x="12" y="18.5" textAnchor="middle" fontSize="21" fontWeight={700} fill="currentColor">
      Ψ
    </text>
  ),
  // musical note — bardic inspiration
  bardic_inspiration: (
    <>
      <rect x="10.4" y="4" width="1.9" height="12.5" />
      <path d="M10.4 4l6.2-1.5v3.2l-6.2 1.5z" />
      <circle cx="8" cy="17.5" r="3.2" />
    </>
  ),
  // flame — rage
  rage: <path d="M12 2c1.2 4.2 4 5.4 4 9.2a4 4 0 0 1-8 0c0-2 .9-3.1 1.8-3.9C9.6 9.4 10.2 10.6 10.6 11.6 11.2 8.2 11 5 12 2z" />,
  // paw print — wild shape
  wild_shape: (
    <>
      <circle cx="7.3" cy="10" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="16.7" cy="10" r="2" />
      <path d="M12 12c3 0 5.2 1.9 5.2 4.1 0 1.9-2.3 2.9-5.2 2.9s-5.2-1-5.2-2.9C6.8 13.9 9 12 12 12z" />
    </>
  ),
};

/** Small inline glyph for a resource token; inherits text color. */
export function CostIcon({ token, size = 14 }: { token: SlotKind; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flex: "0 0 auto", verticalAlign: "-0.12em" }}
    >
      {GLYPHS[token]}
    </svg>
  );
}

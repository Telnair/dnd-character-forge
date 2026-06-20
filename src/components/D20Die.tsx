import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";

/**
 * A proper faceted d20 (icosahedron viewed face-on) that you can roll.
 * Click / tap it, or grab and fling it, to tumble and land on a random 1–20.
 *
 * The geometry is a flat-on projection of an icosahedron: one central front
 * face (which carries the number) ringed by 9 more visible faces, the whole
 * thing silhouetted as a hexagon. Per-face gold overlays fake a top-light so
 * it reads as a cut gem rather than a flat icon.
 */

// ── Geometry (viewBox 0 0 100 100, centred at 50,50) ────────────────────────
// Inner front-facing triangle — holds the number.
const A = "50,28";
const B = "31,61";
const C = "69,61";
// Outer hexagon silhouette, clockwise from top.
const H0 = "50,4";
const H1 = "89.84,27";
const H2 = "89.84,73";
const H3 = "50,96";
const H4 = "10.16,73";
const H5 = "10.16,27";

const HEX = [H0, H1, H2, H3, H4, H5].join(" ");

// The 9 outer faces, each with a light value (0 = dark, 1 = lit) faking a
// light source from the top.
const FACES: { points: string; light: number }[] = [
  { points: [A, H5, H0].join(" "), light: 0.58 }, // top-left
  { points: [A, H0, H1].join(" "), light: 0.48 }, // top-right
  { points: [A, B, H5].join(" "), light: 0.32 }, // left
  { points: [A, C, H1].join(" "), light: 0.4 }, // right
  { points: [B, H5, H4].join(" "), light: 0.18 }, // lower-left
  { points: [C, H1, H2].join(" "), light: 0.24 }, // lower-right
  { points: [B, H4, H3].join(" "), light: 0.1 }, // bottom-left
  { points: [C, H2, H3].join(" "), light: 0.13 }, // bottom-right
  { points: [B, C, H3].join(" "), light: 0.07 }, // bottom edge
];

const roll1d20 = () => Math.floor(Math.random() * 20) + 1;

// ── Layout ──────────────────────────────────────────────────────────────────
const Float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
`;

const Stage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  user-select: none;
`;

// Outer wrapper owns the idle bob so it never fights the drag/roll transforms.
const FloatWrap = styled.div<{ $rolling: boolean }>`
  position: relative;
  width: 132px;
  height: 132px;
  display: grid;
  place-items: center;
  animation: ${Float} 4.5s ease-in-out infinite;
  animation-play-state: ${({ $rolling }) => ($rolling ? "paused" : "running")};
`;

const Shadow = styled(motion.div)`
  position: absolute;
  bottom: -6px;
  width: 84px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.55),
    transparent 70%
  );
  filter: blur(2px);
  pointer-events: none;
`;

// Drag target — grab and fling to throw.
const Grab = styled(motion.div)`
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
  cursor: grab;
  touch-action: none;
  border-radius: 14px;
  outline: none;
  &:active {
    cursor: grabbing;
  }
  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.goldBright};
  }
`;

const Die = styled(motion.svg)`
  width: 120px;
  height: 120px;
  overflow: visible;
  filter: drop-shadow(0 0 24px rgba(245, 196, 81, 0.45));
`;

const Caption = styled.div<{ $tone: "idle" | "rolling" | "crit" | "fumble" | "result" }>`
  font-family: ${({ theme }) => theme.fonts.display};
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.72rem;
  min-height: 1.1em;
  transition: color 0.2s ease;
  color: ${({ theme, $tone }) =>
    $tone === "crit"
      ? theme.colors.goldBright
      : $tone === "fumble"
      ? theme.colors.danger
      : $tone === "rolling"
      ? theme.colors.emberBright
      : theme.colors.textFaint};
  text-shadow: ${({ $tone }) =>
    $tone === "crit" ? "0 0 18px rgba(245, 196, 81, 0.7)" : "none"};
`;

export function D20Die() {
  const reduceMotion = useReducedMotion();
  const dieControls = useAnimationControls();
  const shadowControls = useAnimationControls();

  const [display, setDisplay] = useState(20);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const flickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (flickerRef.current) clearInterval(flickerRef.current);
  }, []);

  const roll = useCallback(
    async (power = 0) => {
      if (rolling) return;
      setRolling(true);
      setResult(null);

      // Reduced-motion: skip the tumble, just settle on a value.
      if (reduceMotion) {
        const final = roll1d20();
        setDisplay(final);
        setResult(final);
        setRolling(false);
        return;
      }

      // Rapidly cycle the shown number while it's airborne.
      flickerRef.current = setInterval(() => setDisplay(roll1d20()), 70);

      const turns = 2 + Math.floor(Math.random() * 3) + Math.min(power, 3);
      const dir = Math.random() > 0.5 ? 1 : -1;
      const duration = 0.85 + Math.min(power, 3) * 0.12;

      shadowControls.start({
        scale: [1, 0.55, 1.05, 1],
        opacity: [0.55, 0.2, 0.6, 0.55],
        transition: { duration, ease: [0.22, 1, 0.36, 1] },
      });

      await dieControls.start({
        rotate: dir * 360 * turns,
        scale: [1, 1.18, 0.94, 1.04, 1],
        y: [0, -30, 4, -6, 0],
        transition: { duration, ease: [0.22, 1, 0.36, 1] },
      });

      if (flickerRef.current) clearInterval(flickerRef.current);
      const final = roll1d20();
      setDisplay(final);
      setResult(final);
      setRolling(false);
      // Multiple of 360 → identical orientation, so resetting is seamless and
      // keeps the rotation value from growing without bound.
      dieControls.set({ rotate: 0 });

      if (final === 20 || final === 1) {
        dieControls.start({
          scale: final === 20 ? [1, 1.22, 1] : [1, 0.9, 1.05, 1],
          transition: { duration: 0.5, ease: "easeOut" },
        });
      }
    },
    [rolling, reduceMotion, dieControls, shadowControls],
  );

  const onDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      const speed = Math.hypot(info.velocity.x, info.velocity.y);
      roll(Math.round(speed / 700));
    },
    [roll],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        roll();
      }
    },
    [roll],
  );

  const numberColor = "#241a12";
  const tone: "idle" | "rolling" | "crit" | "fumble" | "result" = rolling
    ? "rolling"
    : result === 20
    ? "crit"
    : result === 1
    ? "fumble"
    : result != null
    ? "result"
    : "idle";

  const caption =
    tone === "rolling"
      ? "Rolling…"
      : tone === "crit"
      ? "Natural 20 — Critical!"
      : tone === "fumble"
      ? "Natural 1 — Fumble"
      : tone === "result"
      ? `You rolled ${result}`
      : "Click or fling to roll";

  return (
    <Stage>
      <FloatWrap $rolling={rolling}>
        <Shadow animate={shadowControls} />
        <Grab
          role="button"
          tabIndex={0}
          aria-label={`d20 die showing ${display}. Activate to roll.`}
          onKeyDown={onKeyDown}
          onTap={() => roll()}
          drag={!reduceMotion}
          dragSnapToOrigin
          dragElastic={0.55}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
        >
          <Die animate={dieControls} viewBox="0 0 100 100" aria-hidden>
            <defs>
              <linearGradient id="d20edge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffe08a" />
                <stop offset="1" stopColor="#e8642a" />
              </linearGradient>
              <linearGradient id="d20face" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0" stopColor="#ffe9a8" />
                <stop offset="0.55" stopColor="#f5c451" />
                <stop offset="1" stopColor="#e8642a" />
              </linearGradient>
              <radialGradient id="d20glint" cx="0.35" cy="0.25" r="0.8">
                <stop offset="0" stopColor="#fff4d0" stopOpacity="0.9" />
                <stop offset="0.5" stopColor="#fff4d0" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Dark gem body */}
            <polygon points={HEX} fill="#15100c" />

            {/* Outer faces — dark base + top-lit gold overlay */}
            {FACES.map((f, i) => (
              <polygon
                key={i}
                points={f.points}
                fill="url(#d20edge)"
                opacity={f.light}
              />
            ))}

            {/* Faceted edges */}
            {FACES.map((f, i) => (
              <polygon
                key={`e${i}`}
                points={f.points}
                fill="none"
                stroke="url(#d20edge)"
                strokeWidth="0.7"
                strokeOpacity="0.55"
                strokeLinejoin="round"
              />
            ))}

            {/* Front face carries the number */}
            <polygon
              points={`${A} ${B} ${C}`}
              fill="url(#d20face)"
              stroke="url(#d20edge)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <polygon points={`${A} ${B} ${C}`} fill="url(#d20glint)" />

            {/* Crisp outer silhouette */}
            <polygon
              points={HEX}
              fill="none"
              stroke="url(#d20edge)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />

            <text
              x="50"
              y="52.5"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="'Cinzel', Georgia, serif"
              fontWeight={800}
              fontSize={display >= 10 ? 16 : 21}
              fill={numberColor}
            >
              {display}
            </text>
          </Die>
        </Grab>
      </FloatWrap>
      <Caption $tone={tone} aria-live="polite">
        {caption}
      </Caption>
    </Stage>
  );
}

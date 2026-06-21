import { useState } from "react";
import styled from "styled-components";

const Wrap = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: 0 0 auto;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(
    circle at 32% 28%,
    rgba(245, 196, 81, 0.22),
    rgba(28, 22, 18, 0.98) 62%,
    rgba(12, 10, 9, 1)
  );
  border: 1.5px solid ${({ theme }) => theme.colors.borderStrong};
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
`;

/** Black-backed PNG heraldics: screen blend drops the matte; centered via translate + scale. */
const Img = styled.img<{ $size: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 59.4px;
  height: ${({ $size }) => $size * 0.9}px;
  transform: translate(-50%, -50%) scale(1.14);
  transform-origin: center center;
  object-fit: contain;
  object-position: center center;
  mix-blend-mode: screen;
  pointer-events: none;
  display: block;
`;

const Fallback = styled.div<{ $size: number }>`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-weight: 800;
  font-size: ${({ $size }) => $size * 0.42}px;
  color: ${({ theme }) => theme.colors.goldBright};
  text-shadow: 0 0 12px rgba(245, 196, 81, 0.5);
`;

export function ClassIcon({
  index,
  name,
  size = 56,
  kind = "classes",
}: {
  index: string;
  name: string;
  size?: number;
  kind?: "classes" | "subclasses" | "races";
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Wrap $size={size}>
      {failed ? (
        <Fallback $size={size}>{name.charAt(0)}</Fallback>
      ) : (
        <Img
          $size={size}
          src={`/icons/${kind}/${index}.png`}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </Wrap>
  );
}

import { useState } from "react";
import styled from "styled-components";

const Wrap = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: 0 0 auto;
  position: relative;
  display: grid;
  place-items: center;
`;

const Img = styled.img<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
`;

const Fallback = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-weight: 800;
  font-size: ${({ $size }) => $size * 0.42}px;
  color: ${({ theme }) => theme.colors.goldBright};
  background: radial-gradient(circle at 30% 25%, rgba(245, 196, 81, 0.25), rgba(20, 16, 13, 0.9));
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
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

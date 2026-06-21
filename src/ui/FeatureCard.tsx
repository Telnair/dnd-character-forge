import type { ReactNode } from "react";
import styled from "styled-components";
import { Tooltip } from "./Tooltip";

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem 0.8rem;
  min-width: 240px;
  max-width: 340px;
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.18rem;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const SubLine = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: -0.1rem;
`;

const Desc = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textDim};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1.05rem;
  line-height: 1.5;
  white-space: pre-wrap;
`;

export const InfoButton = styled.button`
  flex: 0 0 auto;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.goldBright};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.72rem;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  &:hover {
    background: rgba(245, 196, 81, 0.14);
  }
`;

/** Shape shared by class features, species/background traits, and feats on the sheet. */
export interface FeatureLike {
  name: string;
  source: string;
  desc: string[];
}

/**
 * Structured readout for a feature/trait: name, its source (class+level,
 * species, background…), and the descriptive paragraphs. The trait analogue of
 * {@link SpellCard}. For a hover trigger use {@link FeatureTooltip}.
 */
export function FeatureCard({ feature }: { feature: FeatureLike }) {
  return (
    <Card>
      <div>
        <Name>{feature.name}</Name>
        {feature.source && <SubLine>{feature.source}</SubLine>}
      </div>
      {feature.desc.length > 0 && <Desc>{feature.desc.join("\n\n")}</Desc>}
    </Card>
  );
}

/**
 * Wraps `children` in a tooltip showing the {@link FeatureCard}.
 * If the feature has no description, the children render without a tooltip
 * (nothing useful to surface), mirroring {@link SpellTooltip}.
 */
export function FeatureTooltip({
  feature,
  block,
  trigger = "hover",
  children,
}: {
  feature: FeatureLike;
  block?: boolean;
  trigger?: "hover" | "click";
  children: ReactNode;
}) {
  if (!feature.desc?.length && !feature.source) return <>{children}</>;
  return (
    <Tooltip content={<FeatureCard feature={feature} />} block={block} trigger={trigger}>
      {children}
    </Tooltip>
  );
}

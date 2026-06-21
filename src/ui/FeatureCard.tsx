import type { ReactNode } from "react";
import styled from "styled-components";
import type { Feature } from "@/data/types";
import { Tooltip } from "./Tooltip";
import { CostIcon, COST_LABEL, type CostToken } from "./CostIcon";

type Activation = NonNullable<Feature["activation"]>;
type Recharge = NonNullable<Feature["recharge"]>;

export const ACTION_LABEL: Record<Activation["action_type"], string> = {
  action: "Action",
  bonus_action: "Bonus Action",
  reaction: "Reaction",
  free_action: "Free Action",
  special: "Special",
};

export const RECHARGE_LABEL: Record<Recharge["condition"], string> = {
  short_rest: "Short Rest",
  long_rest: "Long Rest",
  short_or_long_rest: "Short/Long Rest",
  dawn: "Dawn",
  turn: "Turn",
};

export { COST_LABEL };

type Pill = { key: string; tone: "action" | "cost" | "recharge"; text: string; icon?: CostToken };

/** Activation / cost / recharge readout pills for a feature, in display order. */
function metaPills(feature: FeatureLike): Pill[] {
  const pills: Pill[] = [];
  const a = feature.activation;
  if (a) {
    pills.push({ key: "act", tone: "action", text: ACTION_LABEL[a.action_type] });
    if (a.cost) pills.push({ key: "cost", tone: "cost", text: COST_LABEL[a.cost], icon: a.cost });
  }
  const r = feature.recharge;
  if (r) {
    const window = RECHARGE_LABEL[r.condition];
    const text = r.uses != null ? `${r.uses} / ${window}` : window;
    pills.push({ key: "rch", tone: "recharge", text: `↻ ${text}` });
  }
  return pills;
}

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

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`;

const MetaPill = styled.span<{ $tone: "action" | "cost" | "recharge" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  padding: 0.06rem 0.45rem;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme, $tone }) =>
    $tone === "action" ? theme.colors.goldBright : theme.colors.textDim};
  background: ${({ $tone }) =>
    $tone === "action" ? "rgba(245, 196, 81, 0.12)" : "rgba(0, 0, 0, 0.28)"};
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
  /** How the feature is activated (action type + optional resource cost); absent for passive features. */
  activation?: Feature["activation"];
  /** When the feature's uses reset; absent for unlimited-use features. */
  recharge?: Feature["recharge"];
}

/**
 * Structured readout for a feature/trait: name, its source (class+level,
 * species, background…), and the descriptive paragraphs. The trait analogue of
 * {@link SpellCard}. For a hover trigger use {@link FeatureTooltip}.
 */
export function FeatureCard({ feature }: { feature: FeatureLike }) {
  const pills = metaPills(feature);
  return (
    <Card>
      <div>
        <Name>{feature.name}</Name>
        {feature.source && <SubLine>{feature.source}</SubLine>}
      </div>
      {pills.length > 0 && (
        <MetaRow>
          {pills.map((p) => (
            <MetaPill key={p.key} $tone={p.tone}>
              {p.icon && <CostIcon token={p.icon} size={12} />}
              {p.text}
            </MetaPill>
          ))}
        </MetaRow>
      )}
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
  if (!feature.desc?.length && !feature.source && !feature.activation && !feature.recharge)
    return <>{children}</>;
  return (
    <Tooltip content={<FeatureCard feature={feature} />} block={block} trigger={trigger}>
      {children}
    </Tooltip>
  );
}

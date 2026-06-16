import { useRef, useState } from "react";
import styled from "styled-components";
import { useCharacter } from "@/store/characterStore";
import { CharacterSheet } from "@/sheet/CharacterSheet";
import { exportPdf } from "@/export/exporters";
import { exportCharacterJson, readCharacterFile } from "@/export/characterIo";
import { GhostButton, PrimaryButton, Pill } from "@/ui/primitives";
import { StepIntro, Block } from "../common";

const Toolbar = styled.div`
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.4rem;
`;

const Warn = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.danger}66;
  background: rgba(229, 72, 77, 0.1);
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.8rem 1rem;
  font-family: ${({ theme }) => theme.fonts.heading};
`;

export function ReviewStep() {
  const { activeSteps, stepIssues, sheet, reset, draft, loadDraft } = useCharacter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const issues = activeSteps()
    .filter((s) => s.id !== "review")
    .flatMap((s) => stepIssues(s.id).map((m) => ({ step: s.title, m })));

  const derived = sheet();

  const doExport = async () => {
    setBusy(true);
    try {
      await exportPdf(derived);
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doExportJson = () => exportCharacterJson(draft, derived.name);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const imported = await readCharacterFile(file);
      loadDraft(imported);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not import that file.");
    }
  };

  return (
    <>
      <StepIntro
        eyebrow="The Legend Begins"
        title="Your Character Sheet"
        desc="Behold your finished hero. Download the sheet as a PDF to bring to your table."
      />

      <Toolbar>
        <PrimaryButton onClick={doExport} disabled={busy} whileTap={{ scale: 0.97 }}>
          {busy ? "Preparing..." : "Download PDF"}
        </PrimaryButton>
        <GhostButton onClick={doExportJson} whileTap={{ scale: 0.97 }}>
          Export JSON
        </GhostButton>
        <GhostButton onClick={() => fileRef.current?.click()} whileTap={{ scale: 0.97 }}>
          Import JSON
        </GhostButton>
        <GhostButton onClick={reset} whileTap={{ scale: 0.97 }}>
          Start Over
        </GhostButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: "none" }}
        />
      </Toolbar>

      {issues.length > 0 && (
        <Warn>
          <strong>Some choices are still incomplete:</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
            {issues.map((i, idx) => (
              <Pill key={idx} $tone="ember">
                {i.step}: {i.m}
              </Pill>
            ))}
          </div>
        </Warn>
      )}

      <Block>
        <CharacterSheet ref={sheetRef} sheet={derived} />
      </Block>
    </>
  );
}

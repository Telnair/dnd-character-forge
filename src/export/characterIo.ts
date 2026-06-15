import type { CharacterDraft } from "@/engine";
import { createDefaultDraft } from "@/store/defaultDraft";

const FILE_APP = "dnd-character-forge";
const FILE_KIND = "character-draft";
const FILE_VERSION = 1;

interface CharacterFile {
  app: string;
  kind: string;
  version: number;
  draft: CharacterDraft;
}

function sanitize(name: string): string {
  return (name || "character").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
}

/** Serialize the editable draft to a JSON file and trigger a download. */
export function exportCharacterJson(draft: CharacterDraft, name: string): void {
  const payload: CharacterFile = {
    app: FILE_APP,
    kind: FILE_KIND,
    version: FILE_VERSION,
    draft,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${sanitize(name)}_character.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse and normalize a character draft from raw file text. Accepts either the
 * wrapped export format or a bare draft object. Missing fields fall back to
 * defaults so partially-built characters import cleanly. Throws on invalid JSON
 * or an unrecognized shape.
 */
export function parseCharacterJson(text: string): CharacterDraft {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("Unrecognized character file.");
  }

  const obj = data as Record<string, unknown>;
  const raw =
    "draft" in obj && typeof obj.draft === "object" && obj.draft !== null
      ? (obj.draft as Record<string, unknown>)
      : obj;

  if (!Array.isArray(raw.classes) || typeof raw.baseAbilities !== "object") {
    throw new Error("This doesn't look like a Character Forge file.");
  }

  // Merge onto a fresh default so any absent fields are well-formed.
  const draft: CharacterDraft = {
    ...createDefaultDraft(),
    ...(raw as Partial<CharacterDraft>),
  };

  return draft;
}

/** Read a File (from an <input type="file">) and parse it into a draft. */
export async function readCharacterFile(file: File): Promise<CharacterDraft> {
  const text = await file.text();
  return parseCharacterJson(text);
}

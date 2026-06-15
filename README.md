# D&D Character Forge

A fast, offline-friendly **Dungeons & Dragons 5e character builder**. Walk through a guided, step-by-step wizard to create a character from scratch — pick a race, class, subclass, abilities, skills, background, equipment, and spells — then review the finished sheet and export it to **PDF, PNG, or JSON**.

Built with **React + TypeScript + Vite**, styled with `styled-components`, animated with `framer-motion`, and powered by a locally-bundled snapshot of the SRD (System Reference Document) data so it works fully offline.

---

## Features

- **Guided character wizard** — race, class, subclass, ability scores, skills, background, equipment, spells, details, and level advancement.
- **Multiclass support** — combine multiple classes with correct proficiency and spell-slot derivation.
- **Rules engine** — derives ability modifiers, proficiency bonus, hit points, armor class, and spellcasting from your choices.
- **Offline SRD data** — all reference data is bundled under `src/data/srd/`, no network needed at runtime.
- **Export anywhere** — save your character as a printable PDF, a shareable PNG, or a re-importable JSON file.
- **Polished UI** — themed fantasy styling with an animated ember background.

---

## Tech Stack

| Area        | Tooling                                  |
| ----------- | ---------------------------------------- |
| Framework   | React 18 + TypeScript                    |
| Build tool  | Vite 5                                    |
| Runtime/PM  | [Bun](https://bun.sh)                    |
| Styling     | styled-components                         |
| Animation   | framer-motion                            |
| Export      | jspdf, html-to-image                     |
| State       | zustand                                  |

---

## Prerequisites

- **[Bun](https://bun.sh) v1.0+** (used as both the package manager and the script runner).

  Install it with:

```bash
curl -fsSL https://bun.sh/install | bash
```

  Verify the installation:

```bash
bun --version
```

> Prefer npm/pnpm/yarn? They work too — replace `bun install` with your package manager's install command and `bun run <script>` with `npm run <script>`. Note that the `fetch-srd` script requires Bun specifically.

---

## Run It Locally — Step by Step

1. **Clone the repository**

```bash
git clone https://github.com/Telnair/dnd-character-forge.git
cd dnd-character-forge
```

2. **Install dependencies**

```bash
bun install
```

3. **Start the development server**

```bash
bun run dev
```

4. **Open the app**

   Visit **http://localhost:5173** in your browser. Vite hot-reloads on save, so any changes appear instantly.

That's it — you're ready to forge characters. 🎲

---

## Available Scripts

| Command               | What it does                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `bun run dev`         | Start the Vite dev server at `http://localhost:5173`.                  |
| `bun run build`       | Type-check (`tsc -b`) and build a production bundle into `dist/`.       |
| `bun run preview`     | Serve the production build locally to verify it before deploying.       |
| `bun run fetch-srd`   | Re-crawl the open [dnd5eapi](https://www.dnd5eapi.co) and regenerate the local SRD snapshot in `src/data/srd/`. |

### Build for production

```bash
bun run build
bun run preview
```

The optimized static site is emitted to the `dist/` directory and can be deployed to any static host (Netlify, Vercel, GitHub Pages, etc.).

### Refresh the SRD data (optional)

The app ships with a pre-generated SRD snapshot, so you normally don't need this. To regenerate it from the source API:

```bash
bun run fetch-srd
```

---

## Project Structure

```
dnd-character-forge/
├── public/              # Static assets (icons, d20 favicon)
├── scripts/
│   └── fetch-srd.ts     # Crawls dnd5eapi and writes the local SRD snapshot
├── src/
│   ├── assets/          # Icon components and color helpers
│   ├── components/      # Shared UI (ember background, error boundary)
│   ├── data/            # SRD loaders + bundled JSON under data/srd/
│   ├── engine/          # Rules engine: derive, abilities, spells, multiclass…
│   ├── export/          # PDF / PNG / JSON exporters
│   ├── sheet/           # Final character sheet view
│   ├── store/           # zustand state for the draft character
│   ├── theme/           # styled-components theme + global styles
│   ├── ui/              # UI primitives
│   ├── wizard/          # Step-by-step character creation flow
│   ├── App.tsx          # Root: shows Landing or the wizard
│   └── main.tsx         # App entry point
├── index.html
├── vite.config.ts       # Vite config (port 5173, "@" → src alias)
└── package.json
```

---

## License

See [LICENSE](./LICENSE).

> Game content uses the D&D 5e SRD published under the Open Gaming License. *Dungeons & Dragons* is a trademark of Wizards of the Coast. This project is an unofficial, fan-made tool and is not affiliated with or endorsed by Wizards of the Coast.

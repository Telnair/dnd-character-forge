/**
 * Crawl the open dnd5eapi (2014 SRD) and write a normalized local snapshot
 * to src/data/srd/*.json so the app runs fully offline.
 *
 * Run with: bun run scripts/fetch-srd.ts
 */
import { mkdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://www.dnd5eapi.co";
const API = `${BASE}/api/2014`;
const OUT_DIR = resolve(import.meta.dir, "../src/data/srd");

const CONCURRENCY = 16;

async function getJson(url: string): Promise<any> {
  const full = url.startsWith("http") ? url : `${BASE}${url}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(full, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${full}`);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

async function mapPool<T, R>(
  items: T[],
  fn: (item: T, i: number) => Promise<R>,
  concurrency = CONCURRENCY
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/** Fetch a collection list, then fetch every item's detail. Returns array of details. */
async function fetchCollection(endpoint: string): Promise<any[]> {
  const list = await getJson(`${API}/${endpoint}`);
  const refs: { url: string }[] = list.results ?? [];
  process.stdout.write(`  ${endpoint}: ${refs.length} items`);
  const details = await mapPool(refs, (ref) => getJson(ref.url));
  process.stdout.write(" ...done\n");
  return details;
}

function writeJson(name: string, data: unknown) {
  const path = resolve(OUT_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 0));
  console.log(`  -> wrote ${name}.json`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("Fetching SRD snapshot from dnd5eapi (2014)...");

  // Classes with full level progression resolved inline.
  console.log("Classes + levels...");
  const classList = await getJson(`${API}/classes`);
  const classes = await mapPool(classList.results, async (ref: any) => {
    const detail = await getJson(ref.url);
    const levels = await getJson(`${ref.url}/levels`);
    let spellsList: any = null;
    if (detail.spellcasting) {
      try {
        spellsList = await getJson(`${ref.url}/spells`);
      } catch {
        spellsList = null;
      }
    }
    return {
      ...detail,
      levels,
      spellRefs: spellsList ? spellsList.results : [],
    };
  });
  writeJson("classes", classes);

  // Subclasses with their level features resolved inline.
  console.log("Subclasses + levels...");
  const subclassList = await getJson(`${API}/subclasses`);
  const subclasses = await mapPool(subclassList.results, async (ref: any) => {
    const detail = await getJson(ref.url);
    let levels: any = [];
    try {
      levels = await getJson(`${ref.url}/levels`);
    } catch {
      levels = [];
    }
    return { ...detail, levels };
  });
  writeJson("subclasses", subclasses);

  console.log("Simple collections...");
  const [
    races,
    subraces,
    spells,
    feats,
    backgrounds,
    skills,
    abilityScores,
    proficiencies,
    features,
    languages,
    equipment,
    alignments,
    traits,
    weaponProperties,
    damageTypes,
    magicSchools,
    conditions,
  ] = await Promise.all([
    fetchCollection("races"),
    fetchCollection("subraces"),
    fetchCollection("spells"),
    fetchCollection("feats"),
    fetchCollection("backgrounds"),
    fetchCollection("skills"),
    fetchCollection("ability-scores"),
    fetchCollection("proficiencies"),
    fetchCollection("features"),
    fetchCollection("languages"),
    fetchCollection("equipment"),
    fetchCollection("alignments"),
    fetchCollection("traits"),
    fetchCollection("weapon-properties"),
    fetchCollection("damage-types"),
    fetchCollection("magic-schools"),
    fetchCollection("conditions"),
  ]);

  writeJson("races", races);
  writeJson("subraces", subraces);
  writeJson("spells", spells);
  writeJson("feats", feats);
  writeJson("backgrounds", backgrounds);
  writeJson("skills", skills);
  writeJson("ability-scores", abilityScores);
  writeJson("proficiencies", proficiencies);
  writeJson("features", features);
  writeJson("languages", languages);
  writeJson("equipment", equipment);
  writeJson("alignments", alignments);
  writeJson("traits", traits);
  writeJson("weapon-properties", weaponProperties);
  writeJson("damage-types", damageTypes);
  writeJson("magic-schools", magicSchools);
  writeJson("conditions", conditions);

  console.log("\nSRD snapshot complete.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

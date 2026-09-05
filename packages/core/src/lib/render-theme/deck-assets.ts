/**
 * Deck asset library: built-in icons + illustrations for AI-generated decks.
 *
 * The manifest lives at /public/deck-assets/manifest.json so SVG files are
 * publicly servable as static assets. We import it as a build-time JSON
 * module — works in node, edge, and browser runtimes without fs.
 *
 * Usage:
 *   - AI emits `![icon:rocket](_)` or `![asset:abstract-grid](_)` in markdown.
 *   - deck-serialize.ts rewrites these to the real /deck-assets/... paths.
 *   - If id is unknown, the original markdown is left intact (graceful).
 */
import manifestJson from "../../../public/deck-assets/manifest.json";

export type AssetEntry = {
  id: string;
  path: string;
  tags: string[];
  tone?: string[];
  ratio?: string;
};

export type Manifest = {
  version: string;
  icons: AssetEntry[];
  illustrations: AssetEntry[];
};

export const ASSETS: Manifest = manifestJson as Manifest;

const ICON_INDEX: ReadonlyMap<string, AssetEntry> = new Map(
  ASSETS.icons.map((a) => [a.id, a])
);

const ILLUSTRATION_INDEX: ReadonlyMap<string, AssetEntry> = new Map(
  ASSETS.illustrations.map((a) => [a.id, a])
);

export function findIcon(id: string): AssetEntry | undefined {
  return ICON_INDEX.get(id);
}

export function findIllustration(id: string): AssetEntry | undefined {
  return ILLUSTRATION_INDEX.get(id);
}

/** All icon ids — useful for prompts so AI knows what's available. */
export function listIconIds(): string[] {
  return ASSETS.icons.map((a) => a.id);
}

/** All illustration ids — useful for prompts. */
export function listIllustrationIds(): string[] {
  return ASSETS.illustrations.map((a) => a.id);
}

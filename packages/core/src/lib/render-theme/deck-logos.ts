/**
 * Deck logo library: built-in brand logos for AI-generated decks.
 *
 * Parallel to deck-assets.ts (icons + illustrations). Lives at
 * /public/deck-assets/logos/ so SVGs are publicly servable.
 *
 * Usage:
 *   - AI emits `![logo:claude](_)` in markdown.
 *   - deck-serialize.ts rewrites these to inline <img> tags.
 *   - Single-color logos use `class="plain-logo"` so theme currentColor wins.
 *   - Multi-color logos (e.g. brand-required color marks) emit plain <img>.
 *   - Aliases let `![logo:anthropic-claude]` resolve to the same entry as
 *     `![logo:claude]`. If id is unknown, the original markdown is left
 *     intact (graceful degradation).
 */
import manifestJson from "../../../public/deck-assets/logos-manifest.json";

export type LogoEntry = {
  id: string;
  path: string;
  name: string;
  category: string;
  multicolor: boolean;
  aliases?: string[];
};

export type LogoManifest = {
  version: string;
  logos: LogoEntry[];
};

export const LOGOS: LogoManifest = manifestJson as LogoManifest;

const LOGO_INDEX: ReadonlyMap<string, LogoEntry> = (() => {
  const m = new Map<string, LogoEntry>();
  for (const entry of LOGOS.logos) {
    m.set(entry.id.toLowerCase(), entry);
    if (entry.aliases) {
      for (const alias of entry.aliases) m.set(alias.toLowerCase(), entry);
    }
  }
  return m;
})();

/** Resolve a logo by id or alias (case-insensitive). */
export function findLogo(idOrAlias: string): LogoEntry | undefined {
  return LOGO_INDEX.get(idOrAlias.toLowerCase());
}

/** Unique sorted category list — useful for UI grouping. */
export function listCategories(): string[] {
  const set = new Set<string>();
  for (const l of LOGOS.logos) set.add(l.category);
  return Array.from(set).sort();
}

/** All canonical logo ids — useful for prompts so AI knows what's available. */
export function listLogoIds(): string[] {
  return LOGOS.logos.map((l) => l.id);
}

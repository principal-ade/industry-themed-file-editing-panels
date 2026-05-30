/**
 * Helpers for turning a dragged file path into markdown to insert into the
 * editor. Drag sources (e.g. a file tree) typically put the path on the
 * drag's `text/plain` data; some shell-quote it so it can also be dropped into
 * a terminal. These helpers normalize that back to a raw path and format it as
 * a markdown link whose text is the file name and whose target is the path.
 */

/**
 * Reverse the common POSIX single-quote shell escaping that drag sources apply
 * for terminal drops (e.g. `'my file.md'` or `'it'\''s.md'`). Paths without
 * special characters are passed through unchanged.
 */
export function unshellQuote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    // Undo `'\''` -> `'`, then strip the surrounding quotes.
    return trimmed.slice(1, -1).replace(/'\\''/g, "'");
  }
  return trimmed;
}

/** The last path segment (the file name), with any trailing slash ignored. */
export function basename(path: string): string {
  const normalized = path.replace(/[/\\]+$/, '');
  const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  return idx === -1 ? normalized : normalized.slice(idx + 1);
}

/**
 * Escape the characters that would break out of a markdown link's text or
 * destination. Destinations with spaces/parens are wrapped in `<…>`.
 */
function escapeLinkText(text: string): string {
  return text.replace(/([[\]\\])/g, '\\$1');
}
function formatDestination(path: string): string {
  return /[\s()]/.test(path) ? `<${path}>` : path;
}

/**
 * Default formatter: `[fileName](relative/path)`. The display text is the file
 * name; the destination is the full (relative) path the host can resolve.
 * Returns null for empty input so the caller can ignore the drop.
 */
export function defaultFormatDroppedPath(rawPath: string): string | null {
  const path = unshellQuote(rawPath);
  if (!path) return null;
  return `[${escapeLinkText(basename(path))}](${formatDestination(path)})`;
}

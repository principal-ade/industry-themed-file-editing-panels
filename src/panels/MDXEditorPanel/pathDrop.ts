/**
 * Helpers for turning a dragged file path into markdown to insert into the
 * editor. Drag sources (e.g. a file tree) typically put the path on the
 * drag's `text/plain` data; some shell-quote it so it can also be dropped into
 * a terminal. These helpers normalize that back to a raw path and format it as
 * a markdown link whose text is the file name and whose target is the path.
 *
 * `text/plain` is also used by drag sources that are NOT file paths (trail rows
 * carry multi-line instruction text, selections carry their own text, etc.), so
 * {@link isLikelyPath} gates linkification and {@link defaultFormatDroppedPath}
 * returns null for anything that doesn't look like a path — letting the editor
 * fall back to its native drop handling instead of producing broken markdown.
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
 * Heuristic: does this (already unquoted) string look like a single file path,
 * as opposed to prose, an instruction blob, or markup? Used to avoid turning
 * arbitrary `text/plain` drops into markdown links.
 *
 * Rejects: empty, multi-line, anything with quotes or angle brackets (prose /
 * markup), and space-containing strings that have no path separator (sentences).
 */
export function isLikelyPath(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (/[\n\r]/.test(s)) return false; // multi-line => not a single path
  if (/["'<>]/.test(s)) return false; // quotes / angle brackets => prose or markup
  const hasSeparator = s.includes('/') || s.includes('\\');
  if (s.includes(' ') && !hasSeparator) return false; // "hello world" => not a path
  return true;
}

/** Escape the characters that would break out of a markdown link's text. */
function escapeLinkText(text: string): string {
  return text.replace(/([[\]\\])/g, '\\$1');
}

/**
 * Encode the characters that would break a markdown link destination. Unlike
 * CommonMark, MDX does not allow `<…>`-wrapped destinations (it parses `<` as
 * JSX), so we percent-encode spaces and parentheses instead — the host can
 * decode the path when resolving it.
 */
function encodeDestination(path: string): string {
  return path
    .replace(/ /g, '%20')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Default formatter: `[fileName](relative/path)`. The display text is the file
 * name; the destination is the full (relative) path the host can resolve.
 * Returns null when the dropped value doesn't look like a path, so the caller
 * can ignore it and let the editor handle the drop natively.
 */
export function defaultFormatDroppedPath(rawPath: string): string | null {
  const path = unshellQuote(rawPath);
  if (!isLikelyPath(path)) return null;
  return `[${escapeLinkText(basename(path))}](${encodeDestination(path)})`;
}

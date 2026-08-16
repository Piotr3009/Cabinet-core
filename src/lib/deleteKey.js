// ─── WHEN `Delete` IS THE DELETE KEY (turn 34, CLAUDE.md F8) ────────────────
//
// The owner asked for the key; the guard is what makes the key safe. "Delete"
// while the caret sits in a width field means the character to the right of
// the caret, and a joiner who lost a cabinet to it would stop typing numbers.
//
// One DOM question, one place, so the hook and a test ask the same thing:
// is the keyboard currently owned by something that types?
//
// `Backspace` rides with it because a Mac keyboard's ⌫ IS the delete key —
// the owner's own machines — and the same guard covers both.

/** The keys that mean "take this out". */
export const DELETE_KEYS = new Set(['Delete', 'Backspace']);

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Is this element one that OWNS the keyboard?
 *
 * An input, a textarea, a select or anything `contenteditable` — including a
 * modal's number field, which is an `<input type="number">` and is caught by
 * the tag alone. Walks up, because the focused node may be inside a custom
 * control that wraps its own input.
 */
export function isTypingTarget(el) {
  let node = el;
  let hops = 0;
  while (node && hops < 12) {
    if (TYPING_TAGS.has(node.tagName)) return true;
    if (node.isContentEditable === true) return true;
    if (node.getAttribute && node.getAttribute('contenteditable') === 'true') return true;
    node = node.parentElement;
    hops += 1;
  }
  return false;
}

/**
 * Should this keyboard event delete the selected element?
 *
 * @param {KeyboardEvent} e
 * @param {object} doc  the document to ask for `activeElement` (injectable so
 *                      a node test can hand it a stub)
 */
export function isDeleteKey(e, doc = (typeof document === 'undefined' ? null : document)) {
  if (!e || !DELETE_KEYS.has(e.key)) return false;
  // A shortcut is not a delete: ⌘⌫ is "delete to start of line" in a field and
  // is somebody else's gesture everywhere else.
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (isTypingTarget(e.target)) return false;
  if (doc && isTypingTarget(doc.activeElement)) return false;
  return true;
}

/**
 * A CHIP IS A FLAT RECTANGLE (F2), and a REFUSED chip is the whole reason this
 * component exists rather than a <button> with a class.
 *
 * CLAUDE.md F4: *"Refusals come from the engine's own reasons, never from
 * strings typed into retail."* So a caller passes `reason` — a string it got
 * from the engine — and this renders it in the third voice under the chip,
 * ALWAYS visible: *"mobile has no hover; the reason is always visible."* A
 * disabled chip with no reason is a bug, and it looks like one.
 */
export default function Chip({
  label, sub, selected = false, disabled = false, reason = '', note = '',
  onClick, title, style, children,
}) {
  const chip = (
    <button
      type="button"
      className={`pbi-chip${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      title={title || reason || undefined}
      style={style}
    >
      {children || (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span>{label}</span>
          {sub ? <span className="pbi-choice" style={{ fontSize: 12 }}>{sub}</span> : null}
        </span>
      )}
    </button>
  );

  // A REASON is why the chip cannot be pressed; a NOTE is something true about
  // pressing it. They read the same — third voice, under the chip, always
  // visible — because to a client they are the same kind of information: what
  // the workshop knows about this choice.
  const said = reason || note;
  if (!said) return chip;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', maxWidth: 260 }}>
      {chip}
      <span className="pbi-chip-reason">{said}</span>
    </span>
  );
}

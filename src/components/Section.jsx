// ─── Collapsible panel section (BACKLOG #10) ───
// The right panel has a lot in it now — carcass, items, contents, construction,
// doors — so everything folds. A section is a header you can click and a body
// that is simply not rendered when it is shut: no hidden inputs holding focus,
// no measuring, no animation to get wrong.
//
// ─── Turn 15 (CLAUDE.md F1.4): FRAMED, AND THE OPEN ONE LIGHTS UP ───────────
// The owner's verdict on the right panel: "I must see where one section ends".
// A grey hairline between two grey panels on a grey shell is not a boundary
// anybody can see, so a section sits in the same delicate GOLD frame the
// settings surface uses (`.cc-frame`) — and the section that is OPEN is the one
// being worked on, so its frame is the bright one. One shared class, so a
// fourteenth section cannot arrive framed in a slightly different gold.

export default function Section({
  title, badge, open, onToggle, hint, children,
}) {
  return (
    <section className={`cc-frame p-0 ${open ? 'cc-frame-active' : ''}`} data-section={title} data-open={open ? '1' : '0'}>
      <button
        type="button"
        aria-expanded={open}
        title={hint || ''}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-shell-700 transition-colors rounded-lg"
        onClick={onToggle}
      >
        <span className={`text-[10px] transition-transform ${open ? 'rotate-90 text-gold' : 'text-ink-400'}`} aria-hidden>▶</span>
        <span className={`text-xs uppercase tracking-wide flex-1 ${open ? 'text-ink-50' : 'text-ink-200'}`}>{title}</span>
        {badge != null && badge !== '' && <span className="cc-tag">{badge}</span>}
      </button>
      {open && <div className="px-2.5 pb-2.5 pt-0.5 space-y-3">{children}</div>}
    </section>
  );
}

// ─── Collapsible panel section (BACKLOG #10) ───
// The right panel has a lot in it now — carcass, items, contents, construction,
// doors — so everything folds. A section is a header you can click and a body
// that is simply not rendered when it is shut: no hidden inputs holding focus,
// no measuring, no animation to get wrong.

export default function Section({ title, badge, open, onToggle, hint, children }) {
  return (
    <section className="border border-shell-600 rounded">
      <button
        type="button"
        aria-expanded={open}
        title={hint || ''}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-shell-700 transition-colors rounded"
        onClick={onToggle}
      >
        <span className={`text-ink-400 text-[10px] transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>▶</span>
        <span className="text-xs uppercase tracking-wide text-ink-200 flex-1">{title}</span>
        {badge != null && badge !== '' && <span className="cc-tag">{badge}</span>}
      </button>
      {open && <div className="px-2.5 pb-2.5 pt-0.5 space-y-3">{children}</div>}
    </section>
  );
}

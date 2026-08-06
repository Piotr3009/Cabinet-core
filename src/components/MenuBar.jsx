import { useEffect, useRef, useState } from 'react';

// ─── Classic top menu (BACKLOG #8) ───
//
// One bar, one style. Turn 3 had the controls spread over a top bar, a floating
// Library panel and a canvas toolbar; from here the things that act on the
// PROJECT live in menus on the left, and Account / Export stay on the right
// where they already were.
//
// A menu is DATA: { label, items: [{ label, hint, disabled, checked, run,
// items }] }. Adding "Print" later is one entry, not a new component — the
// keyboard handling, the dismissal and the submenu already work.

export default function MenuBar({ menus }) {
  const [open, setOpen] = useState(null);
  const bar = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!bar.current?.contains(e.target)) setOpen(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <nav ref={bar} className="flex items-center gap-0.5" aria-label="Main menu">
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open === menu.label}
            disabled={menu.disabled}
            title={menu.hint || ''}
            className={`px-2.5 py-1.5 rounded text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              open === menu.label
                ? 'border-gold bg-shell-700 text-gold'
                : 'border-transparent text-ink-100 hover:bg-shell-700 hover:text-ink-50'}`}
            // Hover follows the open menu, the way a menu bar is expected to:
            // once one is open, sliding along the bar walks the others.
            onPointerEnter={() => { if (open && !menu.disabled) setOpen(menu.label); }}
            onClick={() => setOpen(open === menu.label ? null : menu.label)}
          >
            {menu.label}
            {menu.soon && <span className="cc-tag ml-1.5">soon</span>}
          </button>

          {open === menu.label && menu.items?.length > 0 && (
            <Dropdown items={menu.items} onClose={() => setOpen(null)} />
          )}
        </div>
      ))}
    </nav>
  );
}

function Dropdown({ items, onClose, nested = false }) {
  const [openSub, setOpenSub] = useState(null);
  return (
    <div
      role="menu"
      className={`absolute z-50 min-w-[210px] cc-panel py-1 ${nested ? 'left-full -top-1 ml-0.5' : 'left-0 top-full mt-1'}`}
    >
      {items.map((item, i) => {
        if (item.divider) return <div key={`div-${i}`} className="cc-divider !my-1" />;
        const hasSub = Array.isArray(item.items) && item.items.length > 0;
        return (
          <div key={item.label} className="relative">
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.hint || ''}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-shell-700 ${
                item.checked ? 'text-gold' : 'text-ink-100'}`}
              onPointerEnter={() => setOpenSub(hasSub ? item.label : null)}
              onClick={() => {
                if (hasSub) { setOpenSub(openSub === item.label ? null : item.label); return; }
                if (item.disabled) return;
                item.run?.();
                onClose();
              }}
            >
              {/* A tick column, so a switchable item never shifts the label when
                  it is turned on. */}
              {item.checked != null && <span className="w-3 shrink-0">{item.checked ? '✓' : ''}</span>}
              <span className="flex-1">{item.label}</span>
              {item.soon && <span className="cc-tag">soon</span>}
              {hasSub && <span className="text-ink-400" aria-hidden>▸</span>}
            </button>
            {hasSub && openSub === item.label && (
              <Dropdown items={item.items} onClose={onClose} nested />
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useTemplateStore } from '../stores/templateStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { getUnitType } from '../engine/types.js';
import { NAME_MAX } from '../lib/templates.js';
import { formatMm } from '../engine/format.js';

// "Save as template" (BACKLOG #30) — the configured unit goes to
// Library ▸ Saved sets under a name of its own.
//
// A name, and only a name: everything else about the set is already decided by
// the cabinet that was right-clicked. A library of "Wardrobe", "Wardrobe (2)"
// and "Wardrobe (3)" is a library nobody uses, which is why this asks rather
// than filing it under the type.
export default function SaveTemplateModal() {
  const modalArgs = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
  const units = useProjectStore((s) => s.units);
  const save = useTemplateStore((s) => s.save);
  const templates = useTemplateStore((s) => s.templates);

  const unit = units.find((u) => u.id === modalArgs?.unitId) || null;
  const type = unit ? getUnitType(unit.type) : null;
  const [name, setName] = useState(() => (unit ? `${getUnitType(unit.type).label} ${unit.params.width} mm` : ''));

  if (!unit) return null;

  const clean = name.trim();
  const replaces = templates.find((t) => t.name.toLowerCase() === clean.toLowerCase()) || null;

  const commit = () => {
    if (!clean) return;
    const { error, replaced } = save(unit, clean);
    if (error) { notify(error, 'warn'); return; }
    notify(replaced ? `“${clean}” updated in Saved sets.` : `“${clean}” saved to Library ▸ Saved sets.`, 'ok');
    setLibraryCategory('sets');
    closeModal();
  };

  const items = unit.params.sections?.[0]?.items || [];
  const counts = [
    [items.filter((i) => i.kind === 'drawer').length, 'drawer'],
    [items.filter((i) => i.kind === 'shelf').length, 'shelf', 'shelves'],
    [items.filter((i) => i.kind === 'hanger').length, 'rail'],
    [(unit.params.end_panels || []).length, 'end panel'],
  ].filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : (many || `${one}s`)}`);

  return (
    <Modal
      title="Save as template"
      onClose={closeModal}
      width="w-[440px]"
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={closeModal}>Cancel</button>
          <button type="button" className="cc-btn-gold" onClick={commit} disabled={!clean}>
            {replaces ? 'Replace' : 'Save'}
          </button>
        </>
      )}
    >
      <label className="block">
        <span className="cc-label">Name</span>
        <input
          autoFocus
          className="cc-input"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        />
      </label>

      <div className="mt-3 text-[11px] text-ink-400 space-y-1">
        <p>
          {type.label} · {formatMm(unit.params.width)} × {formatMm(unit.params.height)} × {formatMm(unit.params.depth)} mm
          {counts.length ? ` · ${counts.join(', ')}` : ''}
        </p>
        <p>
          The set keeps how this unit is BUILT — not where it stands and not its unit number.
          Inserting it places a new unit through the ordinary collision rules.
        </p>
        {replaces && (
          <p className="text-status-warn">
            There is already a set called “{replaces.name}” — saving replaces it.
          </p>
        )}
      </div>
    </Modal>
  );
}

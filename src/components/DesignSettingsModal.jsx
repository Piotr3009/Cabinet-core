import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import WizardSettings from './WizardSettings.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { migrateDesign, projectHeights } from '../engine/design.js';
import { wizardStartBlockers } from '../engine/projectSettings.js';
import { persistProject } from '../lib/persist.js';

// ─── Settings, from the top bar (turn 12, CLAUDE.md F1) ─────────────────────
//
// A frame and nothing else. Everything that used to be written out here is in
// the ONE settings surface — the same component the new-project flow shows,
// bound to the same store the scene reads.
//
// That is the whole of F1. Turn 11 left the app with two settings screens that
// looked alike and wrote to different fields, so a colour set from one of them
// never reached the furniture. There is one now; this file is the door it is
// opened through from the menu, and the flow is the other door.
//
// ─── TURN 36 (CLAUDE.md F1): AND THE SURFACE IS THE WIZARD'S ────────────────
//
// The owner, 17.08.2026, on finding sheet sizes in one panel and not the
// other: *"mamy new project i edit project — 2 różne setup modale, a powinien
// to być ten sam modal. Sprawdź dokładnie i dołóż wszystkie funkcje ze starego
// do nowego."*
//
// The audit was exactly as he said it: NEW project reached `WizardSettings`,
// EDIT project reached `SettingsPanel`, and T35 had landed the sheet sizes
// (F15) and the hinge-plate pilot (F8) in the OLD one only. Two forms, one
// project, and no rule about which of them a new control belongs in.
//
// So this door now opens the SAME component the flow opens, told which door it
// came through. `SettingsPanel.jsx` is NOT deleted — iron rule 4, the owner's
// sanctity rule — it stays in the tree, and the unified panel imports its
// sheet-size row and its hinge block rather than copying them, so the one
// implementation serves both.
//
// ─── TURN 49 (CLAUDE.md F7): EDITING A SETUP IS NOT A CHAIN ─────────────────
//
// The owner, 25.08.2026: *"jak juz mamy edit setup to powinno byc mozliwosc
// przeskakiwania z 5.1 do 5.4 etc, bo juz bylo ustawione i nie potrzebujemy
// sztywnego lancucha — bo zmieniamy tylko niektore itemy, i jest po zmianie
// przycisk update and save."*
//
// The jumping is the strip's, inside `WizardSettings`, which knows which door
// it came through. What belongs to THIS file is the second half of the
// sentence: the button. `Update and save` commits FROM WHEREVER THE USER
// STANDS — it does not walk the rest of the sequence, because there is no rest
// to walk in a project that is already set up.
//
// What "commit" means here is the same thing File ▸ Save means, and it is the
// SAME function (`lib/persist.js persistProject`) the top bar's Save button
// calls — one save path, so a project saved from this window is a project
// saved. Every control on the surface has already written through the store's
// own setters (that is turn 12's law and it has not moved); what this button
// adds is putting the job on the shelf and in the database.
//
// AND IT REFUSES A SETUP THAT WAS NEVER FINISHED. *"An unanswered step, if one
// exists in an old project, still says so — a jump may not commit a setup that
// was never finished."* The gate is `wizardStartBlockers` — the SAME pure
// engine function `Start designing` is held to in the wizard, so the two doors
// cannot disagree about what a buildable job is — and what it finds is printed
// beside the button rather than hidden in a tooltip.
//
// `Done` is untouched (iron rule 4): it closes the window, which is what it has
// always done, and the settings it leaves behind are already on the project.
export default function DesignSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;

  const project = useProjectStore((s) => s.project);
  const units = useProjectStore((s) => s.units);
  const markSaved = useProjectStore((s) => s.markSaved);
  const storedDesign = useProjectStore((s) => s.project.design);
  const roomHeight = useProjectStore((s) => Number(s.project.room?.height) || 0);
  const profile = useCabinetProfileStore((s) => s.profile);
  const assignmentData = useMaterialAssignmentStore((s) => s.data);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  // The same gate, from the same function, as the wizard's one committing
  // button. A jump may not commit a setup that was never finished.
  const { blockers } = useMemo(() => wizardStartBlockers({
    design, heights: projectHeights(design, profile), roomHeight, profile, assignments: assignmentData,
  }), [design, profile, roomHeight, assignmentData]);

  const [saving, setSaving] = useState(false);
  // The save closes the window, so the component is gone before the promise
  // that started it settles. Setting state on it then is a warning nobody can
  // act on — this is the guard, and it is the only reason the ref exists.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const updateAndSave = async () => {
    if (blockers.length || saving) return;
    setSaving(true);
    const { project: saved, message, tone } = await persistProject({ project, units });
    markSaved(saved);
    notify(message, tone);
    if (!alive.current) return;
    setSaving(false);
    // A save that only reached this computer is still a save, and the message
    // above says which — so the window closes either way rather than leaving a
    // joiner pressing a button that already worked.
    closeModal();
  };

  return (
    <Modal
      name="design"
      anchor={anchor}
      title="Settings"
      onClose={closeModal}
      width="w-[760px]"
      footer={(
        <>
          {blockers.length > 0 && (
            <span className="flex-1 text-[11px] text-status-warn text-left" data-settings-unanswered="1">
              {blockers[0].message}
            </span>
          )}
          <button
            type="button"
            className="cc-btn"
            title="Close this window — everything above is already on the project"
            onClick={closeModal}
          >
            Done
          </button>
          {/* T49 F7: *"i jest po zmianie przycisk update and save."* */}
          <button
            type="button"
            className="cc-btn-gold"
            data-update-and-save="1"
            disabled={blockers.length > 0 || saving}
            title={blockers.length
              ? blockers.map((b) => b.message).join('\n')
              : 'Write the project to the shelf and close — from wherever you are in the sequence'}
            onClick={updateAndSave}
          >
            {saving ? 'Saving…' : 'Update and save'}
          </button>
        </>
      )}
    >
      {/* Room setup opens IN PLACE OF this modal — one floating window at a
          time, and Settings is one click away again when it closes. It keeps
          the same anchor, so it lands where this one is standing. */}
      <WizardSettings door="project" onRoomSetup={() => openModal('room', { anchor })} />
    </Modal>
  );
}

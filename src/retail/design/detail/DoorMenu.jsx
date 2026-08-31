import { ChipRow, Field, Said, Slider } from '../controls.jsx';
import Button from '../../ui/Button.jsx';
import Duty from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.2 · THE DOOR ───────────────────────────────────────────────────
//
// Read from PRO's `DoorModal` (which leaf, which hand, and the forced-by-slope
// case) and `JpullRunModal` (the run, and the engine's own word when a leaf is
// too short to cut one in).
//
// ─── THE HAND, AND THE THREE WAYS IT IS WRITTEN ────────────────────────────
//
// A BAY leaf's hand belongs to its bay (`setBayDoor`). A SINGLE face leaf's
// belongs to the cabinet (`setDoors`). A face PAIR has no hand to set at all —
// the engine hangs `-FL` left and `-FR` right by construction — so the chips
// are disabled with that said out loud rather than offered and ignored.
//
// And over all three, the rake: `meta.hingeForced`. Under a slope the engine
// decides, and where it has, the chips go and a line takes their place —
// *"Opens from the slope."* Retail reads the flag; it never re-derives the rule.
//
// ─── THE T57 LAW, AND THE ONE PLACE IT IS READ NARROWLY ────────────────────
//
// A J-pull is machined into the front's own edge, so nothing is screwed on:
// `normaliseHandle` short-circuits before a line of hardware arithmetic. BAR
// and KNOB are therefore refused while a J is chosen, in the engine's own
// terms. NONE is not — because a chip row in which every entry but the chosen
// one is dead is a one-way door, and a control a client cannot come back out
// of is the dead-control law breaking from the other side. NONE is the way
// back, and it is named in the morning report.

export default function DoorMenu({
  unitId, panel, project, onBack, onDone,
}) {
  if (!panel) return null;
  const hinge = A.doorHinge(unitId, panel);
  const handle = A.doorHandle(unitId, panel, project);
  const jpull = A.jpullRun(unitId, panel);
  const open = A.doorIsOpen(unitId, panel.id);
  const styleNow = project?.design?.fronts?.style || 'F';

  return (
    <Duty title="DOOR" onBack={onBack} onDone={onDone}>
      <Field label="HINGE SIDE">
        {hinge.forced ? (
          <Said testid="door-forced">{hinge.reason}</Said>
        ) : (
          <ChipRow
            testid="door-hinge"
            value={hinge.hand}
            options={[
              { id: 'L', label: 'LEFT', reason: hinge.reason },
              { id: 'R', label: 'RIGHT', reason: hinge.reason },
            ]}
            onPick={(id) => A.setDoorHinge(unitId, panel, id)}
          />
        )}
      </Field>

      <Field label="FRONT STYLE">
        <ChipRow
          testid="door-style"
          value={styleNow}
          options={A.frontStyles().map((s) => ({ id: s.id, label: s.label, reason: s.reason }))}
          onPick={(id) => A.setFrontStyle(id)}
        />
      </Field>

      <Field label="HANDLE">
        <ChipRow
          testid="door-handle"
          value={handle}
          options={A.handleSystems().map((h) => ({
            id: h.id,
            label: h.label,
            reason: handle === 'jpull' && h.id !== 'jpull' && h.id !== 'none' ? A.REASON_JPULL : '',
          }))}
          onPick={(id) => A.setDoorHandle(unitId, panel.id, id)}
        />
      </Field>

      {jpull ? (
        <Field label="J RUN">
          {jpull.reason ? (
            <Said testid="door-jrun-said">{jpull.reason}</Said>
          ) : (
            <Slider
              testid="door-jrun"
              min={jpull.min}
              max={jpull.max}
              step={10}
              standardAt={jpull.standard}
              value={jpull.run}
              onChange={(v) => A.setJpullRun(unitId, panel.id, v)}
            />
          )}
        </Field>
      ) : null}

      <Field label="THIS DOOR">
        <Button
          kind="secondary"
          data-testid="door-open"
          onClick={() => A.toggleDoor(unitId, panel.id)}
        >
          {open ? 'CLOSE IT' : 'OPEN IT'}
        </Button>
      </Field>
    </Duty>
  );
}

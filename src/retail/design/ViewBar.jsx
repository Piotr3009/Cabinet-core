import { CAMERA_PRESETS } from '../../3d/cameraPresets.js';

// ─── F3.3 · THE VIEW BAR ───────────────────────────────────────────────────
//
// *"Across its top, a 40px VIEW BAR (Warm White, hairline below), UI font,
// hairline separators: `FRONT · INSIDE · ROOM | OPEN DOORS · LIGHTS | RESET
// VIEW · ⛶`."*
//
// Three groups, two hairlines, and in full screen a fourth entry at the left
// (F3.5): *"the VIEW BAR stays, plus '‹ BACK TO DESIGN' at its left"* and
// *"In this mode the bar also carries SAVE IMAGE"*.

const PRESET_LABELS = { front: 'FRONT', inside: 'INSIDE', room: 'ROOM' };

function BarButton({ label, active = false, onClick, testid, title }) {
  return (
    <button
      type="button"
      className="pbi-ui"
      data-testid={testid}
      title={title}
      onClick={onClick}
      style={{
        background: 'none',
        border: 0,
        padding: '0 12px',
        height: '100%',
        cursor: 'pointer',
        color: active ? 'var(--pbi-deep-gold)' : 'var(--pbi-soft-graphite)',
        letterSpacing: '0.18em',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pbi-onyx)'; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? 'var(--pbi-deep-gold)' : 'var(--pbi-soft-graphite)';
      }}
    >
      {label}
    </button>
  );
}

const Sep = () => (
  <span style={{ width: 1, height: 18, background: 'var(--pbi-stone-line)', flex: '0 0 auto' }} />
);

export default function ViewBar({
  preset, onPreset, doorsOpen, onDoors, lightsOn, onLights, onReset,
  fullScreen, onFullScreen, onBack, onSaveImage,
}) {
  return (
    <div
      data-testid="view-bar"
      style={{
        height: 'var(--pbi-view-bar-h)',
        minHeight: 'var(--pbi-view-bar-h)',
        background: 'var(--pbi-warm-white)',
        borderBottom: '1px solid var(--pbi-stone-line)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 8,
        paddingRight: 8,
      }}
    >
      {fullScreen ? (
        <>
          <BarButton label="‹ BACK TO DESIGN" onClick={onBack} testid="view-back" />
          <Sep />
        </>
      ) : null}

      {CAMERA_PRESETS.map((id) => (
        <BarButton
          key={id}
          label={PRESET_LABELS[id]}
          active={preset === id}
          onClick={() => onPreset(id)}
          testid={`view-${id}`}
        />
      ))}

      <Sep />

      <BarButton
        label="OPEN DOORS"
        active={doorsOpen}
        onClick={onDoors}
        testid="view-doors"
      />
      <BarButton label="LIGHTS" active={lightsOn} onClick={onLights} testid="view-lights" />

      <Sep />

      <BarButton label="RESET VIEW" onClick={onReset} testid="view-reset" />

      {fullScreen ? (
        <BarButton label="SAVE IMAGE" onClick={onSaveImage} testid="view-save-image" />
      ) : null}

      <span style={{ flex: '1 1 auto' }} />

      <BarButton
        label="⛶"
        active={fullScreen}
        onClick={onFullScreen}
        testid="view-fullscreen"
        title={fullScreen ? 'Back to the design' : 'Fill the page'}
      />
    </div>
  );
}

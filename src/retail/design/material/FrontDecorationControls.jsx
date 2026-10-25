import NumberField from '../room/NumberField.jsx';
import { newFrontDecoration, normaliseFrontDecoration, ORNATE_STYLE_IDS, reedChoices } from '../../../engine/frontDecoration.js';

const FIELD_LABELS = {
  frameMm: 'Frame width',
  recessDepthMm: 'Panel recess depth',
  grooveWidthMm: 'Groove width',
  fluteDiameterMm: 'Ballnose cutter diameter',
  grooveDepthMm: 'Groove depth',
  groovePitchMm: 'Groove centre spacing',
  grooveInsetMm: 'Groove margin',
  mouldingInsetMm: 'Moulding inset',
  mouldingWidthMm: 'Moulding width',
  mouldingProjectionMm: 'Moulding projection',
};

// T82 F15 · the cloud: a Fluted front is grooves or reeds. The owner,
// 25.10.2026: *"fluted teraz to sa rowki a ja potrzebuje chmurke"*, *"daj
// wariant b czyli na styk narazie"*, *"do tego daj ustawienie srednicy walkow
// tez"*. A reed shows its diameter (the profile's ladder beside the free
// number) and the side margin; the ballnose's own numbers are the groove's.
const GROOVE_ONLY = ['fluteDiameterMm', 'grooveDepthMm', 'groovePitchMm'];

// T76 F6 · `fields={false}` is retail's: *"a client picks a style and gets
// the owner's recipe with NO numeric fields (lazy client law; the recipe
// controls are PRO's)"*. Only the activation of an old saved front is left.
export default function FrontDecorationControls({ style, value, onChange, fields = true }) {
  // T82 F15 · a new choice is born as `newFrontDecoration` makes it (FL: reeds).
  const defaults = newFrontDecoration(style);
  if (!defaults) return null;
  const config = normaliseFrontDecoration(value, style);
  const ornate = ORNATE_STYLE_IDS.includes(style);
  if (ornate && config) return (
    <div className="pbi-re-line pbi-re-hair pbi-re-round pbi-re-p2 pbi-re-stack-2" data-front-decoration={style}>
      <p className="pbi-re-t11 pbi-re-quiet" data-ornate-proposal={style}>
        Proposed carved relief from the reference drawing. Dimensions and ornament need workshop approval.
        The CNC pack includes reference DXF, a relief model and a machining description.
      </p>
      <label className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
        <input type="checkbox" aria-label="Mirror ornate pattern" data-ornate-mirror={style}
          checked={config.mirror === true} onChange={(event) => onChange({ ...config, mirror: event.target.checked })} />
        <span>Mirror ornate pattern</span>
      </label>
    </div>
  );
  if (config && !fields) return null;
  const update = (key, next) => onChange({ ...config, [key]: next });
  const reed = style === 'FL' && config?.fluteProfile === 'reed';
  const reedOf = reedChoices();
  const setFluteProfile = (next) => onChange({
    ...config, fluteProfile: next,
    ...(next === 'reed' && !Number.isFinite(config.reedDiameterMm) ? { reedDiameterMm: reedOf.diameterMm } : {}),
  });
  return (
    <div className="pbi-re-line pbi-re-hair pbi-re-round pbi-re-p2 pbi-re-stack-2" data-front-decoration={style}>
      {!config ? (
        <>
          <p className="pbi-re-t11 pbi-re-quiet">
            This saved front has no decorative machining. Activate the editable workshop defaults to add it.
          </p>
          <button type="button" className="pbi-re-btn" data-decoration-activate={style} onClick={() => onChange(defaults)}>
            Activate decorative front
          </button>
        </>
      ) : (
        <>
          <p className="pbi-re-t11 pbi-re-quiet">
            {style === 'AM'
              ? 'Four applied strips, with 45 degree mitres, added to the front and the parts list.'
              : style === 'FL' && reed
                ? 'Convex reeds, touching, cut with a reed profile cutter: the crests are the front\'s face and each valley goes half the diameter into the board. Top and bottom they run to the edges.'
              : style === 'FL'
                ? 'Round-bottom grooves cut with a ballnose tool. The cutter and depth determine their opening width.'
                : 'Decorative machining in the face of one slab. Dimensions below are editable workshop defaults.'}
            {style === 'GF' ? ' Groove depth is additional to the panel recess.' : ''}
            {style === 'AH' ? ' Choose the J-pull separately in Opening.' : ''}
          </p>
          {style === 'FL' && (
            <label className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
              <span className="pbi-re-grow">Flute profile</span>
              <select
                className="pbi-re-input pbi-re-w28"
                aria-label="Flute profile"
                data-decoration-field="fluteProfile"
                value={config.fluteProfile || 'groove'}
                onChange={(event) => setFluteProfile(event.target.value)}
              >
                <option value="reed">Reeds</option>
                <option value="groove">Grooves</option>
              </select>
            </label>
          )}
          {reed && (
            // A row, not a label: a label would hand a click on its words to the first ladder button.
            <div className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2" data-reed-diameter>
              <span className="pbi-re-grow">Reed diameter</span>
              {reedOf.ladderMm.map((mm) => (
                <button
                  key={mm}
                  type="button"
                  className={`pbi-re-btn pbi-re-px2 pbi-re-py05 pbi-re-t11 ${config.reedDiameterMm === mm ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
                  aria-pressed={config.reedDiameterMm === mm}
                  data-reed-ladder={mm}
                  onClick={() => update('reedDiameterMm', mm)}
                >
                  {mm}
                </button>
              ))}
              <NumberField
                className="pbi-re-input pbi-re-w20 pbi-re-right"
                aria-label="Reed diameter"
                data-decoration-field="reedDiameterMm"
                value={config.reedDiameterMm}
                integer={false}
                onCommit={(next) => update('reedDiameterMm', next)}
              />
              <span className="pbi-re-quiet">mm</span>
            </div>
          )}
          {Object.entries(FIELD_LABELS).filter(([key]) => Object.hasOwn(defaults, key) && !(reed && GROOVE_ONLY.includes(key))).map(([key, label]) => (
            <label key={key} className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
              <span className="pbi-re-grow">{reed && key === 'grooveInsetMm' ? 'Reed side margin' : label}</span>
              <NumberField
                className="pbi-re-input pbi-re-w20 pbi-re-right"
                aria-label={label}
                data-decoration-field={key}
                value={config[key]}
                integer={false}
                onCommit={(next) => update(key, next)}
              />
              <span className="pbi-re-quiet">mm</span>
            </label>
          ))}
          {Object.hasOwn(defaults, 'grooveDirection') && (
            <label className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
              <span className="pbi-re-grow">{reed ? 'Reed direction' : 'Groove direction'}</span>
              <select
                className="pbi-re-input pbi-re-w28"
                aria-label="Groove direction"
                data-decoration-field="grooveDirection"
                value={config.grooveDirection}
                onChange={(event) => update('grooveDirection', event.target.value)}
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>
          )}
        </>
      )}
    </div>
  );
}

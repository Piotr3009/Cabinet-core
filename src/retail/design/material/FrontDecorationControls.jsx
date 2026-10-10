import NumberField from '../room/NumberField.jsx';
import { defaultFrontDecoration, normaliseFrontDecoration } from '../../../engine/frontDecoration.js';

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

export default function FrontDecorationControls({ style, value, onChange }) {
  const defaults = defaultFrontDecoration(style);
  if (!defaults) return null;
  const config = normaliseFrontDecoration(value, style);
  const update = (key, next) => onChange({ ...config, [key]: next });
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
              : style === 'FL'
                ? 'Round-bottom grooves cut with a ballnose tool. The cutter and depth determine their opening width.'
                : 'Decorative machining in the face of one slab. Dimensions below are editable workshop defaults.'}
            {style === 'GF' ? ' Groove depth is additional to the panel recess.' : ''}
            {style === 'AH' ? 'Choose the J-pull separately in Opening.' : ''}
          </p>
          {Object.entries(FIELD_LABELS).filter(([key]) => Object.hasOwn(defaults, key)).map(([key, label]) => (
            <label key={key} className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
              <span className="pbi-re-grow">{label}</span>
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
          {Object.hasOwn(defaults, 'archRatio') && (
            <label className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
              <span className="pbi-re-grow" title="Percentage of the shorter inner opening dimension">Arch rise</span>
              <NumberField
                className="pbi-re-input pbi-re-w20 pbi-re-right"
                aria-label="Arch rise percent"
                data-decoration-field="archRatio"
                value={config.archRatio * 100}
                integer={false}
                onCommit={(next) => update('archRatio', next / 100)}
              />
              <span className="pbi-re-quiet">%</span>
            </label>
          )}
          {Object.hasOwn(defaults, 'grooveDirection') && (
            <label className="pbi-re-row pbi-re-mid pbi-re-gap-2 pbi-re-t11 pbi-re-ink-2">
              <span className="pbi-re-grow">Groove direction</span>
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

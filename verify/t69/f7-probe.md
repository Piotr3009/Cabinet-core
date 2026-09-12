# T69 · F7 — THE LIGHT PROBE

_The LIGHTS button is pressed, then a piece is added, and the flag is read
again. Every `setDesign` that ran in between is counted with the key it
touched. `node scripts/t69-f7-probe.mjs`._

## 1 · ADD A PIECE TO A LIT WARDROBE

| added | flag before | flag after | strips stored | strips that still LIGHT | `setDesign` calls | touching `lighting` |
| --- | --- | --- | --- | --- | --- | --- |
| shoe drawer | ON | ON | 2 → 2 | 2 → 2 | 0 | 0 |
| drawer | ON | ON | 2 → 2 | 2 → 2 | 0 | 0 |
| shelves | ON | ON | 2 → 2 | 2 → 2 | 0 | 0 |
| rail *(refused)* | ON | ON | 2 → 2 | 2 → 2 | 0 | 0 |

**VERDICT 1 — 0 of 4 adds turn the FLAG off, and 0 of 4 put a strip OUT** (its shelf is gone, so it lights nothing).

## 2 · WHO WROTE THE FLAG

No `setDesign` call touched `lighting` during any add. Every writer of the
flag is therefore one of the two lawful acts below, which is F7's own law:
*"nothing writes the light but the LIGHTS button and the client."*

**VERDICT 2 — the light flag has 0 writer(s) outside the LIGHTS button, on every path a client walks.**

### …and the whole tree, swept

| site | line | what it says |
| --- | --- | --- |
| `src/components/LightingPanel.jsx` | 292 | `setLighting({ on: true })} > ON </button> <butto` |
| `src/components/LightingPanel.jsx` | 305 | `setLighting({ on: false })} > OFF </button> </div>` |
| `src/components/TopBar.jsx` | 220 | `setLighting({ on: !lightOn }), }, { label: 'X-ray', ` |
| `src/engine/design.js` | 310 | `lighting: { on: false, temperature: null, switch: null, items: [], }, heights: { base: nul` |
| `src/retail/design/adapter.js` | 1172 | `setLighting({ on: Boolean(on) }); return lightingOn(S().project); } export const ligh` |
| `src/retail/design/lighting/LightingPanel.jsx` | 292 | `setLighting({ on: true })} > ON </button> <butto` |
| `src/retail/design/lighting/LightingPanel.jsx` | 305 | `setLighting({ on: false })} > OFF </button> </div>` |

**VERDICT 3 — 7 site(s) in `src/` name `lighting.on` at all, and they are ONE ACT:** 6 of them call `projectStore.setLighting` — PRO's LIGHTING panel, PRO's View menu, retail's copied panel and retail's adapter, which is the LIGHTS control in two apps — and 1 is `DEFAULT_DESIGN`, a default and not a write. **0 site(s) write it any other way.**

A further 7 are LOCAL PREVIEWS that never reach the store — a panel
showing what its own strips would look like:

- `src/components/BomPanel.jsx:84` — `lighting: { ...migrated.lighting, on: true } }; const strips = entries.flatMap(({ unit, re`
- `src/components/LightingPanel.jsx:217` — `lighting: { ...design.lighting, on: true } }), [design], ); const unitStrips = useMemo(() `
- `src/components/WizardSettings.jsx:413` — `lighting: { ...design.lighting, on: true } }), [design], ); const allStrips = useMemo(() =`
- `src/components/WizardSummary.jsx:166` — `lighting: { ...design.lighting, on: true } }; const strips = units.flatMap((u) => { const `
- `src/lib/cncExport.js:41` — `lighting: { ...d.lighting, on: true } }, profile, }); return withLedGrooves({ result, stri`
- `src/lib/exporters.js:87` — `lighting: { ...d.lighting, on: true } }, profile, })), ledSpec, ).plan, ), ]; const csv = `
- `src/retail/design/lighting/LightingPanel.jsx:217` — `lighting: { ...design.lighting, on: true } }), [design], ); const unitStrips = useMemo(() `

## 3 · THE TWO LAWFUL ACTS, FOR CONTRAST

| act | before | after |
| --- | --- | --- |
| the LIGHTS button, off | ON | off |
| the LIGHTS button, on | off | ON |


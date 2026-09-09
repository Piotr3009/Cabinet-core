| lighting number | resolved by | PRO | retail | same |
|---|---|---|---|---|
| `baseGain` | `profile.appearance.studio.baseGain` | `0.75` | `0.75` | ✅ |
| `ambient` | `profile.appearance.studio.ambient` | `0.2` | `0.2` | ✅ |
| `key` | `profile.appearance.studio.key` | `1` | `1` | ✅ |
| `fill` | `profile.appearance.studio.fill` | `0.55` | `0.55` | ✅ |
| `rim` | `profile.appearance.studio.rim` | `0.3` | `0.3` | ✅ |
| `exposure (tone mapping)` | `<ToneMapping exposure={studio.exposure}>` | `1` | `1` | ✅ |
| `shadowPadding` | `profile.appearance.studio.shadowPadding` | `600` | `600` | ✅ |
| `band.intensity` | `studio.band.intensity` | `2.2` | `2.2` | ✅ |
| `band.colour` | `studio.band.colour` | `#ffffff` | `#ffffff` | ✅ |
| `band.aboveMm / forwardMm` | `studio.band` | `700 / 250` | `700 / 250` | ✅ |
| `band.widthMm / spillMm` | `studio.band` | `400 / 300` | `400 / 300` | ✅ |
| `spotsOn` | `profile.appearance.studio.spotsOn` | `true` | `true` | ✅ |
| `spots[0]` | `studio.spots[0]` | `{"x":0.5,"y":0.62,"z":0.4,"intensity":38,"angle":0.62,"penumbra":0.68,"colour":"#fffaf0","castShadow":false}` | `{"x":0.5,"y":0.62,"z":0.4,"intensity":38,"angle":0.62,"penumbra":0.68,"colour":"#fffaf0","castShadow":false}` | ✅ |
| `spots[1]` | `studio.spots[1]` | `{"x":-0.5,"y":0.62,"z":0.4,"intensity":32,"angle":0.62,"penumbra":0.73,"colour":"#fff8f2","castShadow":false}` | `{"x":-0.5,"y":0.62,"z":0.4,"intensity":32,"angle":0.62,"penumbra":0.73,"colour":"#fff8f2","castShadow":false}` | ✅ |
| `spotReach` | `profile.appearance.studio.spotReach` | `4` | `4` | ✅ |
| `pillars` | `profile.appearance.studio.pillars` | `{"intensity":11,"colour":"#ffffff","widthMm":420,"forwardMm":900,"count":1,"side":"right","spread":1.7}` | `{"intensity":11,"colour":"#ffffff","widthMm":420,"forwardMm":900,"count":1,"side":"right","spread":1.7}` | ✅ |
| `pointsOn` | `profile.appearance.studio.pointsOn` | `false` | `false` | ✅ |
| `points` | `profile.appearance.studio.points` | `[{"x":0.35,"yMm":1650,"z":0.7,"intensity":10,"colour":"#fff6ec"},{"x":-0.35,"yMm":1650,"z":0.7,"intensity":10,"colour":"#fff3e4"},{"x":0.35,"yMm":500,"z":0.7,"intensity":3,"colour":"#fff6ec"},{"x":-0.35,"yMm":500,"z":0.7,"intensity":3,"colour":"#fff3e4"}]` | `[{"x":0.35,"yMm":1650,"z":0.7,"intensity":10,"colour":"#fff6ec"},{"x":-0.35,"yMm":1650,"z":0.7,"intensity":10,"colour":"#fff3e4"},{"x":0.35,"yMm":500,"z":0.7,"intensity":3,"colour":"#fff6ec"},{"x":-0.35,"yMm":500,"z":0.7,"intensity":3,"colour":"#fff3e4"}]` | ✅ |
| `pointReach` | `profile.appearance.studio.pointReach` | `4` | `4` | ✅ |
| `hemisphere` | `profile.appearance.studio.hemisphere` | `{"sky":"#fdf6e8","ground":"#c8c0b0","intensity":0.45}` | `{"sky":"#fdf6e8","ground":"#c8c0b0","intensity":0.45}` | ✅ |
| `ceiling` | `profile.appearance.studio.ceiling` | `{"enabled":true,"share":0.35,"angle":1.05,"penumbra":0.9,"setbackMm":1500,"fallbackCeilingMm":2700,"colour":"#fffaf0"}` | `{"enabled":true,"share":0.35,"angle":1.05,"penumbra":0.9,"setbackMm":1500,"fallbackCeilingMm":2700,"colour":"#fffaf0"}` | ✅ |
| `roomBounce` | `profile.appearance.studio.roomBounce` | `0.42` | `0.42` | ✅ |
| `shadowCasters` | `profile.appearance.studio.shadowCasters` | `2` | `2` | ✅ |
| `keyCastsShadow` | `profile.appearance.studio.keyCastsShadow` | `true` | `true` | ✅ |
| `shadow map` | `profile.render.shadow.normal` | `{"label":"Normal","mapSize":2048,"radius":4,"bias":-0.0002,"normalBias":0.02}` | `{"label":"Normal","mapSize":2048,"radius":4,"bias":-0.0002,"normalBias":0.02}` | ✅ |
| `environment.intensity` | `profile.appearance.environment.intensity` | `0.5` | `0.5` | ✅ |
| `environment (HDRI probe)` | `no HDRI file is loaded by either mount` | `none — RoomEnvironment only` | `none — RoomEnvironment only` | ✅ |
| `lightRig` | `defaultLightRig(profile) — projectStore` | `{"preset":"showroom","lamps":{"ceiling":{"on":true,"strength":1},"leftWall":{"on":false,"strength":1},"rightWall":{"on":true,"strength":1},"facing":{"on":true,"strength":1}}}` | `{"preset":"showroom","lamps":{"ceiling":{"on":true,"strength":1},"leftWall":{"on":false,"strength":1},"rightWall":{"on":true,"strength":1},"facing":{"on":true,"strength":1}}}` | ✅ |
| `sceneLight scale` | `sceneLightScale(project.sceneLight?.scale)` | `1` | `1` | ✅ |
| `brightness (default)` | `uiStore.brightness → brightnessScale(_, profile)` | `1` | `1` | ✅ |
| `brightness (range / step)` | `profile.appearance.studio.brightness` | `0.5–1.5 / 0.05` | `0.5–1.5 / 0.05` | ✅ |
| `brightness — a control to move it` | `TopBar.jsx (PRO, T26) · ViewBar.jsx (retail, copied T65 F2)` | `slider on the bar` | `slider on the bar` | ✅ |

retail files writing a lighting number: 0 (none — one profile, one Scene)
rows: 32  differences: 0

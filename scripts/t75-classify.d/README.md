# T75 classifier fragments

One file per F, named `fNN.mjs` (or `fNN-what.mjs`), each exporting any of:

- `GATES`: `{ key: { what, opens: (params, typeId) => boolean } }`
- `LICENSED`: `{ 'src/engine/x.js': { why, gates: [keys], drawing?: true } }`
- `LIVENESS`: `{ gateKey: () => ({ live, said }) }`
- `GOLDENS`: `[{ file, F, source, params: () => params }]`

`scripts/t75-classify.mjs` and `scripts/t75-goldens.mjs` merge them. A file
licensed by two Fs carries both reasons; a gate named twice is a failure.

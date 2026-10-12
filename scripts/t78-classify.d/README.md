# T78 classifier fragments

One file per F, named `fNN.mjs`, each exporting any of (T75's and T77's shape):

- `GATES`: `{ key: { what, opens: (params, typeId) => boolean } }`
- `LICENSED`: `{ 'src/engine/x.js': { why, gates: [keys], drawing?: true } }`
- `LIVENESS`: `{ gateKey: () => ({ live, said }) }`
- `GOLDENS`: `[{ file, F, source, params: () => params }]` or `[{ file, F, source, make: () => summary, params: () => scene }]`
- `REPINNED`: `[{ file, why }]` for a golden an F moves on purpose
- `COMMIT`: the full sha of the F's commit (written after it)

`scripts/t78-classify.mjs` and `scripts/t78-goldens.mjs` merge them. A file
licensed by two Fs carries both reasons; a gate named twice is a failure.

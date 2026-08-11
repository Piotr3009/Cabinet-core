# The bucket's own manifests, as test fixtures (turn 20, CLAUDE.md R3)

> "The schema the parser expects and the file the owner uploaded diverged
> silently in turn 18. Copy the LIVE `manifest.json` of each family, verbatim,
> into `test/fixtures/bucket/` and run the parser over those copies in unit
> tests. When the owner re-uploads, the copies are refreshed by hand — a
> divergence then fails a test instead of greying the scene."

Two files, one per family, byte-for-byte as they sit beside their models:

| file | family | in-bucket folder | rows |
| --- | --- | --- | --- |
| `runners-blum-movento-manifest.json` | MOVENTO 760H | `runners/blum/movento/` | 40 |
| `hinges-blum-manifest.json` | CLIP top BLUMOTION | `hinges/blum/` | 19 |

## Provenance, stated plainly

These are copies of `reference/hardware/movento.json` and
`reference/hardware/cliptop-hinges.json` — the CATALOGUE OF RECORD the owner
supplied in turn 19, which are the same uploads that sit in the bucket. They
were **not** re-fetched from the live bucket in this turn: the session that
wrote them runs behind an egress policy that answers `403` to
`CONNECT uhzwyhvwngfnyhxxlvmq.supabase.co:443`, and the proxy's own rule is to
report a policy denial rather than route around it. `verify/t20/bucket-live.md`
records the denial, the exact URLs it would have checked, and the one command
that performs the R2 check from a machine that can reach the host
(`node scripts/bucket-live.mjs`).

## What they are FOR

They carry the two diseases turn 18's parser could not survive, and that is
precisely why they are here rather than a tidy hand-written fixture:

* every row's `file` is a path that **exists nowhere in the bucket**
  (`hardware/runners/blum/movento/…`, `hardware/hinges/blum/cliptop/…`);
  the models actually live beside their manifest, so only the BASENAME is used
  (`src/engine/hardwareUrl.js`);
* no row carries a `system`; the runner manifest names it once in its header,
  and a row that does not say inherits it.

Refresh them BY HAND when the owner re-uploads. A divergence then fails
`test/turn20-f2-bucket.test.js` instead of quietly greying the scene.

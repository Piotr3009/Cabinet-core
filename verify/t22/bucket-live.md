# R2 — the live bucket, turn 22

`node scripts/bucket-live.mjs` — the same script turn 20 wrote and turn 21 ran,
unchanged. Every URL it checks is built by the APP's own code: the host is
derived from the EGGER decor pack that ships in `public/`, the bucket and the
folder come from `profile.js`, and the file name comes from
`engine/hardwareUrl.js`. It hard-codes nothing.

Raw output: `bucket-live.txt` · `bucket-live.json`.

## The verdict in this session: BLOCKED, exactly as in turn 21

```
host  https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public

MOVENTO 760H (hardware/runners/blum/movento/)
  manifest  …/hardware/runners/blum/movento/manifest.json
            403  119 bytes
  FAILED — manifest answered 403

CLIP top BLUMOTION (hardware/hinges/blum/)
  manifest  …/hardware/hinges/blum/manifest.json
            403  119 bytes
  FAILED — manifest answered 403
```

The 403 is **not the bucket's**. It is this session's egress proxy refusing to
open a tunnel to the storage host at all — the same refusal turn 21 recorded,
from the same policy:

```
$ curl -sS -D- https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/manifest.json
HTTP/1.1 403 Forbidden
Content-Length: 36
curl: (56) CONNECT tunnel failed, response 403
```

119 bytes is the proxy's own refusal page, which is why the script reports a
403 with a body but no rows: nothing from the bucket reached this container.

## What that does and does not cost this turn

**It costs nothing that F2a claims.** The whole point of `lib/hardwareSource.js`
is that the bucket is the SECOND source, not the only one:

| source | this session | proved by |
| --- | --- | --- |
| `db` — a `cc_hardware` row | not reachable (no keys in this build) | `test/turn22-f2-data-module.test.js`, against a fake row |
| `bucket` — the manifest | **refused by the egress policy** | the same test, against the R3 fixtures |
| `mock` — what ships in the repo | **live, in the walk** | `walk.json` — every family resolved to `mock`, the hinges with all 19 rows and the angle rule |

The walk's own hardware step therefore reports `runners=mock(0)
hinges=mock(19) lifts=mock(29)`, and the health row prints exactly that. Which
is the behaviour CLAUDE.md asks for in as many words — "no table, no session,
no network — the app behaves exactly as today".

**And the app never asks its own domain for a model.** That was the owner's
turn-21 404 and it is asserted green in this walk (`R5 the app NEVER asks its
own domain for a hardware model — clean`). The one blocked request in the
console is to the correct ABSOLUTE bucket URL, which is the fact turn 21
established and this turn does not move.

## What the owner should re-run on his own machine

```
node scripts/bucket-live.mjs          # both families 200, 40 and 19 rows
node scripts/seed-hardware.mjs        # a dry run: reads the live manifests
```

…and then, after `sql/004_tura22.sql`:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… CC_OWNER=<uuid> node scripts/seed-hardware.mjs
```

At which point the health row under Database ▸ Company defaults reads `db`
rather than `mock`, and that one word is the whole confirmation.

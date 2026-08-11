# R2 — the bucket, checked live

> **R2.** A bucket claim is proven against the LIVE bucket. Turn 19 wrote a
> storage path three documents agreed on and the bucket disagreed with. […]
> The walk MUST fetch the real manifests and HEAD at least one real model file
> per family (assert HTTP 200 and size > 10 KB) before any screenshot of
> hardware is taken.

## The host, derived and not typed

`public/decors/egger/egger-decors.json` → first absolute `tex` URL:

```
https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/decors/egger/H1180_37.jpg
                                                                └── everything up to /object/public is the host
```

**Derived host:** `https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public`

The derivation is code, not a note: `scripts/bucket-live.mjs → derivedStorageBase()`,
and `test/turn20-f2-bucket.test.js` re-derives it the same way for its URL
assertions, so nothing in this turn hard-codes the host beside the app.

## The URLs this turn's fix produces

Built by the app's own code — `profile.js` for the bucket and the folder,
`engine/hardwareUrl.js` for the file — so these are the URLs the browser will
actually ask for.

| what | URL |
| --- | --- |
| runner manifest | `…/object/public/hardware/runners/blum/movento/manifest.json` |
| runner model | `…/object/public/hardware/runners/blum/movento/760H2500S_44182964.glb` |
| hinge manifest | `…/object/public/hardware/hinges/blum/manifest.json` |
| hinge model | `…/object/public/hardware/hinges/blum/173L6100_44724390.glb` |

For comparison, what turn 18/19 asked for and what the owner saw:

| | turn 19 | turn 20 |
| --- | --- | --- |
| runners | `…/public/hardware/**hardware/**runners/blum/movento/…` → **400** | `…/public/hardware/runners/blum/movento/…` |
| hinges | `…/public/hardware/**hardware/**hinges/blum/**cliptop/**…` → **404** | `…/public/hardware/hinges/blum/…` |
| model file | manifest's `file` joined onto the folder → the tree twice | folder + **basename** only |

## The live check — BLOCKED IN THIS ENVIRONMENT, and here is the proof

`node scripts/bucket-live.mjs --json` (raw output committed beside this file as
`bucket-live.json`) could not reach the host. The session's outbound HTTPS goes
through a policy-enforcing egress proxy, and the proxy's own failure log names
the reason:

```
$ curl -sS "$HTTPS_PROXY/__agentproxy/status"
  connect_rejected   gateway answered 403 to CONNECT (policy denial or upstream failure)
                     uhzwyhvwngfnyhxxlvmq.supabase.co:443
```

`/root/.ccr/README.md`, "403 / 407 from the proxy": *"The destination host is
not allowed by your organization's egress policy for this session. Do not retry
or route around it — report the blocked host."* So it is reported, not worked
around, and this turn makes **no claim** that the two manifests answered 200
here.

| family | manifest URL | status | bytes | rows | model HEAD |
| --- | --- | --- | --- | --- | --- |
| MOVENTO 760H | `…/hardware/runners/blum/movento/manifest.json` | **blocked (403 CONNECT)** | — | — | — |
| CLIP top | `…/hardware/hinges/blum/manifest.json` | **blocked (403 CONNECT)** | — | — | — |

### How R2 is satisfied the moment the host is reachable

One command, from any machine that can reach the bucket — the owner's, or a
session whose egress policy allows the host:

```
node scripts/bucket-live.mjs           # exits 0 only when BOTH families are green
```

It asserts exactly what R2 asks for and nothing looser:

* the manifest answers **200**, and parses into **40 runner rows / 19 hinge rows**
  through the app's own parsers (not a second reader written for the script);
* one real model per family answers **200** with **content-length > 10 KB**;
* every URL is built by `profile.js` + `engine/hardwareUrl.js`.

The acceptance walk calls the same function (`checkLiveBucket`) before it
photographs any hardware, records the answer verbatim in `walk.json`, and — when
the host is blocked — records that instead of a green tick it did not earn.

## R3 — the manifests as fixtures, and what they proved

Copied verbatim into `test/fixtures/bucket/` (provenance in the README there:
they are the owner's own uploads as they sit in `reference/hardware/`, **not**
re-fetched in this turn, for the reason above). `test/turn20-f2-bucket.test.js`
runs the shipped parsers over them:

* **40** runner rows parse, all with article numbers, all inheriting the
  header's `system` — turn 18's parser dropped **all forty**, because it wanted
  a `system` on every row and not one row has one;
* **19** hinge rows parse;
* every model URL resolves to `folder + basename`, with the bucket appearing
  exactly once and no `cliptop` level.

## A FOURTH defect, found by reading the pack — reported, not fixed

With the paths corrected the catalogue loads and every URL resolves, and **no
cabinet in the app can still match a row**:

| | ladder |
| --- | --- |
| the owner's MOVENTO pack | 250, 270, 300, 320, 350, 380, 400, 420, 450 |
| the app's nominal length (`wardrobe.drawers.depthSteps`) | 390, 440, 490, 540, 590, 640, 690 |

The intersection is **empty**. `runnerNominalLength()` picks a runner off the
LISP's drawer **box-length** ladder, which is not Blum's NL ladder — so a 558 mm
base unit orders a "490 mm MOVENTO", which is not a runner Blum makes.

It is **not** fixed here, deliberately: which runner a workshop buys is a
purchasing decision, F2 is scoped to display and parsing (*"Fixtures: ZERO"*),
and guessing at it in a display turn is exactly the kind of drift this turn's
rules exist to stop. It is pinned by a test that fails the day it is fixed
(`test/turn20-f2-bucket.test.js`, "the ladder gap … is PINNED, not hidden") and
written up in `BLOCKERS.md`.

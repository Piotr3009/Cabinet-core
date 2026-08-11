# R2 / R4 — the bucket, and the URLs the APP builds

> **R4 (new this turn).** "A URL is proven by asking the APP for it. Turn 20's
> audit fetched hinge models over URLs the VERIFY SCRIPT built for itself —
> correctly — while the app built its own without host or bucket and 404'd on
> the owner's machine. From now on the walk takes the exact URL string out of
> the app's own registry/state and fetches THAT. A verification that
> reconstructs the thing it verifies proves nothing."

## What turn 20 got wrong, in one table

| | turn 20's script | turn 20's app | turn 21 |
| --- | --- | --- | --- |
| hinge model | `…/object/public/hardware/hinges/blum/71B3550_42542984.glb` | `hinges/blum/71B3550_42542984.glb` | the app's own string, taken from `window.__cc.hardware` |
| result | HEAD 200 in the audit | **404 on the owner's machine** | no request at all where there is no host; the real URL where there is |

The script was right and the app was wrong, and the audit could not tell,
because the script had built its own copy of the app's arithmetic. That is R4.

## The two derivations are ONE derivation now

`scripts/bucket-live.mjs → derivedStorageBase()` finds an absolute URL in the
decor pack (its job — it reads the file off disk) and then cuts the host out of
it with **`src/engine/hardwareUrl.js → storageBaseFrom()`** — the very function
`src/lib/storageBase.js` calls to tell the running app where its own bucket is.
The model URL it HEADs is built by **`hardwareModelSrc()`**, the same helper
`engine/hinges.js → hingeModelSrc` and `engine/runners.js → runnerModelSrc` are
each one line over, and the same one `3d/Hardware.jsx` hands the loader.

**Derived host:** `https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public`

## The URLs this turn produces

| what | URL |
| --- | --- |
| runner manifest | `…/object/public/hardware/runners/blum/movento/manifest.json` |
| runner model | `…/object/public/hardware/runners/blum/movento/760H2500S_44182964.glb` |
| hinge manifest | `…/object/public/hardware/hinges/blum/manifest.json` |
| hinge model | `…/object/public/hardware/hinges/blum/71B3550_42542984.glb` |

`test/turn21-f2-hardware-url.test.js` pins the shape of every one of them and
pins that **no** URL is produced at all when there is no host — which is the
whole of the owner's 404.

## The live check — BLOCKED IN THIS ENVIRONMENT, with the proof

`node scripts/bucket-live.mjs --json` (raw output committed beside this file as
`bucket-live.json`) could not reach the host. The session's outbound HTTPS goes
through a policy-enforcing egress proxy, and the proxy answers the request
itself:

```
$ node -e "fetch('https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/manifest.json')…"
{
  "status": 403,
  "deny": "host_not_allowed",
  "body": "Host not in allowlist: uhzwyhvwngfnyhxxlvmq.supabase.co. Add this host to your network egress settings to allow access."
}
```

`/root/.ccr/README.md` — *"The destination host is not allowed by your
organization's egress policy for this session. Do not retry or route around it
— report the blocked host."* So it is reported, not worked around, and no claim
in this turn rests on a byte from that bucket.

**Blocked host: `uhzwyhvwngfnyhxxlvmq.supabase.co`.** Adding it to the
environment's egress allowlist turns this section green with no code change —
`node scripts/bucket-live.mjs` is the whole check.

## What IS proven here, without the bucket

R4's point is not "the file downloads"; it is "the app asks for the right
thing". That is provable offline and is proven three ways:

1. **The composer.** `test/turn21-f2-hardware-url.test.js` — 8 tests: host +
   bucket + folder + basename, one shared helper for both families, the bucket
   appearing exactly once, the manifest's own folder tree never reaching the
   URL, and `null` (never a hostless path) where there is no host.
2. **The registry.** `3d/hardwareRegistry.js` publishes every URL the scene
   actually handed a loader at `window.__cc.hardware`, per surface, with
   `model: true|false` for whether the GLB or the stand-in is what got drawn.
   The walk reads THAT and fetches THAT — never a string of its own.
3. **The walk.** `verify/t21/walk.json`, step `F2` — the URL is read out of the
   registry in the live page, asserted absolute and well-formed, and fetched.
   Its outcome is recorded as it happens; in this environment it is the 403
   above, and the step says so instead of claiming a 200 nobody saw.

## The console (rule R5)

The owner's console found in one paste what three audits missed, so the walk
captures browser console output now and asserts it. `verify/t21/walk.json`
carries the capture; **zero `Failed to load resource` on any hardware path** is
the assertion, and with `hingeModelSrc` returning `null` where there is no host
there is no hardware request to fail.

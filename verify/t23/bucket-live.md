# R2 — the live bucket, turn 23

`node scripts/bucket-live.mjs` — the same script turn 20 wrote and turns 21 and
22 ran, unchanged. Every URL it checks is built by the APP's own code: the host
is derived from the EGGER decor pack that ships in `public/`, the bucket and the
folder come from `profile.js`, and the file name comes from
`engine/hardwareUrl.js`. It hard-codes nothing.

Raw output: `bucket-live.txt` · `bucket-live.json`.

## The verdict in this session: BLOCKED, for the third turn running

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
open a tunnel to the storage host at all:

```
$ curl -sS -o /dev/null -w "%{http_code}\n" \
    https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/71B3550_42542984.glb
curl: (56) CONNECT tunnel failed, response 403
```

119 bytes is the proxy's own refusal page, which is why the script reports a 403
with a body but no rows: nothing from the bucket reached this container.

## What turn 23 does about it — R8

Three turns of hardware work have now been verified by reading code, because
every GLB-dependent phase ended `blocked` here. That is exactly how a hinge came
to hang closed on the carcass for two turns while every walk was green.

So this turn splits the claim in two, and proves both halves:

| claim | proved by | this session |
| --- | --- | --- |
| the FILES are where the app looks for them | **R2** — this script, over the app's own URLs | ✗ blocked by the proxy |
| the RENDERING is right — pose, mirror, swing, finish, and no stray drum | **R8** — the silent showroom, `test/fixtures/hardware-local/` | ✓ 24 walk steps green |

The showroom is synthetic GLBs this repository generates
(`scripts/make-fixture-hardware.mjs`), filling exactly the box measured off the
real 71B3550, served on a separate origin and reached through the documented
`localStorage['cc.hardwareBase']` knob — the TOP slot of `lib/hardwareSource.js`'s
resolution order. **No fixture-only branch exists anywhere in the app**: the
catalogue resolution, the URL composition, the loader, the cache, the clone, the
pose, the mirror, the swing and the finish are all the production path.

No Blum bytes entered the repository, so the licence question (BLOCKERS #75)
stays exactly where it was.

## The one command that closes R2 from a machine that can reach the host

```
node scripts/bucket-live.mjs
node scripts/glb-meshes.mjs --md \
  https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public/hardware/hinges/blum/71B3550_42542984.glb
```

The second one produces the real mesh table for `hinge-meshes.md`, which is the
only part of F3 this container could not read for itself.

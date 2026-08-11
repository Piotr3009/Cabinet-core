# R2 — the live bucket, turn 24

`node scripts/bucket-live.mjs` — the script turn 20 wrote and turns 21, 22 and
23 ran, unchanged. Every URL it checks is built by the APP's own code: the host
comes from the EGGER decor pack that ships in `public/`, the bucket and the
folder from `profile.js`, the file name from `engine/hardwareUrl.js`. It
hard-codes nothing.

Raw output: `bucket-live.txt` · `bucket-live.json`.

## The verdict in this session: BLOCKED, for the fourth turn running

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
$ curl -sS https://uhzwyhvwngfnyhxxlvmq.supabase.co/…/manifest.json
curl: (56) CONNECT tunnel failed, response 403
```

A 403 from Supabase would carry a Supabase body; 119 bytes of proxy error page
is what arrives instead, and no request ever reaches the host. Nothing about the
bucket's contents can be concluded from it, in either direction.

## What that costs, and what it does not

**It costs one thing: a screenshot of the OWNER'S OWN hinge file.** Everything
F1 and F12 claim is claimed about a model this session cannot download.

**It costs nothing else,** because the silent showroom (R8) exists for exactly
this. `scripts/make-fixture-hardware.mjs` writes real GLBs — real glTF 2 binary,
real accessors, real materials — at the measured dimensions of the owner's own
export and, since this turn, **with the real export's own `bau…` node names**
(see `rig-members.md`). They are served on their own origin at
`http://127.0.0.1:4174` and the app is pointed at them through its own
`localStorage['cc.hardwareBase']`, so every hardware step of the walk runs the
production code path over the network, against a file the app has no way of
telling from the bucket's.

What that cannot prove is that the bucket's file has the five nodes the table
says it has. That is the one claim in this turn resting on the owner's own
measurement rather than on a fetch, and `rig-members.md` says so in those words.

## The moment the proxy opens

```
node scripts/bucket-live.mjs
node scripts/glb-meshes.mjs --md https://…/hardware/hinges/blum/71B3550_10001.glb
```

The first re-runs this page. The second drops the real mesh table into
`rig-members.md` beside the synthetic one. Neither needs a code change.

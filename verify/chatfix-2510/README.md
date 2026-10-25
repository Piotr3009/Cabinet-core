# CHAT-FIX 25.10.2026: the free panel stuck to a surface (browser evidence)

Walked 2026-10-25 12:25 UTC on HEAD e37850a2 plus the uncommitted work, against http://127.0.0.1:4173/ (dist/ built from this tree), by scripts/chatfix-2510-attach-walk.mjs. The stage and every attach went through the page's own store (window.__cc.project); the numbers below are read back from that store after each step.

The owner, 25.10.2026: "zebym ja mogl go przykleic do tej powierzchni jakiej chce", "chce tez oblozyc boxy lub kominy tez prosze z odsunieciem od nich", "3 nie jedzie", "naprzyklad bede chcial polozyc na szafkach jako daszek albo oblozyc komin w kacie".

## The stage

- Room 5000 x 3000, height 2500 (wall 1 runs along y = 0).
- Chimney on wall 1 at x 2500, 600 wide, 350 deep (addWallSlope).
- BUD at x 600, widened to 800 (legs 100 + carcass 770: top at 870).
- FREE_PANEL at x 3600: 800 long, 400 wide, 18 thick, along the wall, upright, on the floor.

## The frames

### 01-top.png

the panel laid on the BUD's top, gap 0, from the room preset (expect: x 600, mount 870, tilt 90, along, box 800 x 18 x 400)

- attach result: `{"ok":true,"label":"Unit 01, top","clamped":0,"error":null}`
- the panel in the store: `{"wall":0,"x":600,"facing":"along","tilt":90,"mount":870,"inset":0,"box":{"width":800,"height":18,"depth":400}}`

### 01b-top-from-above.png

the same lid on the BUD, the camera turned to look down on it

- attach result: `{"ok":true,"label":"Unit 01, top","clamped":0,"error":null}`
- the panel in the store: `{"wall":0,"x":600,"facing":"along","tilt":90,"mount":870,"inset":0,"box":{"width":800,"height":18,"depth":400}}`

### 02-chimney-front.png

the panel stood in front of the chimney, gap 0 (expect: x 2500, inset 340, tilt 0, along)

- attach result: `{"ok":true,"label":"Chimney on wall 1, front","clamped":0,"error":null}`
- the panel in the store: `{"wall":0,"x":2500,"facing":"along","tilt":0,"mount":0,"inset":340,"box":{"width":800,"height":400,"depth":18}}`

### 03-left-side.png

the panel stood on the BUD's left side, gap 0 (expect: x 582, mount 0, tilt 0, across, box 18 x 400 x 800)

- attach result: `{"ok":true,"label":"Unit 01, left side","clamped":0,"error":null}`
- the panel in the store: `{"wall":0,"x":582,"facing":"across","tilt":0,"mount":0,"inset":0,"box":{"width":18,"height":400,"depth":800}}`

### 04-right-panel.png

the panel selected (through ui.selectUnit); the right panel as it stands, the Attach section on it

- attach result: `{"selected":"u_z31a9o2","attachSection":true}`
- the panel in the store: `{"wall":0,"x":582,"facing":"across","tilt":0,"mount":0,"inset":0,"box":{"width":18,"height":400,"depth":800}}`

## Readings off the page

- the room:

```json
{
  "height": 2500,
  "corners": [
    {
      "x": 0,
      "y": 0
    },
    {
      "x": 5000,
      "y": 0
    },
    {
      "x": 5000,
      "y": 3000
    },
    {
      "x": 0,
      "y": 3000
    }
  ]
}
```

- the chimney (project.wallSlopes):

```json
[
  {
    "id": "chimney_1ttah68",
    "kind": "chimney",
    "wall": 0,
    "x_mm": 2500,
    "width": 600,
    "depth": 350
  }
]
```

- the units [type, number, wall, x, width, height, depth]:

```json
[
  [
    "BUD",
    "01",
    0,
    600,
    800,
    770,
    558
  ],
  [
    "FREE_PANEL",
    "FP01",
    0,
    3600,
    800,
    400,
    18
  ]
]
```

- attachTargetsFor(panel) [key, label]:

```json
[
  [
    "wall",
    "Wall (flush)"
  ],
  [
    "floor",
    "Floor"
  ],
  [
    "ceiling",
    "Ceiling"
  ],
  [
    "unit:u_izh3e3b:left",
    "Unit 01, left side"
  ],
  [
    "unit:u_izh3e3b:right",
    "Unit 01, right side"
  ],
  [
    "unit:u_izh3e3b:top",
    "Unit 01, top"
  ],
  [
    "obstacle:chimney_1ttah68:front",
    "Chimney on wall 1, front"
  ],
  [
    "obstacle:chimney_1ttah68:left",
    "Chimney on wall 1, left side"
  ],
  [
    "obstacle:chimney_1ttah68:right",
    "Chimney on wall 1, right side"
  ]
]
```

- the panel before any attach:

```json
{
  "wall": 0,
  "x": 3600,
  "facing": "along",
  "tilt": 0,
  "mount": 0,
  "inset": 0,
  "box": {
    "width": 800,
    "height": 400,
    "depth": 18
  }
}
```

- the right panel: selectedUnitId:

```json
"u_z31a9o2"
```

- the right panel: an Attach section on the page:

```json
true
```

- the Attach select's options:

```json
[
  "Choose a surface...",
  "Wall (flush)",
  "Floor",
  "Ceiling",
  "Unit 01, left side",
  "Unit 01, right side",
  "Unit 01, top",
  "Chimney on wall 1, front",
  "Chimney on wall 1, left side",
  "Chimney on wall 1, right side"
]
```

Console errors on the page: none.

Result: every attach landed on the expected numbers.

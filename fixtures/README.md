# Golden Fixtures — READ FIRST

These JSON files are the SOURCE OF TRUTH for the calculation engine, computed line-by-line
from the production AutoLISP in reference/lisp/ and pending Piotr's cross-check vs real cut lists.

RULES (absolute):
1. Tests read these files. Engine output must match. If it doesn't — the ENGINE is wrong.
2. NEVER modify expected values, round them, or skip cases to make tests pass.
3. Genuinely blocked / value looks impossible → append to BLOCKERS.md, leave the test RED.
4. Items flagged "verify_with_piotr" are still golden until Piotr says otherwise.

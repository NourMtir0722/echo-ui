# Released `/e/` versions

One file per item version that has been **released**: `{name}@{version}.json`, exactly as it was
served. The `/e/` build copies them into `apps/www/public/e/` before writing the current ones, so a
fresh clone serves every version anyone ever installed.

That is what makes the registry's promise real — "once a URL is public, it stays" — and what a later
`echo-ui-cli update` merges against: the base of the three-way merge is the exact file the user
installed from.

**Nothing is added here by hand.** At release, the pending version's files are copied in and
committed, and from then on the build never rewrites them: an archived version is served as it is,
and an item's latest pointer (`{name}.json`) is a copy of its archived pin. The order, and why, is in
`packages/core/published-core.md`, "Releasing".

What's here today: **0.2.0**, every item exactly as production served it from 2026-10-04 (deployed
from `d481c33`), and **0.3.0**, every item, released 2026-10-12. Every item moved to 0.3.0 because
0.3.0 needs a new core: a version declares one core range, so a new core is a new version of every
item, whose files changed or not.

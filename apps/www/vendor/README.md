# Vendored

`paperlab-0.8.1-scroll-2.tgz` is [Paperlab](https://github.com/NourMtir0722/Paperlab) (Apache-2.0,
its `LICENSE` and `NOTICE` inside) with the `scroll` behavior the homepage's paper uses
(`components/home/blueprint/ScrollPaper.tsx`, `components/home/journey/paper/`). That behavior isn't in
a published Paperlab yet, so the site installs this build from the repository rather than from npm.

When a Paperlab release on npm carries `scroll`, depend on that version instead
(`"paperlab": "^<version>"` in `apps/www/package.json`), run `pnpm install`, and delete this folder.

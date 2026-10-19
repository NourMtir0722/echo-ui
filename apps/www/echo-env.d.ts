/**
 * The type references this app needs, in a file no build tool rewrites.
 *
 * Next regenerates `next-env.d.ts` on every `dev` and `build`, and rewrites
 * its typed-route imports to point at whatever `NEXT_DIST_DIR` that run used —
 * so a tracked copy is dirty after any Playwright run, which is why the
 * working rules used to end with "restore it by hand". It is now ignored by
 * git, and the two references that actually matter live here instead, where
 * they survive a fresh clone that has never run a build.
 */
/// <reference types="next" />
/// <reference types="next/image-types/global" />

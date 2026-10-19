/**
 * What a Vite + React app's `vite-env.d.ts` brings in through `vite/client`
 * that the copied files depend on: stylesheets as side-effect imports. Next's
 * types, through `next-env.d.ts`, declare the same. TypeScript 6 checks side-effect imports,
 * so without it every `import "./x.css"` in a copied component fails here and
 * nowhere real. Nothing else from `vite/client`: the rest would only hide gaps.
 */
declare module "*.css" {}

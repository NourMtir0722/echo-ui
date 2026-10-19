// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      // Any Next dist dir: NEXT_DIST_DIR gives the dev server (.next-dev) and
      // ad-hoc verification builds their own, and linting build output buries
      // real findings under thousands of generated-file errors.
      "**/.next*/**",
      /*
       * The static export, which is what Cloudflare serves. It only
       * exists after a deploy build, so for as long as nobody deployed from a
       * checkout it was never there to be linted — and the first local deploy
       * turned `pnpm lint` into 7,500 errors in minified bundles. Gitignored
       * but not eslint-ignored: the two lists are separate, and this one was
       * missing the entry.
       */
      "**/out/**",
      "**/test-results/**",
      "**/next-env.d.ts",
      "**/public/r/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Plain-JS config files and build scripts run in Node (next.config.mjs
    // reads NEXT_DIST_DIR; mcp/build.mjs reads package.json relative to
    // import.meta.url). no-undef only reaches them because typescript-eslint
    // disables it for .ts.
    // `**/scripts/` rather than `scripts/`: apps/www has its own (the static
    // export's fixture prune), and the root-relative glob did not reach it.
    files: ["**/*.config.{js,mjs,cjs}", "**/build.mjs", "**/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        URL: "readonly",
        console: "readonly",
        // install-app.mjs: fetch waits for the app's server to come up, and
        // setTimeout paces that wait.
        fetch: "readonly",
        setTimeout: "readonly",
        // The same file evaluates functions INSIDE a browser (its --serve step),
        // so these are real globals where those functions run. Nothing in the
        // Node half of the file can reach them.
        document: "readonly",
        getComputedStyle: "readonly",
      },
    },
  },
  {
    // Registered unscoped on purpose: `next build` detects the plugin by
    // calculating the config for eslint.config.js itself, so a block scoped to
    // apps/www would leave it warning that the plugin is missing. Only the
    // registration is global here — the rules below stay scoped.
    plugins: { "@next/next": next },
  },
  {
    // Next's core-web-vitals rules only mean anything inside the Next app,
    // so they stay scoped to apps/www rather than the whole workspace.
    files: ["apps/www/**/*.{js,jsx,ts,tsx}"],
    rules: {
      ...next.configs["core-web-vitals"].rules,
      // apps/www is App Router only — there is no pages/ dir for this rule to
      // resolve against, so it just warns about a missing directory forever.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // The two rules v5's `recommended` held. From v7 `recommended` also
      // carries the React Compiler rules (refs in render, setState in an
      // effect, …); adopting those is its own change, not a version bump.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);

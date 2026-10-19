# echo-ui-core

The design grammar of [Echo UI](https://echo-ui.com): the theme engine, tokens, material,
sound, motion and tactile feedback that every Echo component is built on.

You don't usually install this by hand: every Echo component imports it, so `npx echo-ui-cli init`
installs it when it sets a project up. Install it directly if you use the theme or sound engine on
their own:

```sh
npm install echo-ui-core
```

## What's in it

| Import | What it gives you |
| --- | --- |
| `echo-ui-core/theme` | `createEchoTheme(seed)`: one seed color becomes the full set of `--echo-*` tokens, with WCAG AA contrast guaranteed for any seed, a molded or a drawn device, dark or light. Also the scales, the shadow recipes, and `readability`, `apcaContrast` and `simulate` for readability past AA |
| `echo-ui-core/theme/material.css` | The molded-plastic material recipes |
| `echo-ui-core/sound` | `SoundProvider` and the WebAudio synth that plays Echo's sound tokens |
| `echo-ui-core/motion` | GSAP motion tokens, each with a reduced-motion version |
| `echo-ui-core/tactile` | `useTactile`: motion and sound bound to press and release |
| `echo-ui-core/presence` | `useGsapPresence`: exit animations that finish before Base UI unmounts |
| `echo-ui-core/check` | `EchoCheck`: in development, reports to the console what only the running page shows: colours as rendered, unnamed controls, contrast, a missing setup step, the screen rules, and the design tests (alignment, depth, corners, icons). A production build gets a component that renders nothing |
| `echo-ui-core/types` | The types Echo's components share in their public props (`EchoChangeEvent`, `EchoInterop`), so a component's API names Echo's types, not Base UI's |

## Setup

```tsx
import { createEchoTheme } from "echo-ui-core/theme";
import { SoundProvider } from "echo-ui-core/sound";
import { EchoCheck } from "echo-ui-core/check";

const { css } = createEchoTheme({ accent: "#3D8EF0" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{css}</style>
      </head>
      <body>
        <SoundProvider>{children}</SoundProvider>
        <EchoCheck />
      </body>
    </html>
  );
}
```

Peer dependencies: `react` and `react-dom` 18 or later, and `gsap` 3.

MIT licensed.

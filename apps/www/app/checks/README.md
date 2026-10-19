# Test fixtures

Every route under `/checks`, and `/stress` next to it, exists for the Playwright suite in
`tests/`. They are not documentation and not demos: each one puts components into a situation the
docs pages never do (inside a server component, inside a dialog, wired to a form library, fed
120-character labels) so a test can prove the behaviour holds there.

| Route | What it proves | Driven by |
| --- | --- | --- |
| `axe` | The page tests' axe finds eleven of fourteen mistakes written in raw markup outside Echo's parts, each with its rule, and a control with no name is said once, by Echo's `name`. A route, not a page, so the document's own mistakes (no `lang`, no `<title>`) survive the site's layout | `tests/page-tests.spec.ts` |
| `page-check` | `<EchoCheck />` finds one of each problem it looks for, planted beside parts used properly, and nothing else; a production build carries none of it | `tests/page-check.spec.ts` |
| `app-shell-server` | Compound components work when used from a server component | `tests/app-shell.spec.ts` |
| `app-shell-nested` | A shell embedded inside a bare shell keeps its own sidebar and content column | `tests/app-shell.spec.ts` |
| `calendar` | Calendar's grid and keys, month keys that stop at the limits without losing focus, a booked day, and Arabic right to left | `tests/calendar.spec.ts` |
| `card-row` | A row of Cards in a Grid's list items fills each item and lines up their footer keys at the content's start edge; one fullWidth key spans the footer; Items wrap, and `truncate` keeps one line | `tests/card-row.spec.ts` |
| `date-field` | DateField typed and stepped in three locales and right to left, its limits said in words, an error, disabled and read-only, and the ISO date a form submits | `tests/date-field.spec.ts` |
| `date-picker` | DatePicker: the calendar opened by its key and by Alt+↓ on the chosen day, a choice that closes it and turns the field, Escape, and a disabled one | `tests/date-picker.spec.ts` |
| `design` | The design tests find one of each problem they look for (text cut off, keys out of line, a lone key off its edge, empty columns, a glow, stacked shadows, corners that don't match or don't follow, icons that don't match), planted beside parts used properly, and nothing else | `tests/page-tests.spec.ts` |
| `file-upload` | FileUpload: the tray opens the file dialog and takes a drop; files upload with progress, fail and retry, are cancelled, or are refused by type, size and count; a form submits held files; focus never falls to the page | `tests/file-upload.spec.ts` |
| `forms` | Field and Textarea wire labels, descriptions and errors for screen readers | `tests/forms.spec.ts` |
| `hardware-button-props` | HardwareButton keeps its own class and fill when a caller or a Base UI trigger adds one, and a short-labelled small cap is still a 44px touch target | `tests/hardware-button.spec.ts` |
| `layering` | Every popup that can open inside a dialog stacks above it | `tests/layering.spec.ts` |
| `sound-remount` | A SoundProvider that unmounts closes the AudioContext it opened, so one inside a page leaves nothing running behind it | `tests/sound.spec.ts` |
| `receipt-remount` | A Receipt whose effects run again mid-print (StrictMode, `<Activity>`) still comes out whole | `tests/objects.spec.ts` |
| `react-hook-form` | `register()` works uncontrolled on every control | `tests/react-hook-form.spec.ts` |
| `segmented` | Segmented's keyboard contract, including disabled and right-to-left | `tests/segmented.spec.ts` |
| `server-triggers` | A `trigger` element from a server component becomes the trigger itself | `tests/console.spec.ts` |
| `table` | Table's data mode: sort, selection with select-all, filter, row actions and a row press, two thousand rows windowed, and the loading and empty rows | `tests/table.spec.ts` |
| `toast` | Toasts announce into a live region that was already on the page | `tests/toast.spec.ts` |
| `/stress` | Every text-bearing component survives long content without overflowing | `tests/layout.spec.ts`, via `tests/helpers/layout.ts` |

The static export removes them before deploy (`apps/www/scripts/prune-fixtures.mjs`), so they
are never served on the live site. `registry/scripts/fixture-routes.test.mjs` checks that they stay
unlinked from the site.

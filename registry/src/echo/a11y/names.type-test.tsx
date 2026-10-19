/**
 * Accessible names are required by the types. Compiled by `pnpm typecheck`, never run or shipped.
 *
 * Every `@ts-expect-error` below is a control with no name. If a type is ever
 * loosened so that one of them compiles, the directive goes unused and the
 * typecheck fails, so the requirement can't be dropped without anyone noticing.
 *
 * The Segmented docs preview shipped with no name; it can't now.
 */
import { Checkbox } from "../checkbox";
import { Field } from "../field";
import { HardwareButton } from "../hardware-button";
import { Progress } from "../progress";
import { RadioGroup } from "../radio-group";
import { Segmented } from "../segmented";
import { Select } from "../select";
import { Slider } from "../slider";
import { Switch } from "../switch";
import { Textarea } from "../textarea";

export const unnamed = (
  <>
    {/* @ts-expect-error a switch needs a name */}
    <Switch />
    {/* @ts-expect-error a checkbox needs a name */}
    <Checkbox />
    {/* @ts-expect-error a slider needs a name */}
    <Slider />
    {/* @ts-expect-error a segmented control needs a name */}
    <Segmented options={["A", "B"]} />
    {/* @ts-expect-error a select needs a name */}
    <Select options={[]} />
    {/* @ts-expect-error a progress meter needs a name */}
    <Progress value={0.5} />
    {/* @ts-expect-error a radio group needs a name */}
    <RadioGroup />
    {/* @ts-expect-error a field needs a name */}
    <Field />
    {/* @ts-expect-error a textarea needs a name */}
    <Textarea />
    {/* @ts-expect-error an icon-only button needs a name */}
    <HardwareButton iconOnly icon={<svg />} />
  </>
);

export const named = (
  <>
    <Switch aria-label="Monitor" />
    <Checkbox aria-labelledby="armed" />
    <Slider aria-label="Level" />
    <Segmented aria-label="View" options={["A", "B"]} />
    <Select aria-label="Length" options={[]} />
    <Progress aria-label="Upload" value={0.5} />
    <RadioGroup aria-label="Output" />
    <Field label="Name" />
    <Field aria-label="Search" />
    <Textarea label="Notes" />
    <HardwareButton iconOnly aria-label="Play" icon={<svg />} />
    <HardwareButton>Play</HardwareButton>
  </>
);

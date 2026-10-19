"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Checkbox } from "@registry/echo/checkbox";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Select } from "@registry/echo/select";
import { Switch } from "@registry/echo/switch";
import { Textarea } from "@registry/echo/textarea";

/**
 * Proof that `react-hook-form` integrates UNCONTROLLED.
 *
 * This is a test fixture, not a demo. `register()` is the uncontrolled path —
 * it hands a control a `ref`, an `onBlur`, a `name` and an `onChange` and then
 * reads the value straight off the DOM node. Before the interop set, that
 * could not work with any Echo control: four of 49 could take a ref and `onBlur` was in zero
 * public prop types. `tests/react-hook-form.spec.ts` drives this page.
 *
 * `shouldFocusError` is the half that would fail SILENTLY. It calls `.focus()`
 * on the ref the control handed back, so a control whose ref is never
 * populated simply does not get focused, with no error anywhere — which is
 * exactly what a plain `ref` prop does on React 18. Submitting this form empty
 * has to land focus on the first invalid field, and the spec asserts it.
 */
interface Values {
  email: string;
  bio: string;
  plan: string;
  terms: boolean;
  alerts: boolean;
}

export default function ReactHookFormFixture() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ shouldFocusError: true, mode: "onSubmit" });

  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>react-hook-form, uncontrolled</h1>

      <form
        onSubmit={handleSubmit((values) => setSubmitted(JSON.stringify(values)))}
        noValidate
      >
        {/*
          Each control is spread from `register()`. That spread IS the test:
          it carries `ref`, `onBlur`, `onChange` and `name`, and every one of
          them has to be a prop the control accepts, or this does not compile.
        */}
        <Field
          label="Email"
          type="email"
          data-testid="email"
          {...register("email", { required: true })}
        />
        {errors.email && <p data-testid="email-error">Email is required</p>}

        <Textarea
          label="Bio"
          data-testid="bio"
          {...register("bio", { required: true })}
        />
        {errors.bio && <p data-testid="bio-error">Bio is required</p>}

        {/*
          THE SECOND PATH, and the honest one for these three.

          `register()` works end to end for a text control: react-hook-form
          reads the value straight off the input it was handed a ref to. It
          cannot do that for a Select, a Checkbox or a Switch, because their
          change event is `onValueChange`/`onCheckedChange` rather than a DOM
          `onChange`, and the ref points at the focusable trigger rather than
          at a hidden input carrying the value. That is true of every headless
          library with compound controls — Radix, MUI and Base UI itself all
          document `Controller` for exactly this.

          What the interop set bought them is still the half that was missing: `ref`, so
          `shouldFocusError` can focus them, and `onBlur`, so a touched-mode
          validation fires. Before it, neither existed and neither path worked.
        */}
        <Controller
          name="plan"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select
              aria-label="Plan"
              data-testid="plan"
              options={[
                { value: "", label: "Choose…" },
                { value: "studio", label: "Studio" },
                { value: "team", label: "Team" },
              ]}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              onValueChange={field.onChange}
            />
          )}
        />

        <label>
          <Controller
            name="terms"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Checkbox
                aria-label="I agree to the terms"
                data-testid="terms"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          I agree to the terms
        </label>

        <label>
          <Controller
            name="alerts"
            control={control}
            render={({ field }) => (
              <Switch
                aria-label="Send me alerts"
                data-testid="alerts"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          Send me alerts
        </label>

        <HardwareButton type="submit" variant="primary" data-testid="submit">
          Save
        </HardwareButton>
      </form>

      {submitted && <pre data-testid="submitted">{submitted}</pre>}
    </main>
  );
}

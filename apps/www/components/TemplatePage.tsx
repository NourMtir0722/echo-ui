"use client";

/**
 * The templates surface.
 *
 * A template is shown RUNNING, at its real size, with the install line and the
 * "what this proves" note under it. A screenshot would defeat the point twice
 * over: these screens exist to demonstrate press feel and sound, neither of
 * which survives a PNG, and the composition gate only works if the composed
 * screen is actually rendering.
 *
 * The console renders its own AppShell, which owns a `<main>` — so it is shown
 * inside a bordered frame rather than inline, and the shell is told it is
 * `embedded` so the page keeps exactly one main landmark.
 *
 * Both take what they show from their server page, never from the templates
 * manifest: the manifest reads two metas, and a meta brings zod, which has no
 * business in the browser.
 */
import type { ReactNode } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import "echo-ui-core/theme/material.css";
import { ConsoleScreen } from "@registry/echo/console";
import { ChatScreen } from "@registry/echo/chat";
import { InstallCommand } from "@/components/InstallCommand";
import type { TemplateItem } from "@/components/templates-manifest";
import "./templates.css";

const SCREENS: Record<string, ReactNode> = {
  console: <ConsoleScreen embedded />,
  chat: <ChatScreen embedded />,
};

export function TemplatePage({ entry }: { entry: TemplateItem }) {
  return (
    <SoundProvider>
      <div className="echo-tpl">
        <header className="echo-tpl__head">
          <p className="echo-tpl__eyebrow">Template</p>
          <h1 className="echo-tpl__title">{entry.title}</h1>
          <p className="echo-tpl__proves">{entry.proves}</p>
        </header>

        <h2 className="echo-tpl__label">Install</h2>
        <InstallCommand item={entry.name} />
        <p className="echo-tpl__note">
          A block pulls in every component it uses, so this one command installs the screen and its
          parts. Nothing here is template-only code — each part is its own registry item.
        </p>

        <h2 className="echo-tpl__label">Running</h2>
        <div className="echo-tpl__stage" data-testid="template-stage" data-full={entry.fullBleed ? "" : undefined}>
          {SCREENS[entry.slug]}
        </div>
      </div>
    </SoundProvider>
  );
}

/** `children` is the list, rendered by the server page. */
export function TemplatesIndex({ children }: { children: ReactNode }) {
  return (
    <SoundProvider>
      <div className="echo-tpl">
        <header className="echo-tpl__head">
          <p className="echo-tpl__eyebrow">Templates</p>
          <h1 className="echo-tpl__title">Whole screens</h1>
          <p className="echo-tpl__proves">
            Each one is built from shipped components and installs in a single command. They
            exist to answer questions a component page cannot: whether the press has a feel, whether
            the controls cohere in a crowd, and whether the material language survives density.
          </p>
        </header>

        {children}
      </div>
    </SoundProvider>
  );
}

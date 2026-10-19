"use client";

/**
 * /supporters/welcome: where Stripe brings a supporter right after they pay,
 * with their Checkout Session's ID in the address (`?session_id=`). The page
 * asks the supporters server whether that's a paid session, then takes the
 * name for their Echo and up to two links, both optional, so paying itself
 * stays an email and a card.
 *
 * Anyone can open the page; only a paid session can send anything from it
 * (apps/supporters-api checks it with Stripe). Without one, it says what the
 * page is for and leads to /support. What's sent is on the island at once,
 * and the page leads to their own place on it. The same link comes in the
 * thank-you email the server sends after each payment (apps/supporters-api,
 * thanks.ts), for whoever never got here, and for changing it later.
 */
import { useEffect, useState, type FormEvent } from "react";
import "echo-ui-core/theme/material.css";
import { SoundProvider } from "echo-ui-core/sound";
import { AppShell } from "@registry/echo/app-shell";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Panel } from "@registry/echo/panel";
import { TopNavLinks, Wordmark } from "@/components/site/SiteTopBar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { BigTitle } from "@/components/home/BigTitle";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { SUPPORT_EMAIL } from "@registry/agent/guidance";
import { supportersApi } from "./api";
import { clean, NAME_MAX, type Clean } from "./submission";
import "@/components/home/home.css";
import "./welcome.css";

/** What they sent, as the server kept it, with their place's id (none for something kept before places had one). */
type Saved = Clean & { id?: string | null };

type State =
  | { at: "checking" }
  | { at: "none" }
  | { at: "unpaid" }
  | { at: "down" }
  | { at: "form"; plan: "monthly" | "once"; saved: Saved | null; shown: boolean; times: number }
  | { at: "saved"; plan: "monthly" | "once"; saved: Saved; shown: boolean; times: number };

async function ask(
  path: string,
  body: object,
): Promise<{ status: number; data: { ok: boolean; reason?: string; plan?: "monthly" | "once"; saved?: Saved | null; shown?: boolean; times?: number; problems?: string[] } }> {
  const response = await fetch(`${supportersApi()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => ({ ok: false })) };
}

export function Welcome() {
  const [state, setState] = useState<State>({ at: "checking" });
  const [session, setSession] = useState("");
  const [name, setName] = useState("");
  const [links, setLinks] = useState(["", ""]);
  const [problems, setProblems] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("session_id") ?? "";
    setSession(id);
    if (!id) return setState({ at: "none" });
    ask("/supporter/session", { session: id })
      .then(({ data }) => {
        if (data.ok && data.plan) {
          const shown = data.shown !== false;
          const times = data.times ?? 1;
          // Back again, with a place already theirs: their Echo, and the way to change it. (Something kept before
          // places had an id isn't on the island yet: its form, filled in, puts it there.)
          setState(data.saved?.id ? { at: "saved", plan: data.plan, saved: data.saved, shown, times } : { at: "form", plan: data.plan, saved: data.saved ?? null, shown, times });
          if (data.saved) {
            setName(data.saved.name);
            setLinks([data.saved.links[0]?.href ?? "", data.saved.links[1]?.href ?? ""]);
          }
        } else setState({ at: data.reason === "unpaid" ? "unpaid" : data.reason === "unknown" ? "none" : "down" });
      })
      .catch(() => setState({ at: "down" }));
  }, []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (state.at !== "form" && state.at !== "saved") return;
    const checked = clean({ name, links });
    if (!checked.ok) return setProblems(checked.problems);
    setProblems([]);
    setSending(true);
    try {
      const { data } = await ask("/supporter/save", { session, name, links });
      if (data.ok && data.saved) setState({ at: "saved", plan: state.plan, saved: data.saved, shown: data.shown !== false, times: data.times ?? state.times });
      else if (data.problems) setProblems(data.problems);
      else setState({ at: "down" });
    } catch {
      setState({ at: "down" });
    } finally {
      setSending(false);
    }
  };

  const place = (plan: "monthly" | "once") => (plan === "monthly" ? "in the village round the hill" : "out in the meadows");

  return (
    <SoundProvider>
      <AppShell bare>
        <AppShell.Rail label="Site" brand={<Wordmark />}>
          <TopNavLinks opening={LANDING_SEED} />
        </AppShell.Rail>
        <AppShell.Content>
          <div className="wl" aria-busy={state.at === "checking"}>
            {state.at === "checking" && <p className="wl__lede" role="status">One moment, checking your payment…</p>}

            {(state.at === "form" || state.at === "saved") && (
              <>
                <BigTitle as="h1" id="wl-h" title="Thank you." size="section" align="stack">
                  Your support keeps Echo free for everyone.{" "}
                  {state.at === "saved" && state.shown
                    ? `Your Echo lives on the island now, ${place(state.plan)}.`
                    : `Your Echo has a place waiting on the island, ${place(state.plan)}.`}
                </BigTitle>
                <Panel className="wl__panel">
                  {state.at === "saved" ? (
                    state.shown ? (
                      <div className="wl__done" role="status">
                        <h2 className="wl__h2">Your Echo is on the island</h2>
                        <p>
                          <strong>{state.saved.name}</strong>
                          {state.saved.links.length > 0 && <> with {state.saved.links.map((l) => new URL(l.href).hostname.replace(/^www\./, "")).join(" and ")}</>}, with a link of
                          its own to share.
                          {state.times > 1 && <> Its card says you&rsquo;ve supported Echo {state.times === 2 ? "twice" : `${state.times} times`}.</>}
                        </p>
                        <div className="wl__keys">
                          <HardwareButton variant="primary" href={state.saved.id ? `/supporters#${state.saved.id}` : "/supporters"}>
                            See your Echo
                          </HardwareButton>
                          <HardwareButton variant="neutral" onClick={() => setState({ at: "form", plan: state.plan, saved: state.saved, shown: state.shown, times: state.times })}>
                            Change it
                          </HardwareButton>
                        </div>
                      </div>
                    ) : (
                      <div className="wl__done" role="status">
                        <h2 className="wl__h2">Your Echo is off the island</h2>
                        <p>
                          Noor has taken it off for now. To ask about it, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                        </p>
                      </div>
                    )
                  ) : (
                    <form className="wl__form" onSubmit={send} noValidate>
                      <h2 className="wl__h2">Put your Echo on the island</h2>
                      <Field
                        label="Name for your Echo"
                        description={`As you want it shown: your name, a handle or your company. Up to ${NAME_MAX} characters.`}
                        value={name}
                        onValueChange={setName}
                        autoComplete="nickname"
                      />
                      <Field
                        label="A link"
                        description="Optional: X, LinkedIn, YouTube or your website."
                        value={links[0]}
                        onValueChange={(v) => setLinks([v, links[1]!])}
                        type="url"
                        autoComplete="url"
                      />
                      <Field label="A second link" description="Optional." value={links[1]} onValueChange={(v) => setLinks([links[0]!, v])} type="url" />
                      {problems.length > 0 && (
                        <ul className="wl__problems" role="alert">
                          {problems.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      )}
                      <div className="wl__keys">
                        <HardwareButton variant="primary" type="submit" loading={sending}>
                          {state.saved ? "Save my Echo" : "Put my Echo on the island"}
                        </HardwareButton>
                        <a className="wl__skip" href="/supporters">
                          Not now
                        </a>
                      </div>
                      <p className="wl__note">
                        Shown publicly on the island as soon as you press the key, with an Echo whose colour Echo chooses. To change it later,
                        use the link in your thank-you email; to take it down, write to{" "}
                        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                      </p>
                    </form>
                  )}
                </Panel>
              </>
            )}

            {state.at === "none" && (
              <>
                <BigTitle as="h1" id="wl-h" title="For supporters." size="section" align="stack">
                  Right after someone supports Echo, this is where they put their Echo on the island. Supporting starts on the support page.
                </BigTitle>
                <div className="wl__keys">
                  <HardwareButton variant="primary" href="/support">
                    Support Echo
                  </HardwareButton>
                  <a className="wl__skip" href="/supporters">
                    Visit the island
                  </a>
                </div>
              </>
            )}

            {state.at === "unpaid" && (
              <>
                <BigTitle as="h1" id="wl-h" title="Almost there." size="section" align="stack">
                  This payment hasn&rsquo;t gone through yet. Once it has, open this page again from the same link, or write to{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and Noor will put your Echo on the island.
                </BigTitle>
              </>
            )}

            {state.at === "down" && (
              <>
                <BigTitle as="h1" id="wl-h" title="Thank you." size="section" align="stack">
                  This page can&rsquo;t reach Echo&rsquo;s server right now. If you&rsquo;ve just supported Echo, try again in a minute: the
                  thank-you email you got after paying has this page&rsquo;s link.
                </BigTitle>
              </>
            )}
          </div>
          <HomeFooter />
        </AppShell.Content>
      </AppShell>
    </SoundProvider>
  );
}

"use client";

/**
 * The Manual install tab: what `npx echo-ui-cli add` would have done, as steps
 * a person can do by hand.
 *
 * File sources are fetched from the built registry item (/e/<name>.json) when
 * the tab opens, not bundled into the page: that JSON is exactly what the CLI
 * downloads, so what is shown here cannot differ from what the CLI writes, and
 * the 54 pages do not each carry their component's source until someone asks.
 */
import { useEffect, useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import type { DocPageData } from "@/components/docs-server";

type Sources = { state: "loading" } | { state: "error" } | { state: "ok"; files: Map<string, string> };

export function ManualInstall({ item, manual }: { item: string; manual: DocPageData["manual"] }) {
  const [sources, setSources] = useState<Sources>({ state: "loading" });
  // `/e/` drops the `echo-` prefix registry.json gives every item.
  const url = `/e/${item.replace(/^echo-/, "")}.json`;

  useEffect(() => {
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { files: { path: string; content?: string }[] }) => {
        if (!live) return;
        setSources({
          state: "ok",
          files: new Map(json.files.map((f) => [f.path, f.content ?? ""])),
        });
      })
      .catch(() => live && setSources({ state: "error" }));
    return () => {
      live = false;
    };
  }, [url]);

  const { dependencies, registryDependencies, files } = manual;

  return (
    <ol className="doc-steps">
      {dependencies.length > 0 && (
        <li>
          <p>Install the npm dependencies.</p>
          <CodeBlock code={`npm install ${dependencies.join(" ")}`} label="sh" copyLabel="install command" />
        </li>
      )}
      {registryDependencies.length > 0 && (
        <li>
          <p>Add the Echo items it builds on first — each page has its own Manual tab.</p>
          <ul className="doc-deps">
            {registryDependencies.map((d) =>
              d.slug ? (
                <li key={d.name}>
                  <a href={`/docs/${d.slug}`}>
                    <code>{d.name}</code>
                  </a>
                </li>
              ) : (
                <li key={d.name}>
                  <code>{d.name}</code>
                </li>
              ),
            )}
          </ul>
        </li>
      )}
      <li>
        <p>
          Copy {files.length === 1 ? "this file" : `these ${files.length} files`} into your Echo folder at the
          paths shown, so the relative imports between items resolve.
        </p>
        {sources.state === "loading" && (
          <p className="doc-muted" role="status">
            Loading the source…
          </p>
        )}
        {sources.state === "error" && (
          <p className="doc-muted">
            The source could not be loaded here. It is in <a href={url}>{url}</a>, under <code>files</code>.
          </p>
        )}
        {sources.state === "ok" &&
          files.map((path) => (
            <CodeBlock key={path} label={path} code={sources.files.get(path) ?? ""} copyLabel={path} />
          ))}
      </li>
    </ol>
  );
}

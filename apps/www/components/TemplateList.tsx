/**
 * The templates as a ruled index — used by /templates and the homepage.
 *
 * It replaced a grid of grey cards, each holding the full "what this proves"
 * paragraph. Every Echo control is already a molded, lit object; a card under
 * each entry was a second material competing with the one that matters, and
 * the paragraphs made the list unreadable as a list. The rows take their shape
 * from the old ECHO landing's stat strip: hairlines, a large name, one line.
 * The full note still lives on each template's own page.
 */
import { installCommand } from "@registry/agent/guidance";
import { COMING_SOON, TEMPLATES } from "@/components/templates-manifest";
import "./template-list.css";

export function TemplateList({
  withInstall = false,
  withComingSoon = false,
}: {
  withInstall?: boolean;
  /** Also name the templates on their way, as rows that go nowhere yet. */
  withComingSoon?: boolean;
}) {
  return (
    <ol className="echo-tlist">
      {TEMPLATES.map((t, i) => (
        <li key={t.slug} className="echo-tlist__row">
          <span className="echo-tlist__num" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="echo-tlist__body">
            <a className="echo-tlist__name" href={`/templates/${t.slug}`}>
              {t.title}
            </a>
            <p className="echo-tlist__tag">{t.tagline}</p>
          </div>
          {withInstall && <code className="echo-tlist__cmd">{installCommand(t.name)}</code>}
          <span className="echo-tlist__go" aria-hidden="true">
            →
          </span>
        </li>
      ))}
      {withComingSoon
        ? COMING_SOON.map((title, i) => (
            <li key={title} className="echo-tlist__row" data-soon="">
              <span className="echo-tlist__num" aria-hidden="true">
                {String(TEMPLATES.length + i + 1).padStart(2, "0")}
              </span>
              <div className="echo-tlist__body">
                <span className="echo-tlist__name">{title}</span>
              </div>
              <span className="echo-tlist__soon">Coming soon</span>
            </li>
          ))
        : null}
    </ol>
  );
}

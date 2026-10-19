/**
 * Echo's repository, and whether a visitor can open it. A link to a private
 * repository is a 404 for everyone but its owner, so every link to it waits on
 * REPO_PUBLIC. It's on for launch (the GitHub key beside X),
 * and the deploy refuses while GitHub still answers a visitor with a 404
 * (scripts/repo-public.mjs): make the repository public, then deploy.
 */
export const REPO_URL = "https://github.com/NourMtir0722/echo-ui";

export const REPO_PUBLIC = true;

/** Where a bug is reported: the repository's issues once it's public, the contact page until then. */
export const BUG_REPORT_URL = REPO_PUBLIC ? `${REPO_URL}/issues` : "/contact";

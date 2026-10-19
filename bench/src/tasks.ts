/**
 * The fixed tasks, written the way a solo builder types them into an agent.
 *
 * The same words go to every setup, so they never name a library: what the
 * benchmark measures is whether the project itself tells the agent how it is
 * built. Change a prompt and every earlier number stops being comparable, so
 * a new wording is a new task id, never an edit.
 */
export interface Task {
  id: string;
  title: string;
  prompt: string;
  /** The page the task asks for. Every other page the agent adds is scored too. */
  route: string;
}

export const TASKS: readonly Task[] = [
  {
    id: "settings",
    title: "A settings page with a form",
    route: "/settings",
    prompt:
      "Add a settings page at /settings. It needs a form where people can change their display name and email, turn email notifications and the weekly digest on or off, and pick how often they get reminders (daily, weekly or never). Put a save button at the bottom that shows a message when the settings are saved. Make it look good and match the rest of the app.",
  },
  {
    id: "dashboard",
    title: "A dashboard with stats and a table",
    route: "/dashboard",
    prompt:
      "Build a dashboard at /dashboard. At the top, four stat cards: revenue, active users, churn rate and MRR growth, each with a change from last month. Below them, a table of the ten most recent orders with customer, amount, status and date. Use made-up data. Make it look good and match the rest of the app.",
  },
  {
    id: "pricing",
    title: "A pricing page",
    route: "/pricing",
    prompt:
      "Make a pricing page at /pricing with three plans: Free, Pro and Team. Add a monthly/yearly switch that changes the prices (yearly is 20% cheaper), a list of features for each plan, and a sign-up button on each one. Highlight Pro as the most popular. Make it look good and match the rest of the app.",
  },
];

export function taskById(id: string): Task {
  const task = TASKS.find((t) => t.id === id);
  if (!task) throw new Error(`No task "${id}". Tasks: ${TASKS.map((t) => t.id).join(", ")}.`);
  return task;
}

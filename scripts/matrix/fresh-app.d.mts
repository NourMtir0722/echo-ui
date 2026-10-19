/** Types for fresh-app.mjs, for the TypeScript that imports it (the agent benchmark). */
import type { SpawnOptions } from "node:child_process";

export declare const repoRoot: string;

export declare function run(command: string, args: string[], options?: SpawnOptions & { quiet?: boolean }): Promise<void>;

export declare function installArgs(pm: string, packages: string[], dev?: boolean): string[];

export declare function install(
  pm: string,
  cwd: string,
  packages: string[],
  options?: { dev?: boolean; quiet?: boolean },
): Promise<void>;

export declare function packEcho(into: string, options?: { quiet?: boolean }): Promise<string[]>;

export declare const NEXT_FILES: Record<string, string>;
export declare const VITE_FILES: Record<string, string>;
export declare function writeHookProbe(root: string): Promise<{ path: string; remove: () => Promise<void> }>;

export declare const TSCONFIG: { compilerOptions: Record<string, unknown>; include: string[] };

export declare function writeApp(
  root: string,
  options?: { framework?: "next" | "vite"; name?: string; files?: Record<string, string>; paths?: Record<string, string[]> },
): Promise<void>;

export declare function installBase(
  root: string,
  options?: { pm?: string; framework?: "next" | "vite"; react?: string; tailwind?: boolean; quiet?: boolean },
): Promise<void>;

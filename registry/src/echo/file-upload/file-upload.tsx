"use client";

/**
 * FileUpload. A recessed tray you press to choose files, or drop them on:
 * it's a button that opens the file dialog, and its inner edge lights while
 * files are dragged over it. Each file becomes a row with its name, its size
 * and what's happening to it, a Progress strip while it goes up, and a key
 * to cancel, retry or remove it. It wears Field's frame: the label over it,
 * the help and the error under it.
 *
 * It has no upload code of its own. Give it `upload`, and it calls it for
 * each file with a way to report progress and a signal that aborts; the row
 * shows what the handler reports, and a failure shows the error's message.
 * Without `upload`, it holds the files, and a form submits them under `name`.
 *
 * `accept`, `maxSize` and `maxFiles` are checked as files arrive: a file
 * that doesn't fit stays as a row that says why, in words, and is never
 * uploaded. What happens to each file is said aloud.
 */
import { forwardRef, useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { HardwareButton } from "../hardware-button";
import { Progress } from "../progress";
import { useControlSize, type ControlSize } from "../size";
import "../field/field.css";
import "./file-upload.css";

export type UploadStatus = "uploading" | "done" | "added" | "error";

export interface UploadItem {
  id: string;
  file: File;
  /** `uploading`, `done` once `upload` resolves, `added` when there's no `upload`, `error` when it failed or was refused. */
  status: UploadStatus;
  /** 0 to 1 while uploading, as the handler reports it. */
  progress?: number;
  /** What went wrong, in words. */
  error?: string;
}

interface FileUploadOwnProps extends EchoInterop {
  /** The file types it takes, as a file input's `accept`: "image/*", ".pdf", "text/csv". */
  accept?: string;
  /** Take more than one file. */
  multiple?: boolean;
  /** The largest file it takes, in bytes. A bigger one is refused, and says why. */
  maxSize?: number;
  /** How many files it holds at most. */
  maxFiles?: number;
  /**
   * Uploads one file. Call `report` with 0 to 1 as it goes, stop when
   * `signal` aborts (a cancel, or the field going away), resolve when it's
   * done, and throw to fail: the error's message is shown on its row.
   */
  upload?: (file: File, report: (progress: number) => void, signal: AbortSignal) => Promise<void>;
  /** Called with every row whenever one changes: added, progressing, done, failed or removed. */
  onFilesChange?: (files: UploadItem[]) => void;
  /** Row height on the control scale. Defaults to the nearest SizeProvider's size. */
  size?: ControlSize;
  /** Help under the tray: what it takes, and how much. */
  description?: ReactNode;
  /** What's wrong, in words. While it's set, the field is invalid. */
  error?: string;
  /** Ids of other text that describes the tray. */
  "aria-describedby"?: string;
  /** Whose words for sizes ("2.4 MB"), as a BCP 47 tag. Default: the browser's. */
  locale?: string;
}

/** A file upload has a name: a visible `label`, or `aria-label` / `aria-labelledby`. */
type FileUploadName =
  | { label: string; "aria-label"?: string; "aria-labelledby"?: string }
  | { "aria-label": string; label?: string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; label?: string; "aria-label"?: string };

export type FileUploadProps = FileUploadOwnProps & FileUploadName;

/** Whether `file` is one of the types an `accept` string names, as a file input reads it. */
export function accepts(file: { name: string; type: string }, accept?: string): boolean {
  if (!accept?.trim()) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .some((t) => (t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t));
}

/** A size in words: "2.4 MB", "830 kB", "12 bytes". */
export function sizeInWords(bytes: number, locale?: string): string {
  const [unit, by] =
    bytes >= 1e9 ? ["gigabyte", 1e9] : bytes >= 1e6 ? ["megabyte", 1e6] : bytes >= 1e3 ? ["kilobyte", 1e3] : ["byte", 1];
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 1 }).format(bytes / by);
}

const TrayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 14v3.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V14" />
  </svg>
);
const CrossIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden>
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const RetryIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M13 8a5 5 0 1 1-1.6-3.7M13 3v3h-3" />
  </svg>
);

/**
 * `forwardRef`, as every control is, for React 18. The ref lands on the
 * tray: the button a form library focuses when the field has an error.
 */
export const FileUpload = forwardRef<HTMLButtonElement, FileUploadProps>(function FileUpload(
  {
    label,
    accept,
    multiple,
    maxSize,
    maxFiles,
    upload,
    onFilesChange,
    size: ownSize,
    description,
    error,
    locale,
    id,
    name,
    disabled,
    // Accepted with the interop set, and meaningless on a tray, as on a button: a form
    // that needs a file checks for one and says so in `error`.
    required: _required,
    readOnly,
    autoFocus,
    onBlur,
    onFocus,
    onKeyDown,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    ...interop
  },
  ref,
) {
  const size = useControlSize(ownSize);
  const sound = useSoundOptional();
  const [rows, setRows] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [said, setSaid] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const tray = useRef<HTMLButtonElement | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const serial = useRef(0);
  const off = disabled || readOnly;

  // Tell the owner what the rows are, whenever they change (not as the field first draws).
  const told = useRef(false);
  useEffect(() => {
    if (!told.current) {
      told.current = true;
      return;
    }
    onFilesChange?.(rows);
    // Only the rows: a new callback each render isn't a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Nothing keeps uploading after the field has gone.
  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((c) => c.abort());
  }, []);

  // Without `upload`, the file input holds the files, so a form submits them.
  useEffect(() => {
    if (upload || !name || !input.current || typeof DataTransfer === "undefined") return;
    const held = new DataTransfer();
    for (const row of rows) if (row.status === "added") held.items.add(row.file);
    input.current.files = held.files;
  }, [rows, upload, name]);

  const change = (rowId: string, patch: Partial<UploadItem>) =>
    setRows((all) => all.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));

  const start = (row: UploadItem) => {
    if (!upload) return;
    const controller = new AbortController();
    controllers.current.set(row.id, controller);
    let last = -1;
    const report = (p: number) => {
      const next = Math.max(0, Math.min(1, p));
      // Only a step the strip can show: a handler may report hundreds of times a second.
      if (Math.round(next * 100) === last) return;
      last = Math.round(next * 100);
      change(row.id, { progress: next });
    };
    upload(row.file, report, controller.signal).then(
      () => {
        controllers.current.delete(row.id);
        if (controller.signal.aborted) return;
        change(row.id, { status: "done", progress: 1 });
        setSaid(`${row.file.name} uploaded.`);
      },
      (reason: unknown) => {
        controllers.current.delete(row.id);
        if (controller.signal.aborted) return;
        const message = reason instanceof Error && reason.message ? reason.message : "The upload failed.";
        change(row.id, { status: "error", error: message });
        sound?.play("error");
        setSaid(`${row.file.name} didn't upload: ${message}`);
      },
    );
  };

  const add = (files: File[]) => {
    if (off || files.length === 0) return;
    const taken = multiple ? files : files.slice(0, 1);
    // New files clear the old refusals (a refused row has no progress; a failed upload keeps its retry).
    const kept = multiple ? rows.filter((r) => r.status !== "error" || r.progress !== undefined) : [];
    let room = maxFiles ? maxFiles - kept.filter((r) => r.status !== "error").length : Infinity;
    const arriving: UploadItem[] = taken.map((file) => {
      const refused = !accepts(file, accept)
        ? `${file.name} isn't a type this takes.`
        : maxSize !== undefined && file.size > maxSize
          ? `${file.name} is ${sizeInWords(file.size, locale)}; the most it takes is ${sizeInWords(maxSize, locale)}.`
          : room <= 0
            ? `${file.name} is one too many: it takes ${maxFiles} at most.`
            : undefined;
      if (!refused) room--;
      serial.current += 1;
      return { id: `f${serial.current}`, file, status: refused ? "error" : upload ? "uploading" : "added", error: refused, progress: refused || !upload ? undefined : 0 };
    });
    if (!multiple) controllers.current.forEach((c) => c.abort());
    setRows([...kept, ...arriving]);
    const refusedCount = arriving.filter((r) => r.status === "error").length;
    sound?.play(refusedCount ? "error" : "select");
    setSaid(
      arriving
        .map((r) => (r.error ? r.error : `${r.file.name} added.`))
        .join(" "),
    );
    for (const row of arriving) if (row.status === "uploading") start(row);
  };

  const remove = (row: UploadItem, key: HTMLElement) => {
    // A key that goes with its row can't keep focus: the tray takes it.
    if (key.contains(document.activeElement)) tray.current?.focus();
    controllers.current.get(row.id)?.abort();
    controllers.current.delete(row.id);
    setRows((all) => all.filter((r) => r.id !== row.id));
    setSaid(row.status === "uploading" ? `${row.file.name} cancelled.` : `${row.file.name} removed.`);
  };

  const retry = (row: UploadItem) => {
    const again = { ...row, status: "uploading" as const, progress: 0, error: undefined };
    change(row.id, again);
    setSaid(`${row.file.name} uploading again.`);
    start(again);
  };

  // Drag and drop: the tray lights while files are over it. A child entering
  // and leaving would flicker it, so it counts.
  const depth = useRef(0);
  const carriesFiles = (event: DragEvent) => [...event.dataTransfer.types].includes("Files");
  const onDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    if (off || !carriesFiles(event)) return;
    event.preventDefault();
    depth.current += 1;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (off || !carriesFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = () => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    if (off) return;
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    add([...event.dataTransfer.files]);
  };

  const ownId = useId();
  const labelId = `${ownId}-label`;
  const descriptionId = `${ownId}-description`;
  const errorId = `${ownId}-error`;
  const labelledBy = [label ? labelId : undefined, ariaLabelledby].filter(Boolean).join(" ") || undefined;
  const describedBy = [description != null ? descriptionId : undefined, error ? errorId : undefined, ariaDescribedby].filter(Boolean).join(" ") || undefined;
  const statusOf = (row: UploadItem) =>
    row.status === "error"
      ? row.error
      : row.status === "done"
        ? "Uploaded"
        : row.status === "added"
          ? sizeInWords(row.file.size, locale)
          : `Uploading, ${Math.round((row.progress ?? 0) * 100)}%`;

  return (
    <div
      id={id}
      className="echo-field echo-file-upload"
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      data-invalid={error ? "" : undefined}
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-disabled={disabled || undefined}
      {...interop}
    >
      {label ? (
        <span id={labelId} className="echo-field__label">
          {label}
        </span>
      ) : null}
      <button
        ref={(el) => {
          tray.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type="button"
        className="echo-file-upload__tray"
        data-dragging={dragging ? "" : undefined}
        disabled={disabled}
        aria-disabled={readOnly || undefined}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        autoFocus={autoFocus}
        onClick={() => {
          if (!off) input.current?.click();
        }}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="echo-file-upload__icon">
          <TrayIcon />
        </span>
        <span className="echo-file-upload__prompt">
          <span className="echo-file-upload__choose">{multiple ? "Choose files" : "Choose a file"}</span>{" "}
          <span className="echo-file-upload__drop">{multiple ? "or drop them here" : "or drop it here"}</span>
        </span>
      </button>
      {/* Under the tray, as a Field's are under its well: what it takes is read with it. */}
      {description != null ? (
        <p id={descriptionId} className="echo-field__description">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="echo-field__error">
          {error}
        </p>
      ) : null}
      {/* Hidden, and still what opens the file dialog and what a form submits. */}
      <input
        ref={input}
        type="file"
        hidden
        name={upload ? undefined : name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          add([...(event.currentTarget.files ?? [])]);
          // With `upload`, clear it so the same file can be chosen again; without, the rows put the files back.
          if (upload) event.currentTarget.value = "";
        }}
      />
      {rows.length ? (
        <ul className="echo-file-upload__list" aria-label={label ? `${label}: files` : "Files"}>
          {rows.map((row) => {
            const rowName = `${ownId}-${row.id}`;
            return (
              <li key={row.id} className="echo-file-upload__row" data-status={row.status}>
                <span className="echo-file-upload__file">
                  <span id={rowName} className="echo-file-upload__name">
                    {row.file.name}
                  </span>
                  <span className="echo-file-upload__status">{statusOf(row)}</span>
                </span>
                {row.status === "uploading" ? (
                  <Progress className="echo-file-upload__progress" value={row.progress ?? 0} cells={20} aria-labelledby={rowName} />
                ) : null}
                <span className="echo-file-upload__keys">
                  {row.status === "error" && row.progress !== undefined && upload ? (
                    <HardwareButton
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={`Retry ${row.file.name}`}
                      icon={<RetryIcon />}
                      disabled={off}
                      onClick={(event) => {
                        // Retry goes as it's pressed: its row's other key, Cancel, takes focus.
                        const keys = event.currentTarget.closest(".echo-file-upload__keys");
                        retry(row);
                        requestAnimationFrame(() => keys?.querySelector<HTMLButtonElement>("button:last-of-type")?.focus());
                      }}
                    />
                  ) : null}
                  <HardwareButton
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label={`${row.status === "uploading" ? "Cancel" : "Remove"} ${row.file.name}`}
                    icon={<CrossIcon />}
                    disabled={off}
                    onClick={(event) => remove(row, event.currentTarget)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="echo-file-upload__said" role="status">
        {said}
      </p>
    </div>
  );
});

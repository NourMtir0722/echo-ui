"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileUpload, type UploadItem } from "@registry/echo/file-upload";

/**
 * A test fixture for FileUpload: a handler that uploads in steps, stalls at
 * 40% until it's cancelled ("stuck…"), fails once and then succeeds
 * ("fail…"), and counts cancellations; refusals by type, size and count; a
 * form that submits the files; and a disabled one. tests/file-upload.spec.ts
 * drives it.
 */
export default function FileUploadChecks() {
  const [rows, setRows] = useState<UploadItem[]>([]);
  const [aborts, setAborts] = useState(0);
  const [sent, setSent] = useState("");
  const failed = useRef(new Set<string>());

  const upload = async (file: File, report: (p: number) => void, signal: AbortSignal) => {
    const abort = () => {
      setAborts((n) => n + 1);
      return new DOMException("Cancelled", "AbortError");
    };
    if (file.name.startsWith("stuck")) {
      report(0.4);
      await new Promise((_, reject) => signal.addEventListener("abort", () => reject(abort())));
    }
    const steps = file.name.startsWith("slow") ? 80 : 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 40));
      if (signal.aborted) throw abort();
      report(i / steps);
    }
    if (file.name.startsWith("fail") && !failed.current.has(file.name)) {
      failed.current.add(file.name);
      throw new Error("The server said no.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(new FormData(event.currentTarget).getAll("avatar").map((f) => (f as File).name).join(", "));
  };

  return (
    <main style={{ display: "grid", gap: 24, maxWidth: 420, padding: 24 }}>
      <section id="upload">
        <FileUpload
          label="Attachments"
          multiple
          accept="image/*,.pdf"
          maxSize={1_000_000}
          maxFiles={3}
          description="Images or PDFs, up to 1 MB each, three at most."
          upload={upload}
          onFilesChange={setRows}
          locale="en-US"
        />
        <output id="upload-rows">{rows.map((r) => `${r.file.name}:${r.status}`).join(" ") || "none"}</output>
        <output id="upload-aborts">{`aborted: ${aborts}`}</output>
      </section>

      <form id="form" onSubmit={submit}>
        <FileUpload label="Avatar" name="avatar" accept="image/*" locale="en-US" />
        <button type="submit">Send</button>
        <output id="form-value">{sent || "not sent"}</output>
      </form>

      <section id="off">
        <FileUpload label="Locked" disabled />
      </section>
    </main>
  );
}

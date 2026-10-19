"use client";

/** The live preview on /docs/file-upload. */
import { FileUpload } from "@registry/echo/file-upload";

/** A stand-in for your upload: it reports progress for a second and a half, and fails a file with "fail" in its name. */
async function pretend(file: File, report: (progress: number) => void, signal: AbortSignal) {
  for (let i = 1; i <= 15; i++) {
    await new Promise((done) => setTimeout(done, 100));
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    report(i / 15);
  }
  if (/fail/i.test(file.name)) throw new Error("The server turned it away.");
}

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 380 }}>
      <FileUpload
        label="Attachments"
        multiple
        accept="image/*,.pdf"
        maxSize={10_000_000}
        description="Images or PDFs, up to 10 MB each."
        upload={pretend}
      />
    </div>
  );
}

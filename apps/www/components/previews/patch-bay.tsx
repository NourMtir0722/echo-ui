"use client";

/** The live preview on /docs/patch-bay. */
import { PatchBay } from "@registry/echo/patch-bay";

function PatchBayPreview() {
  return (
    <div style={{ width: "min(680px, 100%)" }}>
      <PatchBay
        label="Import columns"
        sourcesLabel="In your file"
        targetsLabel="Fields"
        sources={[
          { value: "e-mail", label: "E-mail" },
          { value: "full-name", label: "Full name" },
          { value: "company", label: "Company" },
          { value: "phone", label: "Phone no." },
        ]}
        targets={[
          { value: "email", label: "Email" },
          { value: "name", label: "Name" },
          { value: "org", label: "Organisation" },
          { value: "tel", label: "Telephone" },
          { value: "notes", label: "Notes" },
        ]}
        defaultValue={{ "e-mail": "email", "full-name": "name", company: "org" }}
      />
    </div>
  );
}

export default function Preview() {
  return <PatchBayPreview />;
}

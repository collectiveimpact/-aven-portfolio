"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { submitRequest, uploadPhoto, type RequestState } from "../actions";

const CATEGORIES = [
  "Plumbing", "Heating / Cooling", "Electrical", "Appliance",
  "Pest control", "Doors / Locks", "Common area", "Other",
];

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic";
const MAX_BYTES = 8 * 1024 * 1024; // mirror the server limit for instant feedback

const initial: RequestState = {};

export function RequestForm() {
  const [state, action, pending] = useActionState(submitRequest, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Photo is uploaded to Storage *before* form submit; we keep the resulting
  // public URL in a hidden field so the request action just stores the URL
  // (matching how requests persist photoUrl in the notice jsonb today).
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const [photoError, setPhotoError] = useState<string>("");
  const [uploading, startUpload] = useTransition();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPhotoUrl("");
      setPhotoName("");
      setPhotoError("");
    }
  }, [state.ok]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setPhotoError("Photo is too large (max 8 MB).");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("photo", file);
    startUpload(async () => {
      const r = await uploadPhoto({}, fd);
      if (r.ok && r.url) {
        setPhotoUrl(r.url);
        setPhotoName(file.name);
      } else {
        setPhotoError(r.error || "Upload failed. Try again.");
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function clearPhoto() {
    setPhotoUrl("");
    setPhotoName("");
    setPhotoError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form ref={formRef} action={action} className="f5-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Report an issue</div>
        <div style={{ color: "var(--f5-text-muted)", fontSize: 12.5, marginTop: 2 }}>
          We&apos;ll send this to your property team and track it below.
        </div>
      </div>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>Category</span>
        <select name="category" className="f5-select" defaultValue="Plumbing">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>What&apos;s happening?</span>
        <textarea
          name="description"
          required
          rows={4}
          placeholder="Describe the issue — where it is, when it started, anything that helps."
          className="f5-textarea"
        />
      </label>

      {/* Photo: real file upload to the request-photos Storage bucket. */}
      <div>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>
          Photo <span style={{ fontWeight: 400, color: "var(--f5-text-muted)" }}>(optional)</span>
        </span>

        {/* Hidden field carries the uploaded public URL into the submit action. */}
        <input type="hidden" name="photoUrl" value={photoUrl} />

        {photoUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Attached"
              style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--f5-border)" }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--f5-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                {photoName || "Photo attached"}
              </div>
              <button
                type="button"
                onClick={clearPhoto}
                style={{ background: "none", border: "none", padding: 0, marginTop: 4, color: "var(--f5-teal)", fontSize: 12.5, cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={onPickFile}
            disabled={uploading}
            className="f5-input"
            style={{ padding: 8 }}
          />
        )}
        {uploading && <div style={{ fontSize: 12.5, color: "var(--f5-text-muted)", marginTop: 6 }}>Uploading photo…</div>}
        {photoError && <div role="alert" style={{ fontSize: 12.5, color: "var(--f5-red, #ef4444)", marginTop: 6 }}>{photoError}</div>}
      </div>

      {state.error && (
        <div role="alert" style={{ fontSize: 13, color: "var(--f5-red, #ef4444)" }}>{state.error}</div>
      )}
      {state.ok && (
        <div
          role="status"
          style={{
            fontSize: 13, color: "var(--f5-teal)",
            background: "var(--f5-teal-subtle)", border: "1px solid var(--f5-teal-border)",
            borderRadius: 8, padding: "10px 12px",
          }}
        >
          Thanks — your request has been submitted. You can track it below.
        </div>
      )}

      <button type="submit" className="f5-btn primary" disabled={pending || uploading} style={{ justifyContent: "center", padding: 11 }}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

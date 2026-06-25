// Yardi data-source abstraction.
//
// One interface, three levels of automation. The importer (and the rest of the
// app) only ever sees `YardiDataSource` — it doesn't care whether the rows came
// from a hand-uploaded Excel file today or a live Voyager API pull tomorrow.
//
//   1. MANUAL    FileSource  — parse an uploaded ETL Excel/CSV.            (live now)
//   2. SEMI-AUTO SftpSource  — pick up a scheduled Yardi export from SFTP. (scaffold)
//   3. DIRECT    ApiSource   — Voyager Web Services / RentCafe API pull.   (scaffold)

import { parseTable } from "./parse";
import { normalizeUpload, type NormalizeResult } from "./normalize";
import { hasYardiApi } from "@/lib/env";
import { getPropertyConfigurations, getResidentData } from "./api";

export type SourceMode = "file" | "sftp" | "api";

export interface YardiDataSource {
  readonly mode: SourceMode;
  /** Whether this source is usable right now (creds present, dep installed, …). */
  available(): Promise<{ ok: boolean; reason?: string }>;
  /** Produce a normalized table for one entity. */
  fetch(opts: { filename?: string; data?: Buffer; tableKey?: string }): Promise<NormalizeResult>;
}

// --- 1. Manual file upload (live) ---------------------------------------
export class FileSource implements YardiDataSource {
  readonly mode = "file" as const;
  async available() { return { ok: true }; }
  async fetch({ filename, data, tableKey }: { filename?: string; data?: Buffer; tableKey?: string }): Promise<NormalizeResult> {
    if (!filename || !data) return { ok: false, error: "No file provided.", records: [], rowErrors: [], warnings: [] };
    const parsed = parseTable(filename, data);
    if (!parsed.ok) return { ok: false, error: parsed.error, records: [], rowErrors: [], warnings: [] };
    return normalizeUpload(parsed.marker, filename, parsed.headers, parsed.rows, tableKey);
  }
}

// --- 3. Direct Yardi API (future) ---------------------------------------
// Voyager exposes data via the Voyager Web Services (SOAP/ItfXxx interfaces);
// RentCafe exposes a more modern REST surface. Both require a paid Yardi
// interface license + provisioned credentials. The shape is ready; the calls
// are stubbed until those credentials exist.
export interface YardiApiConfig {
  baseUrl: string;        // Voyager Web Services / RentCafe endpoint
  database?: string;      // Yardi DB name
  username?: string;
  password?: string;      // stored server-side only, never shipped to client
  interfaceLicense?: string;
}

export class ApiSource implements YardiDataSource {
  readonly mode = "api" as const;
  constructor(private propertyCode?: string) {}
  async available() {
    if (!hasYardiApi) {
      return { ok: false, reason: "Yardi API not configured. Set YARDI_* env (paid Yardi interface license + provisioned credentials)." };
    }
    return { ok: true };
  }
  async fetch({ tableKey }: { tableKey?: string } = {}): Promise<NormalizeResult> {
    const avail = await this.available();
    if (!avail.ok) return { ok: false, error: avail.reason, records: [], rowErrors: [], warnings: [] };
    // Map the requested entity to the right Voyager web-service call.
    const key = (tableKey ?? "").toLowerCase();
    const isResident = key.includes("res") || key.includes("tenant");
    const call = isResident ? await getResidentData(this.propertyCode ?? "") : await getPropertyConfigurations();
    if (!call.ok || !call.table) {
      return { ok: false, error: call.error ?? "Yardi API returned no data.", records: [], rowErrors: [], warnings: [] };
    }
    // Hand the live rows to the same normalizer the file importer uses.
    return normalizeUpload(null, "yardi-api", call.table.headers, call.table.rows, tableKey);
  }
}

// --- 2. Scheduled SFTP flat-file (future) -------------------------------
// Yardi can be configured to drop a nightly ETL export to an SFTP folder.
// A scheduled job lists new files, runs each through FileSource, and commits.
export class SftpSource implements YardiDataSource {
  readonly mode = "sftp" as const;
  async available() { return { ok: false, reason: "SFTP auto-pickup not configured." }; }
  async fetch(): Promise<NormalizeResult> {
    return { ok: false, error: "SFTP source not implemented yet.", records: [], rowErrors: [], warnings: [] };
  }
}

export function getSource(mode: SourceMode, propertyCode?: string): YardiDataSource {
  switch (mode) {
    case "api": return new ApiSource(propertyCode);
    case "sftp": return new SftpSource();
    default: return new FileSource();
  }
}

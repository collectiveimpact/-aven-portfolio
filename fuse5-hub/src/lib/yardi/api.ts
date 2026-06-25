import "server-only";
import { yardiCreds, hasYardiApi, type YardiCreds } from "@/lib/env";

// Direct Yardi Voyager Web Services client (SOAP/ItfXxx interfaces).
//
// This is the REAL integration: it builds the standard Voyager SOAP envelope,
// authenticates with the interface credentials, POSTs to the .asmx endpoint, and
// parses the returned ADO.NET DiffGram dataset into header/row tables that feed
// the same normalize→commit pipeline the file importer uses.
//
// It activates only when YARDI_* env is set (a paid Yardi interface license).
// Without creds it stays dormant and the app uses file ETL import. The envelope
// shape follows Yardi's published ItfResidentData / ItfCommonData contracts;
// validate against your tenant's WSDL on first connect (method/param names can
// vary by interface version).

const NS = "http://tempuri.org/YSI.Interfaces.WebServices/ItfServiceRequests";

export interface YardiTable { headers: string[]; rows: Record<string, string>[] }
export interface YardiCallResult { ok: boolean; error?: string; table?: YardiTable; raw?: string }

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Standard auth block shared by every Voyager web-service call.
function authXml(c: YardiCreds): string {
  return [
    `<UserName>${xmlEscape(c.username)}</UserName>`,
    `<Password>${xmlEscape(c.password)}</Password>`,
    `<ServerName>${xmlEscape(c.server)}</ServerName>`,
    `<Database>${xmlEscape(c.database)}</Database>`,
    `<Platform>${xmlEscape(c.platform)}</Platform>`,
    `<InterfaceEntity>${xmlEscape(c.interfaceEntity)}</InterfaceEntity>`,
    `<InterfaceLicense>${xmlEscape(c.interfaceLicense)}</InterfaceLicense>`,
  ].join("");
}

function envelope(service: string, method: string, innerXml: string, c: YardiCreds): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="${NS}/${service}">
      ${authXml(c)}
      ${innerXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`;
}

// Parse an ADO.NET DiffGram dataset (what Voyager returns) into a flat table.
// Each repeating row element under the diffgram becomes one record; child
// element names are the columns. Dependency-free (server XML, no DOMParser).
export function parseDiffgram(xml: string): YardiTable {
  const rows: Record<string, string>[] = [];
  const headerSet = new Set<string>();
  // rows are repeated sibling elements that contain leaf <Col>value</Col> children
  const rowMatches = xml.match(/<(\w+)[^>]*diffgr:id="[^"]*"[^>]*>([\s\S]*?)<\/\1>/g) ?? [];
  for (const block of rowMatches) {
    const inner = block.replace(/^<\w+[^>]*>/, "").replace(/<\/\w+>$/, "");
    const cols = inner.match(/<([\w.]+)>([\s\S]*?)<\/\1>/g) ?? [];
    if (!cols.length) continue;
    const rec: Record<string, string> = {};
    for (const col of cols) {
      const m = col.match(/<([\w.]+)>([\s\S]*?)<\/\1>/);
      if (!m) continue;
      const key = m[1];
      const val = m[2].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
      rec[key] = val;
      headerSet.add(key);
    }
    if (Object.keys(rec).length) rows.push(rec);
  }
  return { headers: [...headerSet], rows };
}

async function soapCall(service: string, method: string, innerXml: string): Promise<YardiCallResult> {
  if (!hasYardiApi) return { ok: false, error: "Yardi API not configured (set YARDI_* env)." };
  const c = yardiCreds();
  const url = `${c.baseUrl.replace(/\/$/, "")}/Webservices/${service}.asmx`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `${NS}/${service}/${method}` },
      body: envelope(service, method, innerXml, c),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Yardi ${res.status}: ${text.slice(0, 200)}`, raw: text };
    if (/<faultstring>/i.test(text)) return { ok: false, error: text.match(/<faultstring>([\s\S]*?)<\/faultstring>/i)?.[1] ?? "SOAP fault", raw: text };
    return { ok: true, table: parseDiffgram(text), raw: text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Yardi request failed." };
  }
}

// Pull property configurations (ItfCommonData → GetPropertyConfigurations).
export function getPropertyConfigurations(): Promise<YardiCallResult> {
  return soapCall("ItfCommonData", "GetPropertyConfigurations", "");
}

// Pull resident data for a property (ItfResidentData → GetResidentData).
export function getResidentData(propertyCode: string): Promise<YardiCallResult> {
  return soapCall("ItfResidentData", "GetResidentData", `<YardiPropertyId>${xmlEscape(propertyCode)}</YardiPropertyId>`);
}

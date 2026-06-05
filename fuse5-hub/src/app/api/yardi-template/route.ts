import { NextRequest } from "next/server";
import { TABLES } from "@/lib/yardi/tables";

// GET /api/yardi-template?table=workorders → a CSV with the canonical Yardi ETL
// headers + one example row, so staff fill the exact format Voyager produces.
// Keyed by the canonical (first-candidate) header for each mapped field.
const EXAMPLE: Record<string, Record<string, string>> = {
  units: { Address_1: "Danforth — Building A", Address_2: "123 Danforth Ave", Property_Code: "wgdanfth" },
  residents: { Tenant_Name: "", First_Name: "Jane", Last_Name: "Doe", Unit_Code: "204", Email: "jane@example.com", Phone_Number_1: "416-555-0142", Language: "English", Status: "0", Move_Out_Date: "", Property_Code: "wgdanfth", Tenant_Code: "wgdanfth_204" },
  workorders: { BriefDescription: "Kitchen faucet leak", Unit_Code: "204", Category: "Plumbing", Priority: "High", Status: "Open", PropertyCode: "wgdanfth", Code: "WO-55012" },
};

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("table") ?? "";
  const table = TABLES.find((t) => t.key === key);
  if (!table) return new Response("Unknown table", { status: 400 });

  // canonical header = first source candidate per field
  const headers = table.fields.map((f) => f.sources[0]);
  const ex = EXAMPLE[table.key] ?? {};
  const exampleRow = headers.map((h) => ex[h] ?? "");

  const csv = [headers.map(csvCell).join(","), exampleRow.map(csvCell).join(",")].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Fuse5_Yardi_${table.key}_template.csv"`,
    },
  });
}

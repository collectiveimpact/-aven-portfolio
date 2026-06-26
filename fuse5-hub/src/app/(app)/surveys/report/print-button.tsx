"use client";

// Print / Save-as-PDF the results report. The browser print dialog is the
// "report that comes out" — no server-side PDF dependency needed.
export function PrintButton() {
  return <button className="f5-btn primary" onClick={() => window.print()}>Print / Save PDF</button>;
}

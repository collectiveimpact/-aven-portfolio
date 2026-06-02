"use client";

import { useEffect, useState } from "react";

// Our prototype's dual-Aurora theme toggle. Persists to localStorage; the initial
// theme is applied pre-hydration by a script in the root layout (no flash).
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    setTheme(t);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("fuse5-theme", next); } catch {}
    setTheme(next);
  }

  return (
    <button className="f5-btn" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle theme" style={{ padding: "6px 11px" }}>
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

"use client";

// Hamburger for the mobile drawer (hidden on desktop via CSS).
export function MobileNavToggle() {
  return (
    <button
      className="f5-mobile-toggle"
      aria-label="Open navigation"
      onClick={() => document.documentElement.classList.toggle("nav-open")}
    >
      ☰
    </button>
  );
}

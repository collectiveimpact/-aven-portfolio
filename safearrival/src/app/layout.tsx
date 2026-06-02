import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SafeArrival — Youth Program Attendance & Safety",
  description: "Standalone SafeArrival platform. Independent backend.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={figtree.variable}>
      <body>
        <div className="sa-aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neurolib",
  description: "Personal knowledge library — hierarchical subjects, LaTeX cards, composable textbooks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeedLoop — Hear your users. Ship what matters.",
  description:
    "A tiny feedback widget for indie builders. Suggest, vote, roadmap, changelog — from a single line of script. English + Spanish.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

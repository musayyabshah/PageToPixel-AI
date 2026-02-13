import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageToPixel AI",
  description: "Turn PDF pages into prompts and generated images"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "阿接 & 阿包 Volleyball · A-Jie & A-Bao",
  description: "Retro 2D arcade volleyball: 1P vs CPU, local 2P and online rooms. 復古街機排球。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

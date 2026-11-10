import type { Metadata } from "next";
import "./globals.css";
import { redHatDisplay } from "./fonts";

export const metadata: Metadata = {
  title: "Mole Mag",
  description: "A wall of stories",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={redHatDisplay.className}>
      <body>{children}</body>
    </html>
  );
}

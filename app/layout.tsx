import type { Metadata } from "next";
import "./globals.css";
import { redHatDisplay } from "./fonts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

// The share image and its alt text come from app/opengraph-image.jpg and
// app/opengraph-image.alt.txt.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
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

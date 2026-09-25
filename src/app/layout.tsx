import type { Metadata, Viewport } from "next";
import { Roboto_Flex, Roboto_Mono } from "next/font/google";
import { INTRO_GATE_SCRIPT } from "@/features/loader/intro-gate";
import { site } from "@/lib/config";
import "./globals.css";

/* Roboto Flex is the variable face the Variable Text Proximity component is
   built around; the rest of the site uses its width + optical-size axes. */
const flex = Roboto_Flex({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-flex",
  display: "swap",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

const title = `${site.name} ($${site.ticker})`;

export const metadata: Metadata = {
  metadataBase: new URL(site.domain),
  title: { default: title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site.domain,
    siteName: site.name,
    title,
    description: site.description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${site.name} on a halftone green stage` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@cpuhyperliquid",
    title,
    description: site.description,
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${flex.variable} ${mono.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
        <noscript>
          <style>{`.site-loader{display:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}

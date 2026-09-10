import type { Metadata } from "next";
import { AppProviders } from "@/lib/state";
import { AttributionCapture } from "@/components/layout/AttributionCapture";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { fontSans, fontSerif } from "@/lib/fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ella.example.com";

// Section 38: SEO defaults, overridden per-page via generateMetadata once
// Phase 15 wires real product/category data into metadata.
//
// FAVICON: no favicon file exists in this workspace/session (checked
// /mnt/user-data/uploads and public/ — both empty of any icon). This wires
// the explicit Next.js metadata.icons convention pointing at
// `public/favicon.png`, which is more debuggable than relying on Next's
// implicit `src/app/favicon.ico` auto-detection. To activate it: place the
// real ELLA icon at `public/favicon.png`. Nothing here fabricates a logo —
// until that file exists, the browser just shows no custom favicon.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ELLA",
    template: "%s | ELLA",
  },
  description: "ELLA — jewelry, eyewear, watches & accessories.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    siteName: "ELLA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fontSans.variable} ${fontSerif.variable}`}>
      <body>
        <AttributionCapture />
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}

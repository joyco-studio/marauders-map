import type { Metadata } from "next"
import { ThemeInit } from "@/components/theme-init"
import "./globals.css"

export const metadata: Metadata = {
  title: "The Makers’ Map",
  description: "An enchanted atlas of the creative web. Follow real GitHub activity and YouTube discoveries as footprints through a living castle.",
  openGraph: {
    title: "The Makers’ Map",
    description: "An enchanted atlas of the creative web. Follow real GitHub activity and YouTube discoveries as footprints through a living castle.",
    images: [{ url: "/og-image.png", width: 1731, height: 909, alt: "The Makers’ Map with a clean compass" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Makers’ Map",
    description: "An enchanted atlas of the creative web. Follow real GitHub activity and YouTube discoveries as footprints through a living castle.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=new URLSearchParams(window.location.search).get('theme')||'dark';document.documentElement.dataset.theme=t})()`,
          }}
        />
      </head>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  )
}

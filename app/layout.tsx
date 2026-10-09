import type { Metadata } from "next"
import { ThemeInit } from "@/components/theme-init"
import "./globals.css"

export const metadata: Metadata = {
  title: "The Marauder’s Map",
  description: "An enchanted parchment of Hogwarts. Watch the map unfold, follow wandering footprints, and uncover a secret passage.",
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

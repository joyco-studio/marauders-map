"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"

function ThemeInitInner() {
  const searchParams = useSearchParams()
  const theme = searchParams.get("theme") ?? "dark"

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return null
}

export function ThemeInit() {
  return (
    <Suspense>
      <ThemeInitInner />
    </Suspense>
  )
}

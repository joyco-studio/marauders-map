"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Logo } from "./logo"

function HeaderInner() {
  const searchParams = useSearchParams()
  const isLab = searchParams.get("lab") === "true"

  if (isLab) return null

  return (
    <header className="fixed top-0 left-0 z-100 flex w-full p-6 mix-blend-difference pointer-events-none">
      <Logo width={64} className="h-auto" aria-hidden="true" />
      <h1 className="sr-only">Joyco 3D Lab Template</h1>
    </header>
  )
}

export function Header() {
  return (
    <Suspense>
      <HeaderInner />
    </Suspense>
  )
}

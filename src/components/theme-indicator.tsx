"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeIndicator() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="text-xs text-muted-foreground">
      Tema: {resolvedTheme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
    </div>
  )
}

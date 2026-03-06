import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { applyThemeMode, getInitialThemeMode } from './themeMode'

export default function WowThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  useEffect(() => {
    const mode = getInitialThemeMode()
    applyThemeMode(mode)

    if (mode !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')
    media.addEventListener('change', onChange)

    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [])

  return <>{children}</>
}

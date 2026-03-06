import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { resolveConsumeBackendConfig } from '#/domain/backendConfig'

const backendConfig = resolveConsumeBackendConfig()

export function OptionalConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    if (!backendConfig.shouldProvideConvexClient || !backendConfig.convexUrl) {
      return null
    }

    return new ConvexReactClient(backendConfig.convexUrl)
  }, [])

  if (!client) {
    return <>{children}</>
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>
}

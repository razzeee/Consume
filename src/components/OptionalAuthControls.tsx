import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { resolveConsumeBackendConfig } from '#/domain/backendConfig'

const backendConfig = resolveConsumeBackendConfig()
const viewerQueryFn = 'authViewer:viewer'

export default function OptionalAuthControls() {
  if (!backendConfig.shouldProvideConvexClient) {
    return null
  }

  return <AuthControls />
}

function AuthControls() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const viewer = useQuery(viewerQueryFn as any) as
    | {
        name?: string | null
        email?: string | null
        userId: string
        providers?: string[]
      }
    | null
    | undefined
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBusy = isLoading || isSubmitting
  const resolvedDisplayName =
    viewer?.name?.trim() ||
    viewer?.email?.trim() ||
    viewer?.userId ||
    'Unknown user'

  async function handleSignIn() {
    setError(null)
    setIsSubmitting(true)

    try {
      await signIn('discord', {
        redirectTo:
          typeof window === 'undefined'
            ? '/'
            : `${window.location.pathname}${window.location.search}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    setIsSubmitting(true)

    try {
      await signOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign out.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="section-shell flex items-center gap-2 px-2 py-1.5">
      {isAuthenticated ? (
        <Link
          to="/settings"
          className="m-0 max-w-56 truncate text-[11px] text-[var(--wow-ink-soft)] no-underline hover:text-[var(--wow-ink)]"
        >
          Signed in as{' '}
          <span className="font-semibold text-[var(--wow-ink)]">
            {resolvedDisplayName}
          </span>
        </Link>
      ) : null}

      {isAuthenticated ? (
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isBusy}
          className="wow-input rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          Sign Out
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isBusy}
          className="wow-button rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          Sign In
        </button>
      )}

      {isLoading ? (
        <span className="text-[11px] text-[var(--wow-ink-soft)]">
          Loading...
        </span>
      ) : null}

      {error ? (
        <p className="m-0 text-[11px] text-[var(--wow-accent)]">{error}</p>
      ) : null}
    </div>
  )
}

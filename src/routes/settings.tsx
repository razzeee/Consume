import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'
import { resolveConsumeBackendConfig } from '#/domain/backendConfig'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

const backendConfig = resolveConsumeBackendConfig()
const viewerQueryFn = 'authViewer:viewer'
const updateDisplayNameFn = 'authViewer:updateDisplayName'

function Settings() {
  if (!backendConfig.shouldProvideConvexClient) {
    return (
      <main id="main-content" className="page-wrap route-enter px-4 py-12">
        <section className="wow-panel rounded-lg p-6 sm:p-8">
          <h1 className="display-title mb-3 text-3xl font-bold text-[var(--wow-ink)]">
            Settings
          </h1>
          <p className="text-[var(--wow-ink-soft)]">
            Settings are available when you are signed in with a guild backend.
          </p>
          <Link
            to="/"
            className="wow-button mt-4 inline-block rounded-md px-4 py-2 text-sm font-semibold no-underline"
          >
            Back to Home
          </Link>
        </section>
      </main>
    )
  }

  return <SettingsContent />
}

function SettingsContent() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const viewer = useQuery(viewerQueryFn as any) as
    | {
        name?: string | null
        email?: string | null
        userId: string
        providers?: string[]
      }
    | null
    | undefined
  const updateDisplayName = useMutation(updateDisplayNameFn as any)

  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resolvedName =
    viewer?.name?.trim() ||
    viewer?.email?.trim() ||
    viewer?.userId ||
    'Unknown user'

  function startEditing() {
    setDisplayNameDraft(viewer?.name?.trim() || '')
    setIsEditing(true)
    setError(null)
    setSuccess(null)
  }

  function cancelEditing() {
    setIsEditing(false)
    setError(null)
  }

  async function saveDisplayName() {
    const trimmed = displayNameDraft.trim()
    if (trimmed.length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }
    if (trimmed.length > 40) {
      setError('Display name must be 40 characters or fewer.')
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      await updateDisplayName({ displayName: trimmed })
      setIsEditing(false)
      setSuccess('Display name updated.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update display name.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main id="main-content" className="page-wrap route-enter px-4 py-12">
        <section className="wow-panel rounded-lg p-6 sm:p-8">
          <p className="text-[var(--wow-ink-soft)]">Loading…</p>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main id="main-content" className="page-wrap route-enter px-4 py-12">
        <section className="wow-panel rounded-lg p-6 sm:p-8">
          <h1 className="display-title mb-3 text-3xl font-bold text-[var(--wow-ink)]">
            Settings
          </h1>
          <p className="mb-4 text-[var(--wow-ink-soft)]">
            Sign in to manage your profile settings.
          </p>
          <button
            type="button"
            onClick={() =>
              signIn('discord', {
                redirectTo:
                  typeof window === 'undefined'
                    ? '/settings'
                    : `${window.location.origin}${window.location.pathname}${window.location.search}`,
              }).catch((err: unknown) => {
                // OAuth redirects navigate away, dropping the WebSocket — expected.
                if (
                  err instanceof Error &&
                  err.message.includes('Connection lost')
                ) {
                  return
                }
                throw err
              })
            }
            className="wow-button rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Sign In
          </button>
        </section>
      </main>
    )
  }

  return (
    <main id="main-content" className="page-wrap route-enter px-4 py-12">
      <section className="wow-panel rounded-lg p-6 sm:p-8">
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--wow-ink)]">
          Settings
        </h1>

        <div className="settings-field">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--wow-ink-soft)]">
            Display Name
          </label>

          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={displayNameDraft}
                onChange={(e) => setDisplayNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveDisplayName()
                  if (e.key === 'Escape') cancelEditing()
                }}
                maxLength={40}
                className="wow-input rounded-lg px-3 py-1.5 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={saveDisplayName}
                disabled={isSaving}
                className="wow-button rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="wow-input rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-[var(--wow-ink)]">
                {resolvedName}
              </span>
              <button
                type="button"
                onClick={startEditing}
                className="wow-input rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                Edit
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-2 text-xs font-semibold text-[var(--wow-danger)]">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-2 text-xs font-semibold text-[var(--wow-success)]">
              {success}
            </p>
          ) : null}
        </div>

        {viewer?.email ? (
          <div className="settings-field mt-6">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--wow-ink-soft)]">
              Email
            </label>
            <span className="text-sm text-[var(--wow-ink)]">
              {viewer.email}
            </span>
          </div>
        ) : null}
      </section>
    </main>
  )
}

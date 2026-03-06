import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useConsumeState } from '#/components/ConsumeStateProvider'

export const Route = createFileRoute('/guilds')({ component: GuildsPage })

function GuildsPage() {
  const consumeState = useConsumeState()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isGuildsIndex = pathname === '/guilds'

  if (!isGuildsIndex) {
    return <Outlet />
  }

  const canCreateGuild = consumeState.backend.canWrite
  const [guildName, setGuildName] = useState('')
  const [guildRealm, setGuildRealm] = useState<
    'Nordanaar' | "Tel'Abim" | 'Ambershire'
  >('Nordanaar')
  const [guildFaction, setGuildFaction] = useState<'Alliance' | 'Horde'>(
    'Alliance',
  )
  const [createGuildError, setCreateGuildError] = useState<string | null>(null)

  function handleCreateGuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateGuildError(null)

    if (!canCreateGuild) {
      setCreateGuildError('Sign in to create a guild.')
      return
    }

    const trimmedName = guildName.trim()
    if (!trimmedName) {
      setCreateGuildError('Guild name is required.')
      return
    }

    const guild = {
      name: trimmedName,
      realm: guildRealm,
      faction: guildFaction,
    }

    try {
      consumeState.createGuild(guild)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create guild right now.'
      setCreateGuildError(message)
      return
    }

    setGuildName('')
    setGuildRealm('Nordanaar')
    setGuildFaction('Alliance')
  }

  return (
    <main id="main-content" className="page-wrap route-enter px-4 pb-16 pt-10">
      <section className="wow-panel rise-in rounded-lg p-6 sm:p-10">
        <p className="island-kicker mb-2">Multi-Guild Control</p>
        <h1 className="display-title m-0 text-4xl font-bold text-[var(--wow-ink)] sm:text-5xl">
          Guild Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--wow-ink-soft)]">
          Manage raid consumable requests by date, invites, and contribution
          progress for every guild in one place.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="campaign-ribbon campaign-ribbon--alliance">
            Alliance Friendly
          </span>
          <span className="campaign-ribbon campaign-ribbon--horde">
            Horde Friendly
          </span>
          <span className="campaign-ribbon">Roster-aware controls</span>
        </div>

        <div className="command-track mt-5">
          {[
            'Create or pick a guild',
            'Use leader management for invites and requests',
            'Collect supplies on the request board',
            'Audit completion in the raid calendar',
          ].map((label, index) => (
            <div key={label} className="command-step">
              <span className="command-step-index">{index + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {!canCreateGuild ? (
          <div className="mt-4 rounded-lg border border-[var(--wow-line)] bg-[var(--wow-surface-deep)] p-4">
            <p className="m-0 text-sm font-semibold text-[var(--wow-ink)]">
              Read-only mode: sign in to create guilds and edit guild data.
            </p>
          </div>
        ) : null}

        <form
          className="mt-5 grid gap-2 sm:grid-cols-2"
          onSubmit={handleCreateGuild}
        >
          <input
            value={guildName}
            onChange={(event) => setGuildName(event.target.value)}
            placeholder="Guild name"
            className="wow-input rounded-lg px-3 py-2 text-sm"
            disabled={!canCreateGuild}
          />
          <select
            value={guildRealm}
            onChange={(event) =>
              setGuildRealm(
                event.target.value as 'Nordanaar' | "Tel'Abim" | 'Ambershire',
              )
            }
            className="wow-input rounded-lg px-3 py-2 text-sm"
            disabled={!canCreateGuild}
          >
            <option value="Nordanaar">Nordanaar</option>
            <option value="Tel'Abim">Tel'Abim</option>
            <option value="Ambershire">Ambershire</option>
          </select>
          <select
            value={guildFaction}
            onChange={(event) =>
              setGuildFaction(event.target.value as 'Alliance' | 'Horde')
            }
            className="wow-input rounded-lg px-3 py-2 text-sm"
            disabled={!canCreateGuild}
          >
            <option value="Alliance">Alliance</option>
            <option value="Horde">Horde</option>
          </select>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="wow-link-button rounded-lg px-4 py-2 text-sm font-semibold"
              disabled={!canCreateGuild}
            >
              Create Guild
            </button>
            {createGuildError ? (
              <p className="m-0 mt-2 text-sm text-[var(--wow-accent)]">
                {createGuildError}
              </p>
            ) : null}
            {!canCreateGuild ? (
              <p className="m-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
                Sign in to create and manage guilds.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {consumeState.guilds.length === 0 ? (
          <article className="wow-panel empty-state sm:col-span-2">
            <p className="island-kicker mb-2">No Guilds Yet</p>
            <p className="m-0 text-sm text-[var(--wow-ink-soft)]">
              Create your first guild above to unlock leadership, requests, and
              raid calendar tracking.
            </p>
          </article>
        ) : null}

        {consumeState.guilds.map((guild, index) => {
          const memberCount = consumeState.getGuildMembers(guild.id).length
          const inviteCount = consumeState.getGuildInvites(guild.id).length

          return (
            <article
              key={guild.id}
              className="wow-panel rise-in rounded-lg p-5"
              style={{ animationDelay: `${100 + index * 70}ms` }}
            >
              <p className="island-kicker mb-2">{guild.faction}</p>
              <h2 className="m-0 text-2xl font-bold text-[var(--wow-ink)]">
                {guild.name}
              </h2>
              <p className="m-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
                {guild.realm}
              </p>
              <p className="mt-3 text-sm text-[var(--wow-ink-soft)]">
                Members: {memberCount} | Active invites: {inviteCount}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/guilds/$guildId"
                  params={{ guildId: guild.id }}
                  className="wow-link-button inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold no-underline"
                >
                  Open Guild Overview
                </Link>
                <Link
                  to="/guilds/$guildId/manage"
                  params={{ guildId: guild.id }}
                  className="wow-button inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold no-underline"
                >
                  Leader Management
                </Link>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

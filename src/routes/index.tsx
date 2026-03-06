import { Link, createFileRoute } from '@tanstack/react-router'
import WowIcon from '#/components/WowIcon'
import {
  getCategoryIconCandidates,
  getRoleIconCandidates,
} from '#/domain/wowIcons'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const commandDisciplines = [
    {
      title: 'Campaign-based Planning',
      desc: 'Every request anchors to a raid date so each lockout has explicit supply targets.',
      iconAlt: 'Planning icon',
      iconCandidates: getRoleIconCandidates('officer'),
    },
    {
      title: 'Role-aware Contribution',
      desc: 'Members can supply ingredients or ready consumables using one shared fulfillment model.',
      iconAlt: 'Contribution icon',
      iconCandidates: getCategoryIconCandidates('flask'),
    },
    {
      title: 'Officer-grade Visibility',
      desc: 'BOM baselines, reduction from ready crafts, and remaining demand stay visible at all times.',
      iconAlt: 'Visibility icon',
      iconCandidates: getCategoryIconCandidates('utility'),
    },
    {
      title: 'Live Guild Foundation',
      desc: 'Shared sign-in and synced guild data keep your planning table up to date.',
      iconAlt: 'Foundation icon',
      iconCandidates: getCategoryIconCandidates('food'),
    },
  ]

  const operationFlow = [
    {
      title: 'Forge Guild Workspace',
      desc: 'Create guild and set faction + realm context.',
      linkLabel: 'Open Guilds',
      to: '/guilds' as const,
      iconAlt: 'Guild setup icon',
      iconCandidates: getRoleIconCandidates('lead'),
    },
    {
      title: 'Assign Leadership Tasks',
      desc: 'Issue invites, pick acting role, and draft raid requests.',
      linkLabel: 'Leader Mode',
      to: '/guilds' as const,
      iconAlt: 'Leadership icon',
      iconCandidates: getRoleIconCandidates('officer'),
    },
    {
      title: 'Collect Raid Supplies',
      desc: 'Gather mats and ready consumables with shared progress.',
      linkLabel: 'Supply Board',
      to: '/guilds' as const,
      iconAlt: 'Supplies icon',
      iconCandidates: getCategoryIconCandidates('elixir'),
    },
    {
      title: 'Check Raid Readiness',
      desc: 'Review request completion by raid date before pull night.',
      linkLabel: 'Raid Calendar',
      to: '/guilds' as const,
      iconAlt: 'Raid readiness icon',
      iconCandidates: getCategoryIconCandidates('potion'),
    },
  ]

  return (
    <main id="main-content" className="page-wrap route-enter px-4 pb-16 pt-10">
      <section className="hero-grid">
        <article className="wow-panel atlas-card rise-in rounded-lg px-6 py-8 sm:px-10 sm:py-12">
          <p className="island-kicker mb-3">Guild War Table</p>
          <h1 className="display-title mb-4 max-w-3xl text-3xl font-bold text-[var(--wow-ink)] sm:text-5xl">
            Raid prep runs from the war table, not a spreadsheet.
          </h1>
          <p className="mb-6 max-w-3xl text-base text-[var(--wow-ink-soft)] sm:text-lg">
            Build your guild roster, prepare dated raid requests, gather supply
            contributions, and verify fulfillment before pull night.
          </p>

          <div className="quest-callout mb-6">
            <p className="island-kicker mb-1">Tonight's Campaign</p>
            <p className="text-sm text-[var(--wow-ink-soft)]">
              Keep flask, food, and utility coverage visible before summons, so
              officers can adjust early.
            </p>
          </div>

          <div className="hero-badges mb-6">
            <span className="hero-badge">
              <WowIcon
                alt="Lead role"
                candidates={getRoleIconCandidates('lead')}
                className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
              />
              Officer controls
            </span>
            <span className="hero-badge">
              <WowIcon
                alt="Flask category"
                candidates={getCategoryIconCandidates('flask')}
                className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
              />
              Ingredient + ready tracking
            </span>
            <span className="hero-badge">
              <WowIcon
                alt="Utility category"
                candidates={getCategoryIconCandidates('utility')}
                className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
              />
              Guild state sync
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/guilds"
              className="wow-link-button rounded-md px-5 py-2.5 text-sm font-semibold no-underline"
            >
              Open War Table
            </Link>
            <Link
              to="/about"
              className="wow-button rounded-md px-5 py-2.5 text-sm font-semibold no-underline"
            >
              System Briefing
            </Link>
          </div>
        </article>

        <aside
          className="wow-panel rise-in rounded-lg p-6 sm:p-7"
          style={{ animationDelay: '100ms' }}
        >
          <p className="island-kicker mb-3">Campaign Overview</p>
          <div className="grid gap-2.5">
            <div className="war-stat">
              <p className="war-stat-label">Workflow</p>
              <p className="war-stat-value">4 Stages</p>
            </div>
            <div className="war-stat">
              <p className="war-stat-label">BOM Visibility</p>
              <p className="war-stat-value">Always On</p>
            </div>
            <div className="war-stat">
              <p className="war-stat-label">Guild Access</p>
              <p className="war-stat-value">Sign-in</p>
            </div>
          </div>
          <div className="hero-flow mt-4">
            {operationFlow.map((step, index) => (
              <div key={step.title} className="hero-flow-step">
                <span className="hero-flow-index">{index + 1}</span>
                <WowIcon
                  alt={step.iconAlt}
                  candidates={step.iconCandidates}
                  className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
                />
                <span className="text-sm">{step.title}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {commandDisciplines.map((discipline, index) => (
          <article
            key={discipline.title}
            className="wow-panel feature-card rise-in rounded-lg p-5"
            style={{ animationDelay: `${index * 80 + 120}ms` }}
          >
            <p className="m-0 mb-2 inline-flex items-center gap-2">
              <WowIcon
                alt={discipline.iconAlt}
                candidates={discipline.iconCandidates}
                className="h-5 w-5 rounded border border-[var(--wow-line)] object-cover"
              />
              <span className="island-kicker">Discipline</span>
            </p>
            <h2 className="mb-2 text-base font-semibold text-[var(--wow-ink)]">
              {discipline.title}
            </h2>
            <p className="m-0 text-sm text-[var(--wow-ink-soft)]">
              {discipline.desc}
            </p>
          </article>
        ))}
      </section>

      <section className="wow-panel flow-lane mt-6 rounded-lg p-6">
        <p className="island-kicker mb-2">Operation Route</p>
        <div className="operation-grid mt-4">
          {operationFlow.map((step, index) => (
            <article key={step.title} className="operation-card">
              <p className="operation-number">Stage {index + 1}</p>
              <h2 className="m-0 text-lg font-bold text-[var(--wow-ink)]">
                {step.title}
              </h2>
              <p className="m-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
                {step.desc}
              </p>
              <Link
                to={step.to}
                className="wow-link-button mt-3 inline-flex rounded-md px-3 py-1.5 text-xs font-semibold no-underline"
              >
                {step.linkLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

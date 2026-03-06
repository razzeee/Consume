import { createFileRoute } from '@tanstack/react-router'
import WowIcon from '#/components/WowIcon'
import {
  getCategoryIconCandidates,
  getRoleIconCandidates,
} from '#/domain/wowIcons'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  const flow = [
    {
      title: 'Guild Command Setup',
      desc: 'Create guild context and establish roster authority.',
      iconAlt: 'Guild command icon',
      iconCandidates: getRoleIconCandidates('lead'),
    },
    {
      title: 'Request Authoring',
      desc: 'Leads define raid requests by date and consumable lines.',
      iconAlt: 'Request icon',
      iconCandidates: getCategoryIconCandidates('utility'),
    },
    {
      title: 'Supply Contributions',
      desc: 'Members add ingredient and ready-item contributions with role checks.',
      iconAlt: 'Supply icon',
      iconCandidates: getCategoryIconCandidates('flask'),
    },
    {
      title: 'Fulfillment Review',
      desc: 'Raid calendar and request cards expose readiness before pull time.',
      iconAlt: 'Review icon',
      iconCandidates: getCategoryIconCandidates('food'),
    },
  ]

  return (
    <main id="main-content" className="page-wrap route-enter px-4 py-10">
      <section className="wow-panel rounded-lg p-6 sm:p-8">
        <p className="island-kicker mb-2">About</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--wow-ink)] sm:text-5xl">
          Consume for Turtle WoW guild logistics.
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--wow-ink-soft)]">
          Consume helps guild leaders and members stay coordinated on raid prep.
          You can organize rosters, send invites, create dated raid requests,
          and track both ingredient turn-ins and finished consumables without
          losing sight of total baseline requirements.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="campaign-ribbon campaign-ribbon--alliance">
            Alliance + Horde Friendly
          </span>
          <span className="campaign-ribbon">Officer-first tooling</span>
          <span className="campaign-ribbon">Member contribution flow</span>
        </div>

        <div className="operation-grid mt-8">
          {flow.map((step) => (
            <article key={step.title} className="operation-card">
              <p className="m-0 inline-flex items-center gap-2">
                <WowIcon
                  alt={step.iconAlt}
                  candidates={step.iconCandidates}
                  className="h-5 w-5 rounded border border-[var(--wow-line)] object-cover"
                />
                <span className="island-kicker">Flow Stage</span>
              </p>
              <h2 className="m-0 mt-3 text-lg font-bold text-[var(--wow-ink)]">
                {step.title}
              </h2>
              <p className="m-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
                {step.desc}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

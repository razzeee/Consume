import { Link } from '@tanstack/react-router'
import WowIcon from '#/components/WowIcon'
import {
  getCategoryIconCandidates,
  getRoleIconCandidates,
} from '#/domain/wowIcons'

type Props = {
  guildId: string
}

const FLOW_STEPS = [
  {
    id: 'overview',
    label: 'Overview',
    detail: 'Scout roster and upcoming raids',
    to: '/guilds/$guildId' as const,
    iconAlt: 'Overview icon',
    candidates: getRoleIconCandidates('member'),
  },
  {
    id: 'manage',
    label: 'Leadership',
    detail: 'Handle invites and request setup',
    to: '/guilds/$guildId/manage' as const,
    iconAlt: 'Leadership icon',
    candidates: getRoleIconCandidates('lead'),
  },
  {
    id: 'requests',
    label: 'Supply Board',
    detail: 'Collect ingredients and ready items',
    to: '/guilds/$guildId/requests' as const,
    iconAlt: 'Supply board icon',
    candidates: getCategoryIconCandidates('flask'),
  },
  {
    id: 'raids',
    label: 'Raid Calendar',
    detail: 'Track readiness by raid date',
    to: '/guilds/$guildId/raids' as const,
    iconAlt: 'Raid calendar icon',
    candidates: getCategoryIconCandidates('food'),
  },
] as const

export default function GuildFlowRail({ guildId }: Props) {
  return (
    <nav className="guild-flow-rail" aria-label="Guild operation flow">
      <p className="island-kicker m-0">Operation Flow</p>
      <div className="flow-track mt-3">
        {FLOW_STEPS.map((step, index) => (
          <Link
            key={step.id}
            to={step.to}
            params={{ guildId }}
            className="flow-node"
            activeProps={{ className: 'flow-node is-active' }}
          >
            <span className="flow-index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <WowIcon
              alt={step.iconAlt}
              candidates={step.candidates}
              className="h-5 w-5 rounded border border-[var(--wow-line)] object-cover"
            />
            <span className="flow-copy">
              <strong>{step.label}</strong>
              <span>{step.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

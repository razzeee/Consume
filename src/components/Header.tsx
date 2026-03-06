import { Link } from '@tanstack/react-router'
import OptionalAuthControls from './OptionalAuthControls'
import WowIcon from './WowIcon'
import {
  getCategoryIconCandidates,
  getRoleIconCandidates,
} from '#/domain/wowIcons'

export default function Header() {
  return (
    <header className="war-header sticky top-0 z-50 px-4">
      <div className="war-header-aurora" aria-hidden="true" />
      <nav className="page-wrap war-nav py-2.5">
        <div className="war-nav-top">
          <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
            <Link to="/" className="brand-seal no-underline">
              <WowIcon
                alt="Guild command crest"
                candidates={getRoleIconCandidates('lead')}
                className="h-7 w-7 rounded border border-[var(--wow-line)] object-cover"
                loading="eager"
              />
              <span className="leading-none brand-copy">
                <strong className="block font-[Alegreya_Sans_SC] text-[0.6rem] font-medium tracking-[0.18em] uppercase text-[var(--wow-accent)]">
                  Turtle WoW Logistics
                </strong>
                <span className="display-title block text-lg font-bold tracking-wide">
                  Consume
                </span>
              </span>
              <WowIcon
                alt="Raid supply crest"
                candidates={getCategoryIconCandidates('flask')}
                className="h-7 w-7 rounded border border-[var(--wow-line)] object-cover"
                loading="eager"
              />
            </Link>
          </h2>

          <div
            className="war-nav-links"
            role="group"
            aria-label="Primary navigation"
          >
            <Link
              to="/"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Home
            </Link>
            <Link
              to="/guilds"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Guilds
            </Link>
            <Link
              to="/about"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              About
            </Link>
            <Link
              to="/settings"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Settings
            </Link>
          </div>

          <div className="war-auth-slot">
            <OptionalAuthControls />
          </div>
        </div>
      </nav>
    </header>
  )
}

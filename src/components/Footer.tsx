import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import WowIcon from './WowIcon'
import {
  getCategoryIconCandidates,
  getRoleIconCandidates,
} from '#/domain/wowIcons'

export default function Footer() {
  return (
    <footer className="war-footer mt-16 px-4 pb-12 pt-8">
      <div className="page-wrap footer-panel px-5 py-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="footer-crests" aria-hidden="true">
            <WowIcon
              alt="Guild crest"
              candidates={getRoleIconCandidates('officer')}
              className="h-6 w-6 rounded border border-[var(--wow-line)] object-cover"
            />
            <WowIcon
              alt="Consumable crest"
              candidates={getCategoryIconCandidates('food')}
              className="h-6 w-6 rounded border border-[var(--wow-line)] object-cover"
            />
          </div>

          <div className="text-center sm:text-left">
            <p className="island-kicker m-0">Raid Consumable Planning</p>
            <p className="m-0 mt-1 text-sm">
              Coordinating flasks, feasts, and pull-night readiness for Turtle
              WoW guilds.
            </p>
          </div>

          <ThemeToggle />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-start">
          <Link to="/guilds" className="campaign-ribbon no-underline">
            Guild Dashboard
          </Link>
          <Link to="/about" className="campaign-ribbon no-underline">
            System Briefing
          </Link>
        </div>
      </div>
    </footer>
  )
}

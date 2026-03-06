import type { FormEvent } from 'react'
import type { GuildInvite } from '#/domain/types'
import WowIcon from '#/components/WowIcon'
import { getProgressIconCandidates } from '#/domain/wowIcons'

type Props = {
  invites: GuildInvite[]
  inviteCreatorName: string
  onInviteCreatorNameChange: (value: string) => void
  onCreateInvite: () => void
  acceptCode: string
  onAcceptCodeChange: (value: string) => void
  acceptCharacterName: string
  onAcceptCharacterNameChange: (value: string) => void
  onAcceptInvite: (event: FormEvent<HTMLFormElement>) => void
  canWrite: boolean
  hasInviteRole: boolean
  mayManageInvites: boolean
}

export default function GuildInvitePanel({
  invites,
  inviteCreatorName,
  onInviteCreatorNameChange,
  onCreateInvite,
  acceptCode,
  onAcceptCodeChange,
  acceptCharacterName,
  onAcceptCharacterNameChange,
  onAcceptInvite,
  canWrite,
  hasInviteRole,
  mayManageInvites,
}: Props) {
  return (
    <div className="section-shell mt-5 p-4">
      <p className="island-kicker mb-2">Invite Flow</p>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--wow-ink-soft)]">
            Created By
          </label>
          <input
            value={inviteCreatorName}
            onChange={(event) => onInviteCreatorNameChange(event.target.value)}
            className="wow-input rounded-lg px-3 py-2 text-sm"
            disabled={!mayManageInvites}
          />
        </div>
        <button
          type="button"
          onClick={onCreateInvite}
          className="wow-button rounded-lg px-4 py-2 text-sm font-semibold"
          disabled={!mayManageInvites}
        >
          Create Invite Code
        </button>
      </div>
      {!canWrite ? (
        <p className="mb-3 mt-0 text-sm text-[var(--wow-ink-soft)]">
          Sign in to manage invites.
        </p>
      ) : !hasInviteRole ? (
        <p className="mb-3 mt-0 text-sm text-[var(--wow-ink-soft)]">
          Invite creation requires officer or lead role.
        </p>
      ) : null}
      <ul className="m-0 list-none space-y-1 p-0 text-sm text-[var(--wow-ink-soft)]">
        {invites.length > 0 ? (
          invites.map((invite) => (
            <li
              key={invite.id}
              className="section-shell inline-flex w-full items-center gap-2 px-3 py-2"
            >
              <WowIcon
                alt={invite.acceptedBy ? 'Accepted invite' : 'Pending invite'}
                candidates={getProgressIconCandidates(
                  invite.acceptedBy ? 1 : 0.3,
                )}
                className="h-4 w-4 rounded border border-[var(--wow-line)] object-cover"
              />
              Code:{' '}
              <span className="font-semibold text-[var(--wow-ink)]">
                {invite.code}
              </span>{' '}
              | Expires: {new Date(invite.expiresAt).toLocaleString()} |{' '}
              {invite.acceptedBy
                ? `Accepted by ${invite.acceptedBy}`
                : 'Pending'}
            </li>
          ))
        ) : (
          <li>No active invites.</li>
        )}
      </ul>

      <form className="mt-3 flex flex-wrap gap-2" onSubmit={onAcceptInvite}>
        <input
          value={acceptCode}
          onChange={(event) => onAcceptCodeChange(event.target.value)}
          placeholder="Invite code"
          className="wow-input rounded-lg px-3 py-2 text-sm"
          disabled={!canWrite}
        />
        <input
          value={acceptCharacterName}
          onChange={(event) => onAcceptCharacterNameChange(event.target.value)}
          placeholder="Character name"
          className="wow-input rounded-lg px-3 py-2 text-sm"
          disabled={!canWrite}
        />
        <button
          type="submit"
          className="wow-button-ready rounded-lg px-4 py-2 text-sm font-semibold"
          disabled={!canWrite}
        >
          Accept Invite
        </button>
      </form>
      {!canWrite ? (
        <p className="mb-0 mt-2 text-sm text-[var(--wow-ink-soft)]">
          Sign in to accept invites.
        </p>
      ) : null}
    </div>
  )
}

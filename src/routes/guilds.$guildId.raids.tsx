import { createFileRoute } from '@tanstack/react-router'
import GuildRaidsPage from './guilds.$guildId/-raids'

export const Route = createFileRoute('/guilds/$guildId/raids')({
  component: RouteComponent,
})

function RouteComponent() {
  const { guildId } = Route.useParams()
  return <GuildRaidsPage guildId={guildId} />
}

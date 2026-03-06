import { createFileRoute } from '@tanstack/react-router'
import GuildRequestsPage from './guilds.$guildId/-requests'

export const Route = createFileRoute('/guilds/$guildId/requests')({
  component: RouteComponent,
})

function RouteComponent() {
  const { guildId } = Route.useParams()
  return <GuildRequestsPage guildId={guildId} />
}

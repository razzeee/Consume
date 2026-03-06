import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useConvexAuth, useMutation, useQueries, useQuery } from 'convex/react'
import { consumableCatalog, guildMembers, guilds } from '#/domain/mockData'
import { resolveConsumeBackendConfig } from '#/domain/backendConfig'
import {
  acceptGuildInvite,
  appendIngredientSupply,
  appendReadySupply,
  prependGuildInvite,
  prependRaidRequest,
  selectGuildInvites,
  selectIngredientSupplies,
  selectRaidRequests,
  selectReadySupplies,
} from '#/domain/consumeStateStore'
import { loadSnapshot, persistSnapshot } from '#/domain/state'
import type { ConsumeStateSnapshot } from '#/domain/state'
import type {
  Consumable,
  Guild,
  GuildInvite,
  GuildMember,
  IngredientSupply,
  RaidRequest,
  ReadyConsumableSupply,
} from '#/domain/types'

interface ConsumeStateValue {
  backend: {
    requested: 'local' | 'convex'
    active: 'local' | 'convex'
    canWrite: boolean
    note?: string
  }
  guilds: Guild[]
  guildMembers: GuildMember[]
  consumableCatalog: Consumable[]
  getGuildById: (guildId: string) => Guild | undefined
  getGuildMembers: (guildId: string) => GuildMember[]
  getGuildInvites: (guildId: string) => GuildInvite[]
  getRaidRequests: (guildId: string) => RaidRequest[]
  getIngredientSupplies: (raidRequestItemId: string) => IngredientSupply[]
  getReadySupplies: (raidRequestItemId: string) => ReadyConsumableSupply[]
  createGuild: (guild: Omit<Guild, 'id'> & { id?: string }) => void
  createInvite: (
    guildId: string,
    createdBy: string,
    code: string,
    expiresAt: number,
  ) => void
  acceptInvite: (guildId: string, code: string, acceptedBy: string) => void
  createRaidRequest: (guildId: string, raidRequest: RaidRequest) => void
  addIngredientSupply: (
    guildId: string,
    raidRequestItemId: string,
    ingredientId: string,
    qty: number,
    contributorName: string,
    note?: string,
  ) => void
  addReadySupply: (
    guildId: string,
    raidRequestItemId: string,
    consumableId: string,
    qty: number,
    contributorName: string,
    note?: string,
  ) => void
}

const ConsumeStateContext = createContext<ConsumeStateValue | undefined>(
  undefined,
)

const listGuildInvitesByExternalIdFn =
  'guildWorkspace:listGuildInvitesByExternalId'
const listRaidRequestsByExternalIdFn =
  'guildWorkspace:listRaidRequestsByExternalId'
const listRaidRequestItemSuppliesByExternalIdFn =
  'guildWorkspace:listRaidRequestItemSuppliesByExternalId'

const createGuildInviteByExternalIdFn =
  'guildWorkspace:createGuildInviteByExternalId'
const acceptGuildInviteByExternalIdFn =
  'guildWorkspace:acceptGuildInviteByExternalId'
const createRaidRequestByExternalIdsFn =
  'guildWorkspace:createRaidRequestByExternalIds'
const addIngredientSupplyByExternalIdsFn =
  'guildWorkspace:addIngredientSupplyByExternalIds'
const addReadyConsumableSupplyByExternalIdsFn =
  'guildWorkspace:addReadyConsumableSupplyByExternalIds'
const listViewerGuildsFn = 'guildWorkspace:listViewerGuilds'
const listGuildMembersByExternalIdFn =
  'guildWorkspace:listGuildMembersByExternalId'
const createGuildByExternalIdFn = 'guildWorkspace:createGuildByExternalId'
const listConsumableCatalogFn = 'recipes:listConsumableCatalog'

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getFallbackConsumable(externalId: string): Consumable {
  return {
    id: externalId,
    name: `Unknown Consumable (${externalId})`,
    category: 'utility',
    iconKey: 'inv_box_01',
    iconPath: '/wow-icons/inv_box_01.jpg',
    recipe: [],
  }
}

function mapRemoteInviteToDomain(invite: any): GuildInvite {
  return {
    id: String(invite.externalId ?? invite._id),
    guildId: String(invite.guildExternalId),
    code: String(invite.code),
    createdBy: String(invite.createdByUserId ?? 'unknown'),
    expiresAt: Number(invite.expiresAt ?? 0),
    acceptedBy:
      invite.acceptedByUserId === undefined
        ? undefined
        : String(invite.acceptedByUserId),
    acceptedAt:
      invite.acceptedAt === undefined ? undefined : Number(invite.acceptedAt),
    createdAt: Number(invite.createdAt ?? 0),
    updatedAt: Number(invite.updatedAt ?? 0),
  }
}

function mapRemoteRaidRequestToDomain(
  request: any,
  catalogById: Map<string, Consumable>,
): RaidRequest {
  const requestId = String(request.externalId ?? request._id)

  return {
    id: requestId,
    guildId: String(request.guildExternalId),
    title: String(request.title),
    raidDate: String(request.raidDate),
    createdAt: Number(request.createdAt ?? 0),
    updatedAt: Number(request.updatedAt ?? 0),
    items: (request.items ?? []).map((item: any) => {
      const consumableExternalId = String(item.consumableExternalId)
      const consumable =
        catalogById.get(consumableExternalId) ??
        getFallbackConsumable(consumableExternalId)

      return {
        id: String(item.externalId ?? item._id),
        raidRequestId: requestId,
        consumable,
        requestedQty: Number(item.requestedQty ?? 0),
        note: item.note === undefined ? undefined : String(item.note),
      }
    }),
  }
}

function toDomainConsumableCategory(value: unknown): Consumable['category'] {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (
    normalized === 'flask' ||
    normalized === 'elixir' ||
    normalized === 'food' ||
    normalized === 'potion'
  ) {
    return normalized
  }

  return 'utility'
}

function mapRemoteCatalogToDomain(result: unknown): Consumable[] {
  if (!Array.isArray(result)) {
    return []
  }

  return result.map((entry: any) => ({
    id: String(entry.externalId),
    name: String(entry.name),
    category: toDomainConsumableCategory(entry.category),
    iconKey: entry.iconKey === undefined ? undefined : String(entry.iconKey),
    iconPath: entry.iconPath === undefined ? undefined : String(entry.iconPath),
    recipe: Array.isArray(entry.recipe)
      ? entry.recipe.map((recipeIngredient: any) => ({
          ingredient: {
            id: String(recipeIngredient.ingredientExternalId),
            name: String(recipeIngredient.ingredientName),
            iconKey:
              recipeIngredient.ingredientIconKey === undefined
                ? undefined
                : String(recipeIngredient.ingredientIconKey),
            iconPath:
              recipeIngredient.ingredientIconPath === undefined
                ? undefined
                : String(recipeIngredient.ingredientIconPath),
          },
          qtyPerConsumable: Number(recipeIngredient.qtyPerConsumable ?? 0),
        }))
      : [],
  }))
}

function useLocalSnapshotState() {
  const [snapshot, setSnapshot] = useState<ConsumeStateSnapshot>(() =>
    loadSnapshot(),
  )
  const [localGuilds, setLocalGuilds] = useState<Guild[]>(() => guilds)
  const [localGuildMembers, setLocalGuildMembers] = useState<GuildMember[]>(
    () => guildMembers,
  )

  useEffect(() => {
    persistSnapshot(snapshot)
  }, [snapshot])

  const getGuildById = useCallback(
    (guildId: string) => localGuilds.find((guild) => guild.id === guildId),
    [localGuilds],
  )

  const getGuildMembers = useCallback(
    (guildId: string) =>
      localGuildMembers.filter((member) => member.guildId === guildId),
    [localGuildMembers],
  )

  const createGuild = useCallback(
    (guild: Omit<Guild, 'id'> & { id?: string }) => {
      const guildId = guild.id ?? createLocalId('guild')
      const guildToCreate: Guild = {
        id: guildId,
        name: guild.name,
        realm: guild.realm,
        faction: guild.faction,
      }

      const existing = localGuilds.find((entry) => entry.id === guildId)
      if (existing) {
        return existing
      }

      setLocalGuilds((current) => [guildToCreate, ...current])

      setLocalGuildMembers((current) => [
        {
          id: createLocalId('member'),
          guildId,
          characterName: 'You',
          role: 'lead',
        },
        ...current,
      ])

      return guildToCreate
    },
    [localGuilds],
  )

  const getGuildInvites = useCallback(
    (guildId: string) => selectGuildInvites(snapshot, guildId),
    [snapshot.guildInvites],
  )

  const getRaidRequests = useCallback(
    (guildId: string) => selectRaidRequests(snapshot, guildId),
    [snapshot.raidRequestsByGuildId],
  )

  const getIngredientSupplies = useCallback(
    (raidRequestItemId: string) =>
      selectIngredientSupplies(snapshot, raidRequestItemId),
    [snapshot.ingredientSuppliesByRequestItemId],
  )

  const getReadySupplies = useCallback(
    (raidRequestItemId: string) =>
      selectReadySupplies(snapshot, raidRequestItemId),
    [snapshot.readySuppliesByRequestItemId],
  )

  const createInvite = useCallback(
    (guildId: string, createdBy: string, code: string, expiresAt: number) => {
      const nowMs = Date.now()
      const invite: GuildInvite = {
        id: createLocalId('invite'),
        guildId,
        code,
        createdBy,
        expiresAt,
        createdAt: nowMs,
        updatedAt: nowMs,
      }

      setSnapshot((current) => prependGuildInvite(current, invite))

      return invite
    },
    [],
  )

  const acceptInvite = useCallback(
    (guildId: string, code: string, acceptedBy: string) => {
      let didAccept = false

      setSnapshot((current) => {
        const result = acceptGuildInvite(current, guildId, code, acceptedBy)
        didAccept = result.didAccept
        return result.snapshot
      })

      return didAccept
    },
    [],
  )

  const createRaidRequest = useCallback(
    (guildId: string, raidRequest: RaidRequest) => {
      setSnapshot((current) =>
        prependRaidRequest(current, guildId, raidRequest),
      )
    },
    [],
  )

  const addIngredientSupply = useCallback(
    (
      guildId: string,
      raidRequestItemId: string,
      ingredientId: string,
      qty: number,
      contributorName: string,
      note?: string,
    ) => {
      const nowMs = Date.now()
      const supply: IngredientSupply = {
        id: createLocalId('ingredient-supply'),
        raidRequestItemId,
        ingredientId,
        qty,
        contributorName,
        suppliedAt: nowMs,
        createdAt: nowMs,
        updatedAt: nowMs,
        note,
      }

      setSnapshot((current) =>
        appendIngredientSupply(current, raidRequestItemId, supply),
      )

      void guildId
      return supply
    },
    [],
  )

  const addReadySupply = useCallback(
    (
      guildId: string,
      raidRequestItemId: string,
      consumableId: string,
      qty: number,
      contributorName: string,
      note?: string,
    ) => {
      const nowMs = Date.now()
      const supply: ReadyConsumableSupply = {
        id: createLocalId('ready-supply'),
        raidRequestItemId,
        consumableId,
        qty,
        contributorName,
        suppliedAt: nowMs,
        createdAt: nowMs,
        updatedAt: nowMs,
        note,
      }

      setSnapshot((current) =>
        appendReadySupply(current, raidRequestItemId, supply),
      )

      void guildId
      return supply
    },
    [],
  )

  return {
    localGuilds,
    localGuildMembers,
    snapshot,
    setSnapshot,
    getGuildById,
    getGuildMembers,
    createGuild,
    getGuildInvites,
    getRaidRequests,
    getIngredientSupplies,
    getReadySupplies,
    createInvite,
    acceptInvite,
    createRaidRequest,
    addIngredientSupply,
    addReadySupply,
  }
}

function LocalConsumeStateProvider({
  children,
  requested,
  note,
}: {
  children: ReactNode
  requested: 'local' | 'convex'
  note?: string
}) {
  const local = useLocalSnapshotState()

  const value = useMemo<ConsumeStateValue>(
    () => ({
      backend: {
        requested,
        active: 'local',
        canWrite: true,
        note,
      },
      guilds: local.localGuilds,
      guildMembers: local.localGuildMembers,
      consumableCatalog,
      getGuildById: local.getGuildById,
      getGuildMembers: local.getGuildMembers,
      getGuildInvites: local.getGuildInvites,
      getRaidRequests: local.getRaidRequests,
      getIngredientSupplies: local.getIngredientSupplies,
      getReadySupplies: local.getReadySupplies,
      createGuild: local.createGuild,
      createInvite: local.createInvite,
      acceptInvite: local.acceptInvite,
      createRaidRequest: local.createRaidRequest,
      addIngredientSupply: local.addIngredientSupply,
      addReadySupply: local.addReadySupply,
    }),
    [local, note, requested],
  )

  return (
    <ConsumeStateContext.Provider value={value}>
      {children}
    </ConsumeStateContext.Provider>
  )
}

function ConvexConsumeStateProvider({
  children,
  requested,
  note: backendConfigNote,
}: {
  children: ReactNode
  requested: 'local' | 'convex'
  note?: string
}) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  const createGuildMutation = useMutation(createGuildByExternalIdFn as any)

  const createInviteMutation = useMutation(
    createGuildInviteByExternalIdFn as any,
  )
  const acceptInviteMutation = useMutation(
    acceptGuildInviteByExternalIdFn as any,
  )
  const createRaidRequestMutation = useMutation(
    createRaidRequestByExternalIdsFn as any,
  )
  const addIngredientSupplyMutation = useMutation(
    addIngredientSupplyByExternalIdsFn as any,
  )
  const addReadySupplyMutation = useMutation(
    addReadyConsumableSupplyByExternalIdsFn as any,
  )

  const remoteCatalogResult = useQuery(listConsumableCatalogFn as any, {})
  const remoteConsumableCatalog = useMemo(
    () => mapRemoteCatalogToDomain(remoteCatalogResult),
    [remoteCatalogResult],
  )
  const activeConsumableCatalog = useMemo(
    () =>
      remoteConsumableCatalog.length > 0
        ? remoteConsumableCatalog
        : consumableCatalog,
    [remoteConsumableCatalog],
  )

  const viewerGuildQuerySpec = useMemo(() => {
    if (!isAuthenticated) {
      return {}
    }

    return {
      viewerGuilds: {
        query: listViewerGuildsFn,
        args: {},
      },
    }
  }, [isAuthenticated])

  const viewerGuildQueryResults = useQueries(viewerGuildQuerySpec as any)

  const remoteGuilds = useMemo(() => {
    const result = viewerGuildQueryResults.viewerGuilds
    if (!result || result instanceof Error) {
      return [] as Guild[]
    }

    return (result as any[]).map((guild) => ({
      id: String(guild.externalId),
      name: String(guild.name),
      realm: guild.realm as Guild['realm'],
      faction: guild.faction as Guild['faction'],
    }))
  }, [viewerGuildQueryResults])

  const guildMembersQuerySpec = useMemo(() => {
    if (!isAuthenticated) {
      return {}
    }

    return Object.fromEntries(
      remoteGuilds.map((guild) => [
        guild.id,
        {
          query: listGuildMembersByExternalIdFn,
          args: {
            guildExternalId: guild.id,
          },
        },
      ]),
    )
  }, [isAuthenticated, remoteGuilds])

  const guildMembersQueryResults = useQueries(guildMembersQuerySpec as any)

  const remoteGuildMembers = useMemo(() => {
    const members: GuildMember[] = []

    for (const guild of remoteGuilds) {
      const result = guildMembersQueryResults[guild.id]
      if (!result || result instanceof Error) {
        continue
      }

      for (const member of result as any[]) {
        members.push({
          id: `${guild.id}-${String(member.userId)}`,
          guildId: guild.id,
          characterName: String(member.characterName ?? member.userId),
          role: member.role as GuildMember['role'],
        })
      }
    }

    return members
  }, [guildMembersQueryResults, remoteGuilds])

  const invitesQuerySpec = useMemo(() => {
    if (!isAuthenticated) {
      return {}
    }

    return Object.fromEntries(
      remoteGuilds.map((guild) => [
        guild.id,
        {
          query: listGuildInvitesByExternalIdFn,
          args: {
            guildExternalId: guild.id,
          },
        },
      ]),
    )
  }, [isAuthenticated, remoteGuilds])

  const raidRequestsQuerySpec = useMemo(() => {
    if (!isAuthenticated) {
      return {}
    }

    return Object.fromEntries(
      remoteGuilds.map((guild) => [
        guild.id,
        {
          query: listRaidRequestsByExternalIdFn,
          args: {
            guildExternalId: guild.id,
          },
        },
      ]),
    )
  }, [isAuthenticated, remoteGuilds])

  const inviteQueryResults = useQueries(invitesQuerySpec as any)
  const raidRequestQueryResults = useQueries(raidRequestsQuerySpec as any)

  const catalogById = useMemo(
    () =>
      new Map(
        activeConsumableCatalog.map((consumable) => [
          consumable.id,
          consumable,
        ]),
      ),
    [activeConsumableCatalog],
  )

  const remoteGuildInvitesByGuildId = useMemo(() => {
    const byGuildId: Record<string, GuildInvite[]> = {}

    for (const guild of remoteGuilds) {
      const result = inviteQueryResults[guild.id]
      byGuildId[guild.id] =
        result && !(result instanceof Error)
          ? (result as any[]).map(mapRemoteInviteToDomain)
          : []
    }

    return byGuildId
  }, [inviteQueryResults, remoteGuilds])

  const remoteRaidRequestsByGuildId = useMemo(() => {
    const byGuildId: Record<string, RaidRequest[]> = {}

    for (const guild of remoteGuilds) {
      const result = raidRequestQueryResults[guild.id]
      byGuildId[guild.id] =
        result && !(result instanceof Error)
          ? (result as any[]).map((request) =>
              mapRemoteRaidRequestToDomain(request, catalogById),
            )
          : []
    }

    return byGuildId
  }, [catalogById, raidRequestQueryResults, remoteGuilds])

  const supplyQuerySpec = useMemo(() => {
    if (!isAuthenticated) {
      return {}
    }

    const itemIds = new Set<string>()
    for (const requests of Object.values(remoteRaidRequestsByGuildId)) {
      for (const request of requests) {
        for (const item of request.items) {
          itemIds.add(item.id)
        }
      }
    }

    return Object.fromEntries(
      [...itemIds].map((itemId) => [
        itemId,
        {
          query: listRaidRequestItemSuppliesByExternalIdFn,
          args: {
            raidRequestItemExternalId: itemId,
          },
        },
      ]),
    )
  }, [isAuthenticated, remoteRaidRequestsByGuildId])

  const supplyQueryResults = useQueries(supplyQuerySpec as any)

  const remoteIngredientSuppliesByRequestItemId = useMemo(() => {
    const byItemId: Record<string, IngredientSupply[]> = {}

    for (const [requestItemId, result] of Object.entries(supplyQueryResults)) {
      if (!result || result instanceof Error) {
        byItemId[requestItemId] = []
        continue
      }

      const typedResult = result as {
        ingredientSupplies?: any[]
      }

      byItemId[requestItemId] = (typedResult.ingredientSupplies ?? []).map(
        (supply: any) => ({
          id: String(supply.externalId ?? supply._id),
          raidRequestItemId: requestItemId,
          ingredientId: String(supply.ingredientExternalId),
          qty: Number(supply.qty ?? 0),
          contributorName: String(
            supply.contributorName ?? supply.contributorUserId ?? 'unknown',
          ),
          suppliedAt: Number(supply.suppliedAt ?? 0),
          note: supply.note === undefined ? undefined : String(supply.note),
          createdAt: Number(supply.createdAt ?? 0),
          updatedAt: Number(supply.updatedAt ?? 0),
        }),
      )
    }

    return byItemId
  }, [supplyQueryResults])

  const remoteReadySuppliesByRequestItemId = useMemo(() => {
    const byItemId: Record<string, ReadyConsumableSupply[]> = {}

    for (const [requestItemId, result] of Object.entries(supplyQueryResults)) {
      if (!result || result instanceof Error) {
        byItemId[requestItemId] = []
        continue
      }

      const typedResult = result as {
        readyConsumableSupplies?: any[]
      }

      byItemId[requestItemId] = (typedResult.readyConsumableSupplies ?? []).map(
        (supply: any) => ({
          id: String(supply.externalId ?? supply._id),
          raidRequestItemId: requestItemId,
          consumableId: String(supply.consumableExternalId),
          qty: Number(supply.qty ?? 0),
          contributorName: String(
            supply.contributorName ?? supply.contributorUserId ?? 'unknown',
          ),
          suppliedAt: Number(supply.suppliedAt ?? 0),
          note: supply.note === undefined ? undefined : String(supply.note),
          createdAt: Number(supply.createdAt ?? 0),
          updatedAt: Number(supply.updatedAt ?? 0),
        }),
      )
    }

    return byItemId
  }, [supplyQueryResults])

  const shouldUseRemote = isAuthenticated
  const activeGuilds = shouldUseRemote ? remoteGuilds : []
  const activeGuildMembers = shouldUseRemote ? remoteGuildMembers : []

  const getGuildById = useCallback(
    (guildId: string) => activeGuilds.find((guild) => guild.id === guildId),
    [activeGuilds],
  )

  const getGuildMembers = useCallback(
    (guildId: string) =>
      activeGuildMembers.filter((member) => member.guildId === guildId),
    [activeGuildMembers],
  )

  const getGuildInvites = useCallback(
    (guildId: string) => {
      return remoteGuildInvitesByGuildId[guildId] ?? []
    },
    [remoteGuildInvitesByGuildId],
  )

  const getRaidRequests = useCallback(
    (guildId: string) => {
      return remoteRaidRequestsByGuildId[guildId] ?? []
    },
    [remoteRaidRequestsByGuildId],
  )

  const getIngredientSupplies = useCallback(
    (raidRequestItemId: string) => {
      return remoteIngredientSuppliesByRequestItemId[raidRequestItemId] ?? []
    },
    [remoteIngredientSuppliesByRequestItemId],
  )

  const getReadySupplies = useCallback(
    (raidRequestItemId: string) => {
      return remoteReadySuppliesByRequestItemId[raidRequestItemId] ?? []
    },
    [remoteReadySuppliesByRequestItemId],
  )

  const createInvite = useCallback(
    (guildId: string, createdBy: string, code: string, expiresAt: number) => {
      if (!shouldUseRemote) {
        throw new Error('Sign in to create invites.')
      }

      void createInviteMutation({
        guildExternalId: guildId,
        code,
        expiresAt,
      }).catch((error: unknown) => {
        console.error('[consume] createInvite convex sync failed', error)
      })

      void createdBy
    },
    [createInviteMutation, shouldUseRemote],
  )

  const createGuild = useCallback(
    (guild: Omit<Guild, 'id'> & { id?: string }) => {
      if (!shouldUseRemote) {
        throw new Error('Sign in to create a guild.')
      }

      void createGuildMutation({
        name: guild.name,
        slug: toSlug(guild.id ?? guild.name),
        realm: guild.realm,
        faction: guild.faction,
      }).catch((error: unknown) => {
        console.error('[consume] createGuild convex sync failed', error)
      })
    },
    [createGuildMutation, shouldUseRemote],
  )

  const acceptInvite = useCallback(
    (guildId: string, code: string, acceptedBy: string) => {
      if (!shouldUseRemote) {
        throw new Error('Sign in to accept invites.')
      }

      void acceptInviteMutation({
        guildExternalId: guildId,
        code,
      }).catch((error: unknown) => {
        console.error('[consume] acceptInvite convex sync failed', error)
      })

      void acceptedBy
    },
    [acceptInviteMutation, shouldUseRemote],
  )

  const createRaidRequest = useCallback(
    (guildId: string, raidRequest: RaidRequest) => {
      if (!shouldUseRemote) {
        throw new Error('Sign in to create raid requests.')
      }

      void createRaidRequestMutation({
        guildExternalId: guildId,
        externalId: raidRequest.id,
        title: raidRequest.title,
        raidDate: raidRequest.raidDate,
        items: raidRequest.items.map((item) => ({
          externalId: item.id,
          consumableExternalId: item.consumable.id,
          requestedQty: item.requestedQty,
          note: item.note,
        })),
      }).catch((error: unknown) => {
        console.error('[consume] createRaidRequest convex sync failed', error)
      })
    },
    [createRaidRequestMutation, shouldUseRemote],
  )

  const addIngredientSupply = useCallback(
    (
      guildId: string,
      raidRequestItemId: string,
      ingredientId: string,
      qty: number,
      contributorName: string,
      supplyNote?: string,
    ) => {
      if (!shouldUseRemote) {
        throw new Error('Sign in to add ingredient supplies.')
      }

      void addIngredientSupplyMutation({
        guildExternalId: guildId,
        raidRequestItemExternalId: raidRequestItemId,
        ingredientExternalId: ingredientId,
        qty,
        note: supplyNote,
      }).catch((error: unknown) => {
        console.error('[consume] addIngredientSupply convex sync failed', error)
      })

      void contributorName
    },
    [addIngredientSupplyMutation, shouldUseRemote],
  )

  const addReadySupply = useCallback(
    (
      guildId: string,
      raidRequestItemId: string,
      consumableId: string,
      qty: number,
      contributorName: string,
      supplyNote?: string,
    ) => {
      if (!shouldUseRemote) {
        throw new Error('Sign in to add ready consumables.')
      }

      void addReadySupplyMutation({
        guildExternalId: guildId,
        raidRequestItemExternalId: raidRequestItemId,
        consumableExternalId: consumableId,
        qty,
        note: supplyNote,
      }).catch((error: unknown) => {
        console.error('[consume] addReadySupply convex sync failed', error)
      })

      void contributorName
    },
    [addReadySupplyMutation, shouldUseRemote],
  )

  const backendNote = useMemo(() => {
    const notes = []

    if (backendConfigNote) {
      notes.push(backendConfigNote)
    }

    if (isLoading) {
      notes.push('Checking Convex auth state...')
    } else if (!isAuthenticated) {
      notes.push('Sign in to access Convex workspace data.')
    } else {
      notes.push('Convex workspace data is active.')
    }

    return notes.join(' ')
  }, [backendConfigNote, isAuthenticated, isLoading])

  const value = useMemo<ConsumeStateValue>(
    () => ({
      backend: {
        requested,
        active: 'convex',
        canWrite: shouldUseRemote,
        note: backendNote,
      },
      guilds: activeGuilds,
      guildMembers: activeGuildMembers,
      consumableCatalog: activeConsumableCatalog,
      getGuildById,
      getGuildMembers,
      getGuildInvites,
      getRaidRequests,
      getIngredientSupplies,
      getReadySupplies,
      createGuild,
      createInvite,
      acceptInvite,
      createRaidRequest,
      addIngredientSupply,
      addReadySupply,
    }),
    [
      acceptInvite,
      addIngredientSupply,
      addReadySupply,
      backendNote,
      activeGuildMembers,
      activeGuilds,
      activeConsumableCatalog,
      shouldUseRemote,
      createGuild,
      createInvite,
      createRaidRequest,
      getGuildById,
      getGuildInvites,
      getGuildMembers,
      getIngredientSupplies,
      getRaidRequests,
      getReadySupplies,
      requested,
    ],
  )

  return (
    <ConsumeStateContext.Provider value={value}>
      {children}
    </ConsumeStateContext.Provider>
  )
}

export function ConsumeStateProvider({ children }: { children: ReactNode }) {
  const backendConfig = useMemo(() => resolveConsumeBackendConfig(), [])

  useEffect(() => {
    if (backendConfig.note) {
      console.info(`[consume] ${backendConfig.note}`)
    }
  }, [backendConfig.note])

  if (
    backendConfig.active === 'convex' &&
    backendConfig.shouldProvideConvexClient
  ) {
    return (
      <ConvexConsumeStateProvider
        requested={backendConfig.requested}
        note={backendConfig.note}
      >
        {children}
      </ConvexConsumeStateProvider>
    )
  }

  return (
    <LocalConsumeStateProvider
      requested={backendConfig.requested}
      note={backendConfig.note}
    >
      {children}
    </LocalConsumeStateProvider>
  )
}

export function useConsumeState() {
  const context = useContext(ConsumeStateContext)
  if (!context) {
    throw new Error('useConsumeState must be used inside ConsumeStateProvider')
  }
  return context
}

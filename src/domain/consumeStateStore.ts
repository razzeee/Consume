import type { ConsumeStateSnapshot } from "./state";
import type {
    GuildInvite,
    IngredientSupply,
    RaidRequest,
    ReadyConsumableSupply,
} from "./types";

export function selectGuildInvites(
    snapshot: ConsumeStateSnapshot,
    guildId: string,
): GuildInvite[] {
    return snapshot.guildInvites.filter((invite) => invite.guildId === guildId);
}

export function selectRaidRequests(
    snapshot: ConsumeStateSnapshot,
    guildId: string,
): RaidRequest[] {
    return snapshot.raidRequestsByGuildId[guildId] ?? [];
}

export function selectIngredientSupplies(
    snapshot: ConsumeStateSnapshot,
    raidRequestItemId: string,
): IngredientSupply[] {
    return snapshot.ingredientSuppliesByRequestItemId[raidRequestItemId] ?? [];
}

export function selectReadySupplies(
    snapshot: ConsumeStateSnapshot,
    raidRequestItemId: string,
): ReadyConsumableSupply[] {
    return snapshot.readySuppliesByRequestItemId[raidRequestItemId] ?? [];
}

export function prependGuildInvite(
    snapshot: ConsumeStateSnapshot,
    invite: GuildInvite,
): ConsumeStateSnapshot {
    return {
        ...snapshot,
        guildInvites: [invite, ...snapshot.guildInvites],
    };
}

export function acceptGuildInvite(
    snapshot: ConsumeStateSnapshot,
    guildId: string,
    code: string,
    acceptedBy: string,
): { snapshot: ConsumeStateSnapshot; didAccept: boolean } {
    const nowMs = Date.now();
    let didAccept = false;

    const guildInvites = snapshot.guildInvites.map((invite) => {
        const matchesGuild = invite.guildId === guildId;
        const matchesCode = invite.code.toUpperCase() === code.toUpperCase();

        if (!matchesGuild || !matchesCode || invite.acceptedBy) {
            return invite;
        }

        didAccept = true;
        return {
            ...invite,
            acceptedBy,
            acceptedAt: nowMs,
            updatedAt: nowMs,
        };
    });

    return {
        snapshot: {
            ...snapshot,
            guildInvites,
        },
        didAccept,
    };
}

export function prependRaidRequest(
    snapshot: ConsumeStateSnapshot,
    guildId: string,
    raidRequest: RaidRequest,
): ConsumeStateSnapshot {
    return {
        ...snapshot,
        raidRequestsByGuildId: {
            ...snapshot.raidRequestsByGuildId,
            [guildId]: [
                raidRequest,
                ...(snapshot.raidRequestsByGuildId[guildId] ?? []),
            ],
        },
    };
}

export function appendIngredientSupply(
    snapshot: ConsumeStateSnapshot,
    raidRequestItemId: string,
    supply: IngredientSupply,
): ConsumeStateSnapshot {
    return {
        ...snapshot,
        ingredientSuppliesByRequestItemId: {
            ...snapshot.ingredientSuppliesByRequestItemId,
            [raidRequestItemId]: [
                ...(snapshot
                    .ingredientSuppliesByRequestItemId[raidRequestItemId] ??
                    []),
                supply,
            ],
        },
    };
}

export function appendReadySupply(
    snapshot: ConsumeStateSnapshot,
    raidRequestItemId: string,
    supply: ReadyConsumableSupply,
): ConsumeStateSnapshot {
    return {
        ...snapshot,
        readySuppliesByRequestItemId: {
            ...snapshot.readySuppliesByRequestItemId,
            [raidRequestItemId]: [
                ...(snapshot.readySuppliesByRequestItemId[raidRequestItemId] ??
                    []),
                supply,
            ],
        },
    };
}

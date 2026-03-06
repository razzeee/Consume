import {
    guildInvites,
    ingredientSuppliesByRequestItemId,
    raidRequestsByGuildId,
    readySuppliesByRequestItemId,
} from "./mockData";
import type {
    GuildInvite,
    IngredientSupply,
    RaidRequest,
    ReadyConsumableSupply,
} from "./types";

const STORAGE_KEY = "consume.app-state.v1";

export interface ConsumeStateSnapshot {
    guildInvites: GuildInvite[];
    raidRequestsByGuildId: Record<string, RaidRequest[]>;
    ingredientSuppliesByRequestItemId: Record<string, IngredientSupply[]>;
    readySuppliesByRequestItemId: Record<string, ReadyConsumableSupply[]>;
}

function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultSnapshot(): ConsumeStateSnapshot {
    return {
        guildInvites: deepClone(guildInvites),
        raidRequestsByGuildId: deepClone(raidRequestsByGuildId),
        ingredientSuppliesByRequestItemId: deepClone(
            ingredientSuppliesByRequestItemId,
        ),
        readySuppliesByRequestItemId: deepClone(readySuppliesByRequestItemId),
    };
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function loadSnapshot(): ConsumeStateSnapshot {
    const fallback = createDefaultSnapshot();

    if (typeof window === "undefined") {
        return fallback;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return fallback;
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isObject(parsed)) {
            return fallback;
        }

        if (
            !Array.isArray(parsed.guildInvites) ||
            !isObject(parsed.raidRequestsByGuildId) ||
            !isObject(parsed.ingredientSuppliesByRequestItemId) ||
            !isObject(parsed.readySuppliesByRequestItemId)
        ) {
            return fallback;
        }

        return {
            guildInvites: parsed.guildInvites as GuildInvite[],
            raidRequestsByGuildId: parsed.raidRequestsByGuildId as Record<
                string,
                RaidRequest[]
            >,
            ingredientSuppliesByRequestItemId: parsed
                .ingredientSuppliesByRequestItemId as Record<
                    string,
                    IngredientSupply[]
                >,
            readySuppliesByRequestItemId: parsed
                .readySuppliesByRequestItemId as Record<
                    string,
                    ReadyConsumableSupply[]
                >,
        };
    } catch {
        return fallback;
    }
}

export function persistSnapshot(snapshot: ConsumeStateSnapshot) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

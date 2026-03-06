import { describe, expect, it, vi } from "vitest";
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
} from "./consumeStateStore";
import type { ConsumeStateSnapshot } from "./state";
import type {
    GuildInvite,
    IngredientSupply,
    RaidRequest,
    ReadyConsumableSupply,
} from "./types";

function createSnapshot(): ConsumeStateSnapshot {
    const baseMs = Date.parse("2026-03-05T10:00:00.000Z");

    return {
        guildInvites: [
            {
                id: "invite-1",
                guildId: "guild-1",
                code: "ABC-123",
                createdBy: "LeadOne",
                expiresAt: Date.parse("2026-03-10T00:00:00.000Z"),
                createdAt: baseMs,
                updatedAt: baseMs,
            },
        ],
        raidRequestsByGuildId: {
            "guild-1": [
                {
                    id: "request-1",
                    guildId: "guild-1",
                    title: "Naxx Prep",
                    raidDate: "2026-03-11",
                    createdAt: baseMs,
                    updatedAt: baseMs,
                    items: [],
                },
            ],
        },
        ingredientSuppliesByRequestItemId: {
            "item-1": [
                {
                    id: "ingredient-1",
                    raidRequestItemId: "item-1",
                    ingredientId: "mats-1",
                    qty: 4,
                    contributorName: "Gatherer",
                    suppliedAt: baseMs,
                    createdAt: baseMs,
                    updatedAt: baseMs,
                },
            ],
        },
        readySuppliesByRequestItemId: {
            "item-1": [
                {
                    id: "ready-1",
                    raidRequestItemId: "item-1",
                    consumableId: "consumable-1",
                    qty: 2,
                    contributorName: "Crafter",
                    suppliedAt: baseMs + 5 * 60 * 1000,
                    createdAt: baseMs + 5 * 60 * 1000,
                    updatedAt: baseMs + 5 * 60 * 1000,
                },
            ],
        },
    };
}

describe("consumeStateStore", () => {
    it("selects guild scoped values", () => {
        const snapshot = createSnapshot();

        expect(selectGuildInvites(snapshot, "guild-1")).toHaveLength(1);
        expect(selectRaidRequests(snapshot, "guild-1")).toHaveLength(1);
        expect(selectIngredientSupplies(snapshot, "item-1")).toHaveLength(1);
        expect(selectReadySupplies(snapshot, "item-1")).toHaveLength(1);

        expect(selectGuildInvites(snapshot, "missing")).toEqual([]);
        expect(selectRaidRequests(snapshot, "missing")).toEqual([]);
        expect(selectIngredientSupplies(snapshot, "missing")).toEqual([]);
        expect(selectReadySupplies(snapshot, "missing")).toEqual([]);
    });

    it("prepends invite and raid request records", () => {
        const snapshot = createSnapshot();

        const invite: GuildInvite = {
            id: "invite-2",
            guildId: "guild-1",
            code: "XYZ-999",
            createdBy: "LeadTwo",
            expiresAt: Date.parse("2026-03-12T00:00:00.000Z"),
            createdAt: Date.parse("2026-03-06T09:00:00.000Z"),
            updatedAt: Date.parse("2026-03-06T09:00:00.000Z"),
        };

        const nextAfterInvite = prependGuildInvite(snapshot, invite);
        expect(nextAfterInvite.guildInvites[0]).toEqual(invite);
        expect(nextAfterInvite.guildInvites).toHaveLength(2);

        const raidRequest: RaidRequest = {
            id: "request-2",
            guildId: "guild-1",
            title: "AQ40",
            raidDate: "2026-03-12",
            createdAt: Date.parse("2026-03-06T09:10:00.000Z"),
            updatedAt: Date.parse("2026-03-06T09:10:00.000Z"),
            items: [],
        };

        const nextAfterRequest = prependRaidRequest(
            nextAfterInvite,
            "guild-1",
            raidRequest,
        );
        expect(nextAfterRequest.raidRequestsByGuildId["guild-1"][0]).toEqual(
            raidRequest,
        );
        expect(nextAfterRequest.raidRequestsByGuildId["guild-1"]).toHaveLength(
            2,
        );
    });

    it("accepts invite case-insensitively and appends supplies", () => {
        const snapshot = createSnapshot();
        const nowMs = Date.parse("2026-03-06T11:00:00.000Z");
        const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(nowMs);

        const accepted = acceptGuildInvite(
            snapshot,
            "guild-1",
            "abc-123",
            "NewMember",
        );
        expect(accepted.didAccept).toBe(true);
        expect(accepted.snapshot.guildInvites[0].acceptedBy).toBe("NewMember");
        expect(accepted.snapshot.guildInvites[0].acceptedAt).toBe(nowMs);
        expect(accepted.snapshot.guildInvites[0].updatedAt).toBe(nowMs);

        const notAccepted = acceptGuildInvite(
            accepted.snapshot,
            "guild-1",
            "abc-123",
            "SecondMember",
        );
        expect(notAccepted.didAccept).toBe(false);

        const ingredientSupply: IngredientSupply = {
            id: "ingredient-2",
            raidRequestItemId: "item-1",
            ingredientId: "mats-2",
            qty: 6,
            contributorName: "Farmer",
            suppliedAt: Date.parse("2026-03-05T10:06:00.000Z"),
            createdAt: Date.parse("2026-03-05T10:06:00.000Z"),
            updatedAt: Date.parse("2026-03-05T10:06:00.000Z"),
        };

        const withIngredient = appendIngredientSupply(
            notAccepted.snapshot,
            "item-1",
            ingredientSupply,
        );
        expect(withIngredient.ingredientSuppliesByRequestItemId["item-1"])
            .toHaveLength(2);

        const readySupply: ReadyConsumableSupply = {
            id: "ready-2",
            raidRequestItemId: "item-1",
            consumableId: "consumable-1",
            qty: 5,
            contributorName: "Alchemist",
            suppliedAt: Date.parse("2026-03-05T10:07:00.000Z"),
            createdAt: Date.parse("2026-03-05T10:07:00.000Z"),
            updatedAt: Date.parse("2026-03-05T10:07:00.000Z"),
        };

        const withReady = appendReadySupply(
            withIngredient,
            "item-1",
            readySupply,
        );
        expect(withReady.readySuppliesByRequestItemId["item-1"]).toHaveLength(
            2,
        );

        dateNowSpy.mockRestore();
    });
});

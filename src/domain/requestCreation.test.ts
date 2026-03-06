import { describe, expect, it } from "vitest";
import { buildRaidRequestFromDraft } from "./requestCreation";
import type { Consumable } from "./types";

const catalog: Consumable[] = [
    {
        id: "consumable-1",
        name: "Flask of Arcana",
        category: "flask",
        recipe: [],
    },
    {
        id: "consumable-2",
        name: "Greater Fire Protection Potion",
        category: "potion",
        recipe: [],
    },
];

describe("buildRaidRequestFromDraft", () => {
    it("builds a request with multiple valid items", () => {
        let counter = 0;
        const nowMs = 1760000000000;
        const result = buildRaidRequestFromDraft({
            guildId: "guild-1",
            title: "Naxxramas Prep",
            raidDate: "2026-03-12",
            draftItems: [
                { consumableId: "consumable-1", qty: 24 },
                {
                    consumableId: "consumable-2",
                    qty: 40,
                    note: "Tank group priority",
                },
            ],
            consumableCatalog: catalog,
            idFactory: (prefix) => `${prefix}-${++counter}`,
            nowFactory: () => nowMs,
        });

        expect(result.errors).toEqual([]);
        expect(result.raidRequest).not.toBeNull();

        expect(result.raidRequest).toEqual({
            id: "request-1",
            guildId: "guild-1",
            title: "Naxxramas Prep",
            raidDate: "2026-03-12",
            createdAt: nowMs,
            updatedAt: nowMs,
            items: [
                {
                    id: "item-2",
                    raidRequestId: "request-1",
                    consumable: catalog[0],
                    requestedQty: 24,
                    note: undefined,
                },
                {
                    id: "item-3",
                    raidRequestId: "request-1",
                    consumable: catalog[1],
                    requestedQty: 40,
                    note: "Tank group priority",
                },
            ],
        });
    });

    it("returns errors for invalid lines", () => {
        const result = buildRaidRequestFromDraft({
            guildId: "guild-1",
            title: "AQ40",
            raidDate: "2026-04-01",
            draftItems: [
                { consumableId: "invalid-id", qty: 10 },
                { consumableId: "consumable-2", qty: 0 },
            ],
            consumableCatalog: catalog,
        });

        expect(result.raidRequest).toBeNull();
        expect(result.errors).toEqual([
            "Line 1: Select a valid consumable.",
            "Line 2: Quantity must be greater than 0.",
        ]);
    });

    it("requires title and raid date", () => {
        const missingTitle = buildRaidRequestFromDraft({
            guildId: "guild-1",
            title: "   ",
            raidDate: "2026-03-12",
            draftItems: [{ consumableId: "consumable-1", qty: 12 }],
            consumableCatalog: catalog,
        });
        expect(missingTitle.errors).toEqual(["Request title is required."]);

        const missingDate = buildRaidRequestFromDraft({
            guildId: "guild-1",
            title: "BWL",
            raidDate: " ",
            draftItems: [{ consumableId: "consumable-1", qty: 12 }],
            consumableCatalog: catalog,
        });
        expect(missingDate.errors).toEqual(["Raid date is required."]);
    });
});

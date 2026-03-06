import { describe, expect, it } from "vitest";
import {
    appendIngredientSupply,
    appendReadySupply,
    selectIngredientSupplies,
    selectReadySupplies,
} from "./consumeStateStore";
import { calculateRaidRequestFulfillment } from "./fulfillment";
import { canMemberSupply } from "./permissions";
import type { ConsumeStateSnapshot } from "./state";
import type {
    IngredientSupply,
    RaidRequestItem,
    ReadyConsumableSupply,
} from "./types";

function createEmptySnapshot(): ConsumeStateSnapshot {
    return {
        guildInvites: [],
        raidRequestsByGuildId: {},
        ingredientSuppliesByRequestItemId: {},
        readySuppliesByRequestItemId: {},
    };
}

function createRequestItem(): RaidRequestItem {
    return {
        id: "item-1",
        raidRequestId: "request-1",
        requestedQty: 10,
        consumable: {
            id: "consumable-1",
            name: "Arcane Flask",
            category: "flask",
            recipe: [
                {
                    ingredient: {
                        id: "herb",
                        name: "Arcane Herb",
                    },
                    qtyPerConsumable: 2,
                },
                {
                    ingredient: {
                        id: "vial",
                        name: "Crystal Vial",
                    },
                    qtyPerConsumable: 1,
                },
            ],
        },
    };
}

function createIngredientSupply(
    id: string,
    ingredientId: string,
    qty: number,
): IngredientSupply {
    const suppliedAt = Date.parse("2026-03-06T12:00:00.000Z");
    return {
        id,
        raidRequestItemId: "item-1",
        ingredientId,
        qty,
        contributorName: "Guildmate",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

function createReadySupply(id: string, qty: number): ReadyConsumableSupply {
    const suppliedAt = Date.parse("2026-03-06T12:00:00.000Z");
    return {
        id,
        raidRequestItemId: "item-1",
        consumableId: "consumable-1",
        qty,
        contributorName: "Guildmate",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

describe("member contribution flow", () => {
    it("allows a member to contribute ingredients and ready consumables on the same request item", () => {
        expect(canMemberSupply("member")).toBe(true);

        const item = createRequestItem();

        let snapshot = createEmptySnapshot();

        snapshot = appendIngredientSupply(
            snapshot,
            item.id,
            createIngredientSupply("is-1", "herb", 6),
        );
        snapshot = appendIngredientSupply(
            snapshot,
            item.id,
            createIngredientSupply("is-2", "vial", 2),
        );
        snapshot = appendReadySupply(
            snapshot,
            item.id,
            createReadySupply("rs-1", 4),
        );

        const partialResult = calculateRaidRequestFulfillment(
            item,
            selectIngredientSupplies(snapshot, item.id),
            selectReadySupplies(snapshot, item.id),
        );

        // Full BOM rows stay visible even with ready consumable contribution applied.
        expect(partialResult.bom).toHaveLength(2);
        expect(partialResult.readyAppliedQty).toBe(4);
        expect(partialResult.remainingConsumableQty).toBe(6);
        expect(partialResult.bom).toEqual([
            {
                ingredientId: "herb",
                ingredientName: "Arcane Herb",
                ingredientIconKey: undefined,
                qtyPerConsumable: 2,
                baselineRequired: 20,
                readyEquivalentReduction: 8,
                requiredAfterReady: 12,
                ingredientSupplied: 6,
                remaining: 6,
                oversupply: 0,
            },
            {
                ingredientId: "vial",
                ingredientName: "Crystal Vial",
                ingredientIconKey: undefined,
                qtyPerConsumable: 1,
                baselineRequired: 10,
                readyEquivalentReduction: 4,
                requiredAfterReady: 6,
                ingredientSupplied: 2,
                remaining: 4,
                oversupply: 0,
            },
        ]);

        snapshot = appendReadySupply(
            snapshot,
            item.id,
            createReadySupply("rs-2", 6),
        );

        const completeResult = calculateRaidRequestFulfillment(
            item,
            selectIngredientSupplies(snapshot, item.id),
            selectReadySupplies(snapshot, item.id),
        );

        expect(completeResult.readyAppliedQty).toBe(10);
        expect(completeResult.remainingConsumableQty).toBe(0);
        expect(completeResult.isComplete).toBe(true);
        expect(completeResult.bom).toHaveLength(2);
        expect(completeResult.bom.every((row) => row.remaining === 0)).toBe(
            true,
        );
    });
});

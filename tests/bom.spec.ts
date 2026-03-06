import { describe, expect, it } from "vitest";
import { calculateRaidRequestFulfillment } from "../src/domain/fulfillment";
import type {
    Ingredient,
    IngredientSupply,
    RaidRequestItem,
    ReadyConsumableSupply,
} from "../src/domain/types";

const herb: Ingredient = { id: "herb", name: "Arcane Herb" };
const vial: Ingredient = { id: "vial", name: "Crystal Vial" };

function createRequestItem(requestedQty: number): RaidRequestItem {
    return {
        id: "item-1",
        raidRequestId: "request-1",
        requestedQty,
        consumable: {
            id: "consumable-1",
            name: "Arcane Flask",
            category: "flask",
            recipe: [
                { ingredient: herb, qtyPerConsumable: 2 },
                { ingredient: vial, qtyPerConsumable: 1 },
            ],
        },
    };
}

function ingredientSupply(ingredientId: string, qty: number): IngredientSupply {
    const suppliedAt = Date.parse("2026-03-06T08:00:00.000Z");
    return {
        id: `is-${ingredientId}-${qty}`,
        raidRequestItemId: "item-1",
        ingredientId,
        qty,
        contributorName: "Guildmate",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

function readySupply(qty: number): ReadyConsumableSupply {
    const suppliedAt = Date.parse("2026-03-06T08:00:00.000Z");
    return {
        id: `rs-${qty}`,
        raidRequestItemId: "item-1",
        consumableId: "consumable-1",
        qty,
        contributorName: "Guildmate",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

describe("BOM correctness", () => {
    it("keeps full BOM rows visible while remaining reaches zero", () => {
        const result = calculateRaidRequestFulfillment(
            createRequestItem(8),
            [ingredientSupply("herb", 20), ingredientSupply("vial", 8)],
            [readySupply(3), readySupply(50)],
        );

        expect(result.bom).toHaveLength(2);
        expect(result.remainingConsumableQty).toBe(0);
        expect(result.bom.map((row) => row.remaining)).toEqual([0, 0]);
        expect(result.bom).toEqual([
            {
                ingredientId: "herb",
                ingredientName: "Arcane Herb",
                ingredientIconKey: undefined,
                qtyPerConsumable: 2,
                baselineRequired: 16,
                readyEquivalentReduction: 16,
                requiredAfterReady: 0,
                ingredientSupplied: 20,
                remaining: 0,
                oversupply: 20,
            },
            {
                ingredientId: "vial",
                ingredientName: "Crystal Vial",
                ingredientIconKey: undefined,
                qtyPerConsumable: 1,
                baselineRequired: 8,
                readyEquivalentReduction: 8,
                requiredAfterReady: 0,
                ingredientSupplied: 8,
                remaining: 0,
                oversupply: 8,
            },
        ]);
    });
});

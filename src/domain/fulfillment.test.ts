import { describe, expect, it } from "vitest";
import { calculateRaidRequestFulfillment } from "./fulfillment";
import type {
    Ingredient,
    IngredientSupply,
    RaidRequestItem,
    ReadyConsumableSupply,
} from "./types";

const herb: Ingredient = { id: "herb", name: "Arcane Herb" };
const vial: Ingredient = { id: "vial", name: "Crystal Vial" };

function createItem(requestedQty: number): RaidRequestItem {
    return {
        id: "request-item-1",
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

function createIngredientSupply(
    ingredientId: string,
    qty: number,
): IngredientSupply {
    const suppliedAt = Date.parse("2026-03-05T12:00:00.000Z");
    return {
        id: `${ingredientId}-${qty}`,
        raidRequestItemId: "request-item-1",
        ingredientId,
        qty,
        contributorName: "Tester",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

function createReadySupply(qty: number): ReadyConsumableSupply {
    const suppliedAt = Date.parse("2026-03-05T12:00:00.000Z");
    return {
        id: `ready-${qty}`,
        raidRequestItemId: "request-item-1",
        consumableId: "consumable-1",
        qty,
        contributorName: "Tester",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

describe("calculateRaidRequestFulfillment", () => {
    it("handles ingredient-only contributions", () => {
        const result = calculateRaidRequestFulfillment(
            createItem(10),
            [
                createIngredientSupply("herb", 12),
                createIngredientSupply("vial", 4),
            ],
            [],
        );

        expect(result.readySuppliedQty).toBe(0);
        expect(result.remainingConsumableQty).toBe(10);
        expect(result.bom).toEqual([
            {
                ingredientId: "herb",
                ingredientName: "Arcane Herb",
                ingredientIconKey: undefined,
                qtyPerConsumable: 2,
                baselineRequired: 20,
                readyEquivalentReduction: 0,
                requiredAfterReady: 20,
                ingredientSupplied: 12,
                remaining: 8,
                oversupply: 0,
            },
            {
                ingredientId: "vial",
                ingredientName: "Crystal Vial",
                ingredientIconKey: undefined,
                qtyPerConsumable: 1,
                baselineRequired: 10,
                readyEquivalentReduction: 0,
                requiredAfterReady: 10,
                ingredientSupplied: 4,
                remaining: 6,
                oversupply: 0,
            },
        ]);
        expect(result.ingredientCoveragePct).toBeCloseTo(0.5333, 4);
        expect(result.isComplete).toBe(false);
    });

    it("handles ready-consumable-only contributions", () => {
        const result = calculateRaidRequestFulfillment(createItem(10), [], [
            createReadySupply(7),
        ]);

        expect(result.readySuppliedQty).toBe(7);
        expect(result.readyAppliedQty).toBe(7);
        expect(result.remainingConsumableQty).toBe(3);
        expect(result.bom).toEqual([
            {
                ingredientId: "herb",
                ingredientName: "Arcane Herb",
                ingredientIconKey: undefined,
                qtyPerConsumable: 2,
                baselineRequired: 20,
                readyEquivalentReduction: 14,
                requiredAfterReady: 6,
                ingredientSupplied: 0,
                remaining: 6,
                oversupply: 0,
            },
            {
                ingredientId: "vial",
                ingredientName: "Crystal Vial",
                ingredientIconKey: undefined,
                qtyPerConsumable: 1,
                baselineRequired: 10,
                readyEquivalentReduction: 7,
                requiredAfterReady: 3,
                ingredientSupplied: 0,
                remaining: 3,
                oversupply: 0,
            },
        ]);
        expect(result.ingredientCoveragePct).toBe(0);
        expect(result.isComplete).toBe(false);
    });

    it("handles mixed contributions and ingredient oversupply", () => {
        const result = calculateRaidRequestFulfillment(
            createItem(8),
            [
                createIngredientSupply("herb", 20),
                createIngredientSupply("vial", 8),
            ],
            [createReadySupply(3), createReadySupply(20)],
        );

        expect(result.readySuppliedQty).toBe(23);
        expect(result.readyAppliedQty).toBe(8);
        expect(result.remainingConsumableQty).toBe(0);
        expect(result.ingredientCoveragePct).toBe(1);
        expect(result.overallCompletionPct).toBe(1);
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
        expect(result.isComplete).toBe(true);
    });
});

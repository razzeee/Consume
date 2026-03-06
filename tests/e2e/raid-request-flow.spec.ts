import { describe, expect, it } from "vitest";
import {
    appendIngredientSupply,
    appendReadySupply,
    selectIngredientSupplies,
    selectReadySupplies,
} from "../../src/domain/consumeStateStore";
import { calculateRaidRequestFulfillment } from "../../src/domain/fulfillment";
import { canMemberSupply } from "../../src/domain/permissions";
import { buildRaidRequestFromDraft } from "../../src/domain/requestCreation";
import type { ConsumeStateSnapshot } from "../../src/domain/state";
import { consumableCatalog } from "../../src/domain/mockData";
import type {
    IngredientSupply,
    ReadyConsumableSupply,
} from "../../src/domain/types";

function createSnapshot(): ConsumeStateSnapshot {
    return {
        guildInvites: [],
        raidRequestsByGuildId: {},
        ingredientSuppliesByRequestItemId: {},
        readySuppliesByRequestItemId: {},
    };
}

function createIngredientSupply(
    ingredientId: string,
    qty: number,
): IngredientSupply {
    const suppliedAt = Date.parse("2026-03-06T10:00:00.000Z");
    return {
        id: `is-${ingredientId}-${qty}`,
        raidRequestItemId: "item-1",
        ingredientId,
        qty,
        contributorName: "MemberOne",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

function createReadySupply(
    consumableId: string,
    qty: number,
): ReadyConsumableSupply {
    const suppliedAt = Date.parse("2026-03-06T10:00:00.000Z");
    return {
        id: `rs-${consumableId}-${qty}`,
        raidRequestItemId: "item-1",
        consumableId,
        qty,
        contributorName: "MemberOne",
        suppliedAt,
        createdAt: suppliedAt,
        updatedAt: suppliedAt,
    };
}

describe("raid request flow smoke", () => {
    it("creates a request and accepts mixed member contributions", () => {
        expect(canMemberSupply("member")).toBe(true);

        const requestResult = buildRaidRequestFromDraft({
            guildId: "guild-1",
            title: "Naxx Consumables",
            raidDate: "2026-03-12",
            draftItems: [
                {
                    consumableId: consumableCatalog[0]?.id ?? "",
                    qty: 10,
                },
            ],
            consumableCatalog,
            idFactory: (
                prefix,
            ) => (prefix === "request" ? "request-1" : "item-1"),
            nowFactory: () => Date.parse("2026-03-06T09:00:00.000Z"),
        });

        expect(requestResult.errors).toEqual([]);
        expect(requestResult.raidRequest).not.toBeNull();

        const requestItem = requestResult.raidRequest!.items[0];

        let snapshot = createSnapshot();

        const firstIngredient = requestItem.consumable.recipe[0];
        const secondIngredient = requestItem.consumable.recipe[1];

        snapshot = appendIngredientSupply(
            snapshot,
            requestItem.id,
            createIngredientSupply(firstIngredient.ingredient.id, 25),
        );

        snapshot = appendIngredientSupply(
            snapshot,
            requestItem.id,
            createIngredientSupply(secondIngredient.ingredient.id, 4),
        );

        snapshot = appendReadySupply(
            snapshot,
            requestItem.id,
            createReadySupply(requestItem.consumable.id, 4),
        );

        const fulfillment = calculateRaidRequestFulfillment(
            requestItem,
            selectIngredientSupplies(snapshot, requestItem.id),
            selectReadySupplies(snapshot, requestItem.id),
        );

        expect(fulfillment.readyAppliedQty).toBe(4);
        expect(fulfillment.remainingConsumableQty).toBe(6);
        expect(fulfillment.bom).toHaveLength(
            requestItem.consumable.recipe.length,
        );
        expect(
            fulfillment.bom.every((row) =>
                row.baselineRequired >= row.requiredAfterReady
            ),
        ).toBe(true);
    });
});

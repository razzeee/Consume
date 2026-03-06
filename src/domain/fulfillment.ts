import type {
    IngredientSupply,
    RaidRequestFulfillment,
    RaidRequestItem,
    ReadyConsumableSupply,
} from "./types";

function clampNonNegative(value: number) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundTo(value: number, digits: number) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function sumBy<T>(items: readonly T[], getValue: (item: T) => number) {
    return items.reduce(
        (total, item) => total + clampNonNegative(getValue(item)),
        0,
    );
}

export function calculateRaidRequestFulfillment(
    item: RaidRequestItem,
    ingredientSupplies: readonly IngredientSupply[],
    readySupplies: readonly ReadyConsumableSupply[],
): RaidRequestFulfillment {
    const requestedQty = clampNonNegative(item.requestedQty);

    const readySuppliedQty = sumBy(
        readySupplies.filter(
            (supply) =>
                supply.raidRequestItemId === item.id &&
                supply.consumableId === item.consumable.id,
        ),
        (supply) => supply.qty,
    );
    const readyAppliedQty = Math.min(requestedQty, readySuppliedQty);
    const remainingConsumableQty = Math.max(0, requestedQty - readyAppliedQty);

    const ingredientTotals = new Map<string, number>();
    for (const supply of ingredientSupplies) {
        if (supply.raidRequestItemId !== item.id) {
            continue;
        }
        ingredientTotals.set(
            supply.ingredientId,
            (ingredientTotals.get(supply.ingredientId) ?? 0) +
                clampNonNegative(supply.qty),
        );
    }

    const bom = item.consumable.recipe.map((entry) => {
        const baselineRequired = requestedQty * entry.qtyPerConsumable;
        const readyEquivalentReduction = readyAppliedQty *
            entry.qtyPerConsumable;
        const requiredAfterReady = remainingConsumableQty *
            entry.qtyPerConsumable;
        const ingredientSupplied = ingredientTotals.get(entry.ingredient.id) ??
            0;
        const remaining = Math.max(0, requiredAfterReady - ingredientSupplied);
        const oversupply = Math.max(0, ingredientSupplied - requiredAfterReady);

        return {
            ingredientId: entry.ingredient.id,
            ingredientName: entry.ingredient.name,
            ingredientIconKey: entry.ingredient.iconKey,
            qtyPerConsumable: entry.qtyPerConsumable,
            baselineRequired,
            readyEquivalentReduction,
            requiredAfterReady,
            ingredientSupplied,
            remaining,
            oversupply,
        };
    });

    const totalRequiredAfterReady = sumBy(bom, (row) => row.requiredAfterReady);
    const totalCoveredByIngredients = sumBy(
        bom,
        (row) => row.requiredAfterReady - row.remaining,
    );
    const ingredientCoveragePct = totalRequiredAfterReady === 0
        ? 1
        : roundTo(totalCoveredByIngredients / totalRequiredAfterReady, 4);

    const completionByReady = requestedQty === 0
        ? 1
        : readyAppliedQty / requestedQty;
    const completionByIngredients = requestedQty === 0
        ? 0
        : ((1 - completionByReady) * ingredientCoveragePct);
    const overallCompletionPct = roundTo(
        Math.min(1, completionByReady + completionByIngredients),
        4,
    );

    return {
        requestItemId: item.id,
        consumableName: item.consumable.name,
        requestedQty,
        readySuppliedQty,
        readyAppliedQty,
        remainingConsumableQty,
        ingredientCoveragePct,
        overallCompletionPct,
        bom,
        isComplete: bom.every((row) => row.remaining === 0),
    };
}

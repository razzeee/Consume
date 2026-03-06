import type { Consumable, RaidRequest, RaidRequestItem } from "./types";

export interface RaidRequestDraftItem {
    consumableId: string;
    qty: number;
    note?: string;
}

interface BuildRaidRequestInput {
    guildId: string;
    title: string;
    raidDate: string;
    draftItems: RaidRequestDraftItem[];
    consumableCatalog: Consumable[];
    idFactory?: (prefix: string) => string;
    nowFactory?: () => number;
}

interface BuildRaidRequestResult {
    raidRequest: RaidRequest | null;
    errors: string[];
}

function fallbackIdFactory(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toPositiveInteger(value: number) {
    const normalized = Math.floor(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

export function buildRaidRequestFromDraft(
    input: BuildRaidRequestInput,
): BuildRaidRequestResult {
    const idFactory = input.idFactory ?? fallbackIdFactory;
    const nowFactory = input.nowFactory ?? Date.now;
    const title = input.title.trim();
    const raidDate = input.raidDate.trim();

    if (!title) {
        return {
            raidRequest: null,
            errors: ["Request title is required."],
        };
    }

    if (!raidDate) {
        return {
            raidRequest: null,
            errors: ["Raid date is required."],
        };
    }

    const errors: string[] = [];
    const validatedItems: Array<{
        consumable: Consumable;
        requestedQty: number;
        note?: string;
    }> = [];

    input.draftItems.forEach((draftItem, index) => {
        const consumable = input.consumableCatalog.find(
            (candidate) => candidate.id === draftItem.consumableId,
        );
        const requestedQty = toPositiveInteger(draftItem.qty);

        if (!consumable) {
            errors.push(`Line ${index + 1}: Select a valid consumable.`);
            return;
        }

        if (requestedQty <= 0) {
            errors.push(`Line ${index + 1}: Quantity must be greater than 0.`);
            return;
        }

        validatedItems.push({
            consumable,
            requestedQty,
            note: draftItem.note?.trim() || undefined,
        });
    });

    if (validatedItems.length === 0 || errors.length > 0) {
        return {
            raidRequest: null,
            errors: errors.length > 0
                ? errors
                : ["Add at least one valid request item."],
        };
    }

    const requestId = idFactory("request");
    const nowMs = nowFactory();
    const items: RaidRequestItem[] = validatedItems.map((item) => ({
        id: idFactory("item"),
        raidRequestId: requestId,
        consumable: item.consumable,
        requestedQty: item.requestedQty,
        note: item.note,
    }));

    const raidRequest: RaidRequest = {
        id: requestId,
        guildId: input.guildId,
        title,
        raidDate,
        createdAt: nowMs,
        updatedAt: nowMs,
        items,
    };

    return {
        raidRequest,
        errors: [],
    };
}

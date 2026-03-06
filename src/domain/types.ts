export type GuildRole = "lead" | "officer" | "member";
export type Realm = "Nordanaar" | "Tel'Abim" | "Ambershire";

export interface Guild {
    id: string;
    name: string;
    realm: Realm;
    faction: "Alliance" | "Horde";
}

export interface GuildMember {
    id: string;
    guildId: string;
    characterName: string;
    role: GuildRole;
}

export interface GuildInvite {
    id: string;
    guildId: string;
    code: string;
    createdBy: string;
    expiresAt: number;
    acceptedBy?: string;
    acceptedAt?: number;
    createdAt: number;
    updatedAt: number;
}

export interface Ingredient {
    id: string;
    name: string;
    iconKey?: string;
    iconPath?: string;
}

export interface RecipeIngredient {
    ingredient: Ingredient;
    qtyPerConsumable: number;
}

export interface Consumable {
    id: string;
    name: string;
    category: "flask" | "elixir" | "food" | "potion" | "utility";
    iconKey?: string;
    iconPath?: string;
    recipe: RecipeIngredient[];
}

export interface RaidRequestItem {
    id: string;
    raidRequestId: string;
    consumable: Consumable;
    requestedQty: number;
    note?: string;
}

export interface RaidRequest {
    id: string;
    guildId: string;
    title: string;
    raidDate: string;
    createdAt: number;
    updatedAt: number;
    items: RaidRequestItem[];
}

export interface IngredientSupply {
    id: string;
    raidRequestItemId: string;
    ingredientId: string;
    qty: number;
    contributorName: string;
    suppliedAt: number;
    createdAt: number;
    updatedAt: number;
    note?: string;
}

export interface ReadyConsumableSupply {
    id: string;
    raidRequestItemId: string;
    consumableId: string;
    qty: number;
    contributorName: string;
    suppliedAt: number;
    createdAt: number;
    updatedAt: number;
    note?: string;
}

export interface IngredientFulfillmentRow {
    ingredientId: string;
    ingredientName: string;
    ingredientIconKey?: string;
    qtyPerConsumable: number;
    baselineRequired: number;
    readyEquivalentReduction: number;
    requiredAfterReady: number;
    ingredientSupplied: number;
    remaining: number;
    oversupply: number;
}

export interface RaidRequestFulfillment {
    requestItemId: string;
    consumableName: string;
    requestedQty: number;
    readySuppliedQty: number;
    readyAppliedQty: number;
    remainingConsumableQty: number;
    ingredientCoveragePct: number;
    overallCompletionPct: number;
    bom: IngredientFulfillmentRow[];
    isComplete: boolean;
}

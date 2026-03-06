import type {
    Consumable,
    Guild,
    GuildInvite,
    GuildMember,
    Ingredient,
    IngredientSupply,
    RaidRequest,
    ReadyConsumableSupply,
} from "./types";

const ingredients: Record<string, Ingredient> = {
    dreamfoil: {
        id: "ingredient-dreamfoil",
        name: "Dreamfoil",
        iconKey: "inv_fabric_mageweave_01",
    },
    plaguebloom: {
        id: "ingredient-plaguebloom",
        name: "Plaguebloom",
        iconKey: "inv_fabric_moonrag_01",
    },
    crystalVial: {
        id: "ingredient-crystal-vial",
        name: "Crystal Vial",
        iconKey: "inv_drink_06",
    },
    squid: {
        id: "ingredient-squid",
        name: "Winter Squid",
        iconKey: "inv_fishing_lostsole",
    },
    mildSpice: {
        id: "ingredient-mild-spice",
        name: "Mild Spices",
        iconKey: "inv_enchant_duststrange",
    },
    elementalFire: {
        id: "ingredient-elemental-fire",
        name: "Elemental Fire",
        iconKey: "ability_searingarrow",
    },
    firebloom: {
        id: "ingredient-firebloom",
        name: "Firebloom",
        iconKey: "inv_fabric_purplefire_01",
    },
};

function ts(value: string) {
    return Date.parse(value);
}

export const consumableCatalog: Consumable[] = [
    {
        id: "consumable-flask-supreme-power",
        name: "Flask of Supreme Power",
        category: "flask",
        iconKey: "inv_drink_16",
        recipe: [
            { ingredient: ingredients.dreamfoil, qtyPerConsumable: 10 },
            { ingredient: ingredients.plaguebloom, qtyPerConsumable: 3 },
            { ingredient: ingredients.crystalVial, qtyPerConsumable: 1 },
        ],
    },
    {
        id: "consumable-grilled-squid",
        name: "Grilled Squid",
        category: "food",
        iconKey: "inv_food_christmasfruitcake_01",
        recipe: [
            { ingredient: ingredients.squid, qtyPerConsumable: 1 },
            { ingredient: ingredients.mildSpice, qtyPerConsumable: 1 },
        ],
    },
    {
        id: "consumable-greater-fire-protection",
        name: "Greater Fire Protection Potion",
        category: "potion",
        iconKey: "inv_drink_18",
        recipe: [
            { ingredient: ingredients.firebloom, qtyPerConsumable: 3 },
            { ingredient: ingredients.elementalFire, qtyPerConsumable: 1 },
            { ingredient: ingredients.crystalVial, qtyPerConsumable: 1 },
        ],
    },
];

export const guilds: Guild[] = [
    {
        id: "guild-wardens",
        name: "Ashen Wardens",
        realm: "Nordanaar",
        faction: "Alliance",
    },
    {
        id: "guild-vanguard",
        name: "Dusk Vanguard",
        realm: "Tel'Abim",
        faction: "Horde",
    },
];

export const guildMembers: GuildMember[] = [
    {
        id: "member-aria",
        guildId: "guild-wardens",
        characterName: "Ariawave",
        role: "lead",
    },
    {
        id: "member-bor",
        guildId: "guild-wardens",
        characterName: "Borbeard",
        role: "officer",
    },
    {
        id: "member-cira",
        guildId: "guild-wardens",
        characterName: "Ciraflare",
        role: "member",
    },
    {
        id: "member-rok",
        guildId: "guild-vanguard",
        characterName: "Rokthar",
        role: "lead",
    },
];

export const guildInvites: GuildInvite[] = [
    {
        id: "invite-wardens-1",
        guildId: "guild-wardens",
        code: "WARDEN-7Q2N",
        createdBy: "Ariawave",
        expiresAt: ts("2026-03-09T20:00:00.000Z"),
        createdAt: ts("2026-03-02T18:00:00.000Z"),
        updatedAt: ts("2026-03-02T18:00:00.000Z"),
    },
    {
        id: "invite-vanguard-1",
        guildId: "guild-vanguard",
        code: "VG-THRALL-55",
        createdBy: "Rokthar",
        expiresAt: ts("2026-03-11T22:00:00.000Z"),
        acceptedBy: "Korga",
        acceptedAt: ts("2026-03-04T21:10:00.000Z"),
        createdAt: ts("2026-03-03T19:30:00.000Z"),
        updatedAt: ts("2026-03-04T21:10:00.000Z"),
    },
];

export const raidRequestsByGuildId: Record<string, RaidRequest[]> = {
    "guild-wardens": [
        {
            id: "request-wardens-naxx-2026-03-07",
            guildId: "guild-wardens",
            title: "Naxxramas - Construct Wing",
            raidDate: "2026-03-07",
            createdAt: ts("2026-03-04T08:00:00.000Z"),
            updatedAt: ts("2026-03-04T08:00:00.000Z"),
            items: [
                {
                    id: "item-wardens-flask",
                    raidRequestId: "request-wardens-naxx-2026-03-07",
                    consumable: consumableCatalog[0],
                    requestedQty: 24,
                    note: "Mainly for casters and healers.",
                },
                {
                    id: "item-wardens-food",
                    raidRequestId: "request-wardens-naxx-2026-03-07",
                    consumable: consumableCatalog[1],
                    requestedQty: 40,
                },
            ],
        },
    ],
    "guild-vanguard": [
        {
            id: "request-vanguard-mc-2026-03-08",
            guildId: "guild-vanguard",
            title: "Molten Core - Speed Clear",
            raidDate: "2026-03-08",
            createdAt: ts("2026-03-04T09:30:00.000Z"),
            updatedAt: ts("2026-03-04T09:30:00.000Z"),
            items: [
                {
                    id: "item-vanguard-gfpp",
                    raidRequestId: "request-vanguard-mc-2026-03-08",
                    consumable: consumableCatalog[2],
                    requestedQty: 30,
                },
            ],
        },
    ],
};

export const ingredientSuppliesByRequestItemId: Record<
    string,
    IngredientSupply[]
> = {
    "item-wardens-flask": [
        {
            id: "is-1",
            raidRequestItemId: "item-wardens-flask",
            ingredientId: ingredients.dreamfoil.id,
            qty: 120,
            contributorName: "Ciraflare",
            suppliedAt: ts("2026-03-05T19:20:00.000Z"),
            createdAt: ts("2026-03-05T19:20:00.000Z"),
            updatedAt: ts("2026-03-05T19:20:00.000Z"),
        },
        {
            id: "is-2",
            raidRequestItemId: "item-wardens-flask",
            ingredientId: ingredients.plaguebloom.id,
            qty: 36,
            contributorName: "Borbeard",
            suppliedAt: ts("2026-03-05T19:35:00.000Z"),
            createdAt: ts("2026-03-05T19:35:00.000Z"),
            updatedAt: ts("2026-03-05T19:35:00.000Z"),
        },
        {
            id: "is-3",
            raidRequestItemId: "item-wardens-flask",
            ingredientId: ingredients.crystalVial.id,
            qty: 12,
            contributorName: "Ariawave",
            suppliedAt: ts("2026-03-05T19:38:00.000Z"),
            createdAt: ts("2026-03-05T19:38:00.000Z"),
            updatedAt: ts("2026-03-05T19:38:00.000Z"),
        },
    ],
    "item-wardens-food": [
        {
            id: "is-4",
            raidRequestItemId: "item-wardens-food",
            ingredientId: ingredients.squid.id,
            qty: 18,
            contributorName: "Stormfletch",
            suppliedAt: ts("2026-03-05T20:01:00.000Z"),
            createdAt: ts("2026-03-05T20:01:00.000Z"),
            updatedAt: ts("2026-03-05T20:01:00.000Z"),
        },
        {
            id: "is-5",
            raidRequestItemId: "item-wardens-food",
            ingredientId: ingredients.mildSpice.id,
            qty: 9,
            contributorName: "Ciraflare",
            suppliedAt: ts("2026-03-05T20:05:00.000Z"),
            createdAt: ts("2026-03-05T20:05:00.000Z"),
            updatedAt: ts("2026-03-05T20:05:00.000Z"),
        },
    ],
    "item-vanguard-gfpp": [
        {
            id: "is-6",
            raidRequestItemId: "item-vanguard-gfpp",
            ingredientId: ingredients.firebloom.id,
            qty: 45,
            contributorName: "Rokthar",
            suppliedAt: ts("2026-03-05T20:14:00.000Z"),
            createdAt: ts("2026-03-05T20:14:00.000Z"),
            updatedAt: ts("2026-03-05T20:14:00.000Z"),
        },
        {
            id: "is-7",
            raidRequestItemId: "item-vanguard-gfpp",
            ingredientId: ingredients.elementalFire.id,
            qty: 12,
            contributorName: "Korga",
            suppliedAt: ts("2026-03-05T20:17:00.000Z"),
            createdAt: ts("2026-03-05T20:17:00.000Z"),
            updatedAt: ts("2026-03-05T20:17:00.000Z"),
        },
        {
            id: "is-8",
            raidRequestItemId: "item-vanguard-gfpp",
            ingredientId: ingredients.crystalVial.id,
            qty: 12,
            contributorName: "Snaggle",
            suppliedAt: ts("2026-03-05T20:20:00.000Z"),
            createdAt: ts("2026-03-05T20:20:00.000Z"),
            updatedAt: ts("2026-03-05T20:20:00.000Z"),
        },
    ],
};

export const readySuppliesByRequestItemId: Record<
    string,
    ReadyConsumableSupply[]
> = {
    "item-wardens-flask": [
        {
            id: "rs-1",
            raidRequestItemId: "item-wardens-flask",
            consumableId: "consumable-flask-supreme-power",
            qty: 6,
            contributorName: "Ariawave",
            suppliedAt: ts("2026-03-05T19:08:00.000Z"),
            createdAt: ts("2026-03-05T19:08:00.000Z"),
            updatedAt: ts("2026-03-05T19:08:00.000Z"),
            note: "Crafted from stock this morning.",
        },
    ],
    "item-wardens-food": [
        {
            id: "rs-2",
            raidRequestItemId: "item-wardens-food",
            consumableId: "consumable-grilled-squid",
            qty: 8,
            contributorName: "Tidalbite",
            suppliedAt: ts("2026-03-05T19:52:00.000Z"),
            createdAt: ts("2026-03-05T19:52:00.000Z"),
            updatedAt: ts("2026-03-05T19:52:00.000Z"),
        },
    ],
    "item-vanguard-gfpp": [
        {
            id: "rs-3",
            raidRequestItemId: "item-vanguard-gfpp",
            consumableId: "consumable-greater-fire-protection",
            qty: 9,
            contributorName: "Korga",
            suppliedAt: ts("2026-03-05T20:00:00.000Z"),
            createdAt: ts("2026-03-05T20:00:00.000Z"),
            updatedAt: ts("2026-03-05T20:00:00.000Z"),
        },
    ],
};

export function getGuildById(guildId: string) {
    return guilds.find((guild) => guild.id === guildId);
}

export function getGuildInvites(guildId: string) {
    return guildInvites.filter((invite) => invite.guildId === guildId);
}

export function getGuildMembers(guildId: string) {
    return guildMembers.filter((member) => member.guildId === guildId);
}

export function getRaidRequests(guildId: string) {
    return raidRequestsByGuildId[guildId] ?? [];
}

export function getIngredientSupplies(raidRequestItemId: string) {
    return ingredientSuppliesByRequestItemId[raidRequestItemId] ?? [];
}

export function getReadySupplies(raidRequestItemId: string) {
    return readySuppliesByRequestItemId[raidRequestItemId] ?? [];
}

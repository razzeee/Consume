import type { Consumable, GuildRole, Ingredient } from "#/domain/types";

const ICON_EXTENSIONS = ["jpg", "png", "jpeg", "webp"] as const;

const FALLBACK_ICON_KEY = "inv_garrison_resource";

const CATEGORY_ICON_KEYS: Record<Consumable["category"], string> = {
    flask: "inv_drink_16",
    elixir: "inv_drink_22",
    food: "inv_food_christmasfruitcake_01",
    potion: "inv_drink_27",
    utility: "inv_box_01",
};

const ROLE_ICON_KEYS: Record<GuildRole, string> = {
    lead: "achievement_raid_karazhan",
    officer: "ability_defend",
    member: "ability_marksmanship",
};

const ACTIVITY_ICON_KEYS = {
    ingredient: "inv_enchant_duststrange",
    ready: "inv_drink_16",
} as const;

const STATUS_ICON_KEYS = {
    low: "ability_creature_poison_03",
    medium: "ability_creature_poison_05",
    high: "ability_shaman_heroism",
} as const;

export function normalizeWowIconKey(value: string | undefined | null) {
    if (!value) {
        return undefined;
    }

    const normalized = value
        .trim()
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        ?.replace(/\.(?:blp|tga|jpg|jpeg|png|webp)$/iu, "")
        .toLowerCase();

    return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeWowIconPath(value: string | undefined | null) {
    if (!value) {
        return undefined;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }

    if (trimmed.startsWith("/")) {
        return trimmed;
    }

    return `/${trimmed.replace(/^\/+/, "")}`;
}

function unique(values: string[]) {
    return [...new Set(values)];
}

function toIconCandidates(iconKey: string | undefined, iconPath?: string) {
    const normalizedPath = normalizeWowIconPath(iconPath);
    const normalizedKey = normalizeWowIconKey(iconKey);
    const baseKey = normalizedKey ?? FALLBACK_ICON_KEY;
    const byKey = ICON_EXTENSIONS.map((extension) =>
        `/wow-icons/${baseKey}.${extension}`
    );

    if (!normalizedPath) {
        return byKey;
    }

    return unique([normalizedPath, ...byKey]);
}

export function getConsumableIconKey(consumable: Consumable) {
    return normalizeWowIconKey(consumable.iconKey) ??
        CATEGORY_ICON_KEYS[consumable.category];
}

export function getConsumableIconCandidates(consumable: Consumable) {
    return toIconCandidates(
        getConsumableIconKey(consumable),
        consumable.iconPath,
    );
}

export function getIngredientIconKey(ingredient: Ingredient) {
    return normalizeWowIconKey(ingredient.iconKey) ?? "inv_fabric_linen_01";
}

export function getIngredientIconCandidates(ingredient: Ingredient) {
    return toIconCandidates(
        getIngredientIconKey(ingredient),
        ingredient.iconPath,
    );
}

export function getRoleIconCandidates(role: GuildRole | undefined) {
    const key = role ? ROLE_ICON_KEYS[role] : "ability_tracking";
    return toIconCandidates(key);
}

export function getSupplyActivityIconCandidates(
    activityType: "ingredient" | "ready",
) {
    return toIconCandidates(ACTIVITY_ICON_KEYS[activityType]);
}

export function getProgressIconCandidates(percentComplete: number) {
    if (percentComplete >= 0.85) {
        return toIconCandidates(STATUS_ICON_KEYS.high);
    }
    if (percentComplete >= 0.4) {
        return toIconCandidates(STATUS_ICON_KEYS.medium);
    }
    return toIconCandidates(STATUS_ICON_KEYS.low);
}

export function getCategoryIconCandidates(category: Consumable["category"]) {
    return toIconCandidates(CATEGORY_ICON_KEYS[category]);
}

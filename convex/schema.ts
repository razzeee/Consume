import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,

    guilds: defineTable({
        externalId: v.optional(v.string()),
        name: v.string(),
        slug: v.string(),
        realm: v.union(
            v.literal("Nordanaar"),
            v.literal("Tel'Abim"),
            v.literal("Ambershire"),
        ),
        faction: v.union(v.literal("Alliance"), v.literal("Horde")),
        ownerId: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_slug", ["slug"])
        .index("by_owner", ["ownerId"])
        .index("by_external_id", ["externalId"]),

    guildMemberships: defineTable({
        guildId: v.id("guilds"),
        userId: v.id("users"),
        role: v.union(
            v.literal("lead"),
            v.literal("officer"),
            v.literal("member"),
        ),
        joinedAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_guild", ["guildId"])
        .index("by_user", ["userId"])
        .index("by_guild_user", ["guildId", "userId"]),

    guildInvites: defineTable({
        externalId: v.optional(v.string()),
        guildId: v.id("guilds"),
        code: v.string(),
        createdByUserId: v.id("users"),
        expiresAt: v.number(),
        acceptedByUserId: v.optional(v.id("users")),
        acceptedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_code", ["code"])
        .index("by_guild", ["guildId"])
        .index("by_external_id", ["externalId"]),

    consumables: defineTable({
        name: v.string(),
        category: v.string(),
        source: v.string(),
        externalId: v.optional(v.string()),
        iconKey: v.optional(v.string()),
        iconPath: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_external_id", ["externalId"]),

    ingredients: defineTable({
        name: v.string(),
        source: v.string(),
        externalId: v.optional(v.string()),
        iconKey: v.optional(v.string()),
        iconPath: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_external_id", ["externalId"]),

    recipes: defineTable({
        externalId: v.optional(v.string()),
        consumableId: v.id("consumables"),
        profession: v.optional(v.string()),
        source: v.string(),
        lastSyncedAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_consumable", ["consumableId"])
        .index("by_external_id", ["externalId"]),

    recipeIngredients: defineTable({
        recipeId: v.id("recipes"),
        ingredientId: v.id("ingredients"),
        qtyPerConsumable: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_recipe", ["recipeId"]),

    raidRequests: defineTable({
        externalId: v.optional(v.string()),
        guildId: v.id("guilds"),
        title: v.string(),
        // Keep raidDate as a calendar date string; this represents a raid day, not an exact instant.
        raidDate: v.string(),
        createdByUserId: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_guild", ["guildId"])
        .index("by_guild_date", ["guildId", "raidDate"])
        .index("by_external_id", ["externalId"]),

    raidRequestItems: defineTable({
        externalId: v.optional(v.string()),
        raidRequestId: v.id("raidRequests"),
        consumableId: v.id("consumables"),
        requestedQty: v.number(),
        readySuppliedQty: v.number(),
        ingredientCoveragePct: v.number(),
        remainingConsumableQty: v.number(),
        note: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_raid_request", ["raidRequestId"])
        .index("by_consumable", ["consumableId"])
        .index("by_external_id", ["externalId"]),

    ingredientSupplies: defineTable({
        externalId: v.optional(v.string()),
        guildId: v.id("guilds"),
        raidRequestItemId: v.id("raidRequestItems"),
        ingredientId: v.id("ingredients"),
        qty: v.number(),
        contributorUserId: v.id("users"),
        suppliedAt: v.number(),
        note: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_request_item", ["raidRequestItemId"])
        .index("by_contributor", ["contributorUserId"])
        .index("by_external_id", ["externalId"]),

    readyConsumableSupplies: defineTable({
        externalId: v.optional(v.string()),
        guildId: v.id("guilds"),
        raidRequestItemId: v.id("raidRequestItems"),
        consumableId: v.id("consumables"),
        qty: v.number(),
        contributorUserId: v.id("users"),
        suppliedAt: v.number(),
        note: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_request_item", ["raidRequestItemId"])
        .index("by_contributor", ["contributorUserId"])
        .index("by_external_id", ["externalId"]),
});

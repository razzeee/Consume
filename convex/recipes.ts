import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const listConsumableCatalog = queryGeneric({
    args: {},
    handler: async (ctx) => {
        const consumables = await ctx.db.query("consumables").collect();

        const sorted = [...consumables].sort((a: any, b: any) =>
            String(a.name).localeCompare(String(b.name))
        );

        return await Promise.all(
            sorted.map(async (consumable: any) => {
                const recipe = await ctx.db
                    .query("recipes")
                    .withIndex(
                        "by_consumable",
                        (q: any) => q.eq("consumableId", consumable._id),
                    )
                    .first();

                if (!recipe) {
                    return {
                        externalId: consumable.externalId ?? consumable._id,
                        name: consumable.name,
                        category: consumable.category,
                        iconKey: consumable.iconKey,
                        iconPath: consumable.iconPath,
                        recipe: [],
                    };
                }

                const recipeIngredients = await ctx.db
                    .query("recipeIngredients")
                    .withIndex(
                        "by_recipe",
                        (q: any) => q.eq("recipeId", recipe._id),
                    )
                    .collect();

                const ingredients = await Promise.all(
                    recipeIngredients.map(async (entry: any) => {
                        const ingredient = await ctx.db.get(entry.ingredientId);
                        return {
                            ingredientExternalId: ingredient?.externalId ??
                                entry.ingredientId,
                            ingredientName: ingredient?.name ??
                                "Unknown ingredient",
                            ingredientIconKey: ingredient?.iconKey,
                            ingredientIconPath: ingredient?.iconPath,
                            qtyPerConsumable: entry.qtyPerConsumable,
                        };
                    }),
                );

                return {
                    externalId: consumable.externalId ?? consumable._id,
                    name: consumable.name,
                    category: consumable.category,
                    iconKey: consumable.iconKey,
                    iconPath: consumable.iconPath,
                    recipe: ingredients,
                };
            }),
        );
    },
});

export const getConsumableRecipeByExternalId = queryGeneric({
    args: {
        consumableExternalId: v.string(),
    },
    handler: async (ctx, args) => {
        const consumable = await ctx.db
            .query("consumables")
            .withIndex(
                "by_external_id",
                (q: any) => q.eq("externalId", args.consumableExternalId),
            )
            .first();

        if (!consumable) {
            return null;
        }

        const recipe = await ctx.db
            .query("recipes")
            .withIndex(
                "by_consumable",
                (q: any) => q.eq("consumableId", consumable._id),
            )
            .first();

        if (!recipe) {
            return {
                externalId: consumable.externalId ?? consumable._id,
                name: consumable.name,
                category: consumable.category,
                iconKey: consumable.iconKey,
                iconPath: consumable.iconPath,
                recipe: [],
            };
        }

        const recipeIngredients = await ctx.db
            .query("recipeIngredients")
            .withIndex("by_recipe", (q: any) => q.eq("recipeId", recipe._id))
            .collect();

        const ingredients = await Promise.all(
            recipeIngredients.map(async (entry: any) => {
                const ingredient = await ctx.db.get(entry.ingredientId);
                return {
                    ingredientExternalId: ingredient?.externalId ??
                        entry.ingredientId,
                    ingredientName: ingredient?.name ?? "Unknown ingredient",
                    ingredientIconKey: ingredient?.iconKey,
                    ingredientIconPath: ingredient?.iconPath,
                    qtyPerConsumable: entry.qtyPerConsumable,
                };
            }),
        );

        return {
            externalId: consumable.externalId ?? consumable._id,
            name: consumable.name,
            category: consumable.category,
            iconKey: consumable.iconKey,
            iconPath: consumable.iconPath,
            recipe: ingredients,
        };
    },
});

const consumableImportEntry = v.object({
    externalId: v.string(),
    name: v.string(),
    category: v.string(),
    iconKey: v.optional(v.string()),
    iconPath: v.optional(v.string()),
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

const ingredientImportEntry = v.object({
    externalId: v.string(),
    name: v.string(),
    iconKey: v.optional(v.string()),
    iconPath: v.optional(v.string()),
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

const recipeImportEntry = v.object({
    externalId: v.string(),
    consumableExternalId: v.string(),
    profession: v.optional(v.string()),
    source: v.string(),
    lastSyncedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

const recipeIngredientImportEntry = v.object({
    recipeExternalId: v.string(),
    ingredientExternalId: v.string(),
    qtyPerConsumable: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const upsertConsumablesByExternalId = mutationGeneric({
    args: {
        entries: v.array(consumableImportEntry),
    },
    handler: async (ctx, args) => {
        let inserted = 0;
        let updated = 0;

        for (const entry of args.entries) {
            const existing = await ctx.db
                .query("consumables")
                .withIndex(
                    "by_external_id",
                    (q: any) => q.eq("externalId", entry.externalId),
                )
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    name: entry.name,
                    category: entry.category,
                    source: entry.source,
                    iconKey: entry.iconKey,
                    iconPath: entry.iconPath,
                    updatedAt: entry.updatedAt,
                });
                updated += 1;
                continue;
            }

            await ctx.db.insert("consumables", {
                externalId: entry.externalId,
                name: entry.name,
                category: entry.category,
                source: entry.source,
                iconKey: entry.iconKey,
                iconPath: entry.iconPath,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            });
            inserted += 1;
        }

        return {
            processed: args.entries.length,
            inserted,
            updated,
        };
    },
});

export const upsertIngredientsByExternalId = mutationGeneric({
    args: {
        entries: v.array(ingredientImportEntry),
    },
    handler: async (ctx, args) => {
        let inserted = 0;
        let updated = 0;

        for (const entry of args.entries) {
            const existing = await ctx.db
                .query("ingredients")
                .withIndex(
                    "by_external_id",
                    (q: any) => q.eq("externalId", entry.externalId),
                )
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    name: entry.name,
                    source: entry.source,
                    iconKey: entry.iconKey,
                    iconPath: entry.iconPath,
                    updatedAt: entry.updatedAt,
                });
                updated += 1;
                continue;
            }

            await ctx.db.insert("ingredients", {
                externalId: entry.externalId,
                name: entry.name,
                source: entry.source,
                iconKey: entry.iconKey,
                iconPath: entry.iconPath,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            });
            inserted += 1;
        }

        return {
            processed: args.entries.length,
            inserted,
            updated,
        };
    },
});

export const upsertRecipesByExternalId = mutationGeneric({
    args: {
        entries: v.array(recipeImportEntry),
    },
    handler: async (ctx, args) => {
        let inserted = 0;
        let updated = 0;

        for (const entry of args.entries) {
            const consumable = await ctx.db
                .query("consumables")
                .withIndex(
                    "by_external_id",
                    (q: any) => q.eq("externalId", entry.consumableExternalId),
                )
                .first();

            if (!consumable) {
                throw new Error(
                    `Consumable externalId not found while importing recipe: ${entry.consumableExternalId}`,
                );
            }

            const existingByExternalId = await ctx.db
                .query("recipes")
                .withIndex(
                    "by_external_id",
                    (q: any) => q.eq("externalId", entry.externalId),
                )
                .first();

            if (existingByExternalId) {
                await ctx.db.patch(existingByExternalId._id, {
                    consumableId: consumable._id,
                    profession: entry.profession,
                    source: entry.source,
                    lastSyncedAt: entry.lastSyncedAt,
                    updatedAt: entry.updatedAt,
                });
                updated += 1;
                continue;
            }

            const existingByConsumable = await ctx.db
                .query("recipes")
                .withIndex(
                    "by_consumable",
                    (q: any) => q.eq("consumableId", consumable._id),
                )
                .first();

            if (existingByConsumable) {
                await ctx.db.patch(existingByConsumable._id, {
                    externalId: entry.externalId,
                    profession: entry.profession,
                    source: entry.source,
                    lastSyncedAt: entry.lastSyncedAt,
                    updatedAt: entry.updatedAt,
                });
                updated += 1;
                continue;
            }

            await ctx.db.insert("recipes", {
                externalId: entry.externalId,
                consumableId: consumable._id,
                profession: entry.profession,
                source: entry.source,
                lastSyncedAt: entry.lastSyncedAt,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            });
            inserted += 1;
        }

        return {
            processed: args.entries.length,
            inserted,
            updated,
        };
    },
});

export const replaceRecipeIngredientsByRecipeExternalId = mutationGeneric({
    args: {
        recipeExternalIds: v.array(v.string()),
        entries: v.array(recipeIngredientImportEntry),
    },
    handler: async (ctx, args) => {
        const recipeByExternalId = new Map<string, any>();
        const ingredientByExternalId = new Map<string, any>();

        for (const recipeExternalId of args.recipeExternalIds) {
            const recipe = await ctx.db
                .query("recipes")
                .withIndex(
                    "by_external_id",
                    (q: any) => q.eq("externalId", recipeExternalId),
                )
                .first();

            if (!recipe) {
                throw new Error(
                    `Recipe externalId not found while replacing ingredients: ${recipeExternalId}`,
                );
            }

            recipeByExternalId.set(recipeExternalId, recipe);
        }

        let deleted = 0;
        for (const recipeExternalId of args.recipeExternalIds) {
            const recipe = recipeByExternalId.get(recipeExternalId);
            const existingLinks = await ctx.db
                .query("recipeIngredients")
                .withIndex(
                    "by_recipe",
                    (q: any) => q.eq("recipeId", recipe._id),
                )
                .collect();

            for (const link of existingLinks) {
                await ctx.db.delete(link._id);
                deleted += 1;
            }
        }

        const uniqueIngredientExternalIds = [
            ...new Set(args.entries.map((entry) => entry.ingredientExternalId)),
        ];
        for (const ingredientExternalId of uniqueIngredientExternalIds) {
            const ingredient = await ctx.db
                .query("ingredients")
                .withIndex(
                    "by_external_id",
                    (q: any) => q.eq("externalId", ingredientExternalId),
                )
                .first();

            if (!ingredient) {
                throw new Error(
                    `Ingredient externalId not found while importing recipe ingredients: ${ingredientExternalId}`,
                );
            }

            ingredientByExternalId.set(ingredientExternalId, ingredient);
        }

        let inserted = 0;
        for (const entry of args.entries) {
            const recipe = recipeByExternalId.get(entry.recipeExternalId);
            if (!recipe) {
                throw new Error(
                    `Recipe externalId missing from batch context: ${entry.recipeExternalId}`,
                );
            }

            const ingredient = ingredientByExternalId.get(
                entry.ingredientExternalId,
            );
            if (!ingredient) {
                throw new Error(
                    `Ingredient externalId missing from batch context: ${entry.ingredientExternalId}`,
                );
            }

            await ctx.db.insert("recipeIngredients", {
                recipeId: recipe._id,
                ingredientId: ingredient._id,
                qtyPerConsumable: entry.qtyPerConsumable,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            });
            inserted += 1;
        }

        return {
            recipesReplaced: args.recipeExternalIds.length,
            deleted,
            inserted,
        };
    },
});

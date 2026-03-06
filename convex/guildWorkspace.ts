import { getAuthUserId } from "@convex-dev/auth/server";
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

type GuildRole = "lead" | "officer" | "member";
type ConvexCtx = any;

function canManageGuild(role: GuildRole) {
    return role === "lead" || role === "officer";
}

function roundTo(value: number, digits: number) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

async function requireAuthenticatedUserId(ctx: ConvexCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
        throw new Error("Authentication required.");
    }
    return userId;
}

async function getGuildMembership(
    ctx: ConvexCtx,
    guildId: string,
    userId: string,
) {
    return await ctx.db
        .query("guildMemberships")
        .withIndex("by_guild_user", (q: any) => q.eq("guildId", guildId as any))
        .filter((q: any) => q.eq(q.field("userId"), userId as any))
        .first();
}

async function assertGuildMember(
    ctx: ConvexCtx,
    guildId: string,
    userId: string,
) {
    const membership = await getGuildMembership(ctx, guildId, userId);
    if (!membership) {
        throw new Error("User is not a member of this guild.");
    }
    return membership;
}

async function assertGuildManager(
    ctx: ConvexCtx,
    guildId: string,
    userId: string,
) {
    const membership = await assertGuildMember(ctx, guildId, userId);
    if (!canManageGuild(membership.role as GuildRole)) {
        throw new Error(
            "Only guild leads or officers can perform this action.",
        );
    }
    return membership;
}

async function getRaidRequestItemWithGuild(
    ctx: ConvexCtx,
    raidRequestItemId: string,
) {
    const requestItem = await ctx.db.get(raidRequestItemId as any);
    if (!requestItem) {
        throw new Error("Raid request item not found.");
    }

    const raidRequest = await ctx.db.get(requestItem.raidRequestId);
    if (!raidRequest) {
        throw new Error("Parent raid request not found.");
    }

    return {
        requestItem,
        raidRequest,
    };
}

async function recomputeRaidRequestItemMetrics(
    ctx: ConvexCtx,
    raidRequestItemId: string,
    now: number,
) {
    const { requestItem } = await getRaidRequestItemWithGuild(
        ctx,
        raidRequestItemId,
    );

    const readySupplies = await ctx.db
        .query("readyConsumableSupplies")
        .withIndex(
            "by_request_item",
            (q: any) => q.eq("raidRequestItemId", requestItem._id),
        )
        .collect();

    const ingredientSupplies = await ctx.db
        .query("ingredientSupplies")
        .withIndex(
            "by_request_item",
            (q: any) => q.eq("raidRequestItemId", requestItem._id),
        )
        .collect();

    const readySuppliedQty = readySupplies.reduce(
        (sum: number, supply: any) => sum + supply.qty,
        0,
    );
    const readyAppliedQty = Math.min(
        requestItem.requestedQty,
        readySuppliedQty,
    );
    const remainingConsumableQty = Math.max(
        0,
        requestItem.requestedQty - readyAppliedQty,
    );

    const recipe = await ctx.db
        .query("recipes")
        .withIndex(
            "by_consumable",
            (q: any) => q.eq("consumableId", requestItem.consumableId),
        )
        .first();

    let ingredientCoveragePct = remainingConsumableQty === 0 ? 1 : 0;

    if (recipe) {
        const recipeIngredients = await ctx.db
            .query("recipeIngredients")
            .withIndex("by_recipe", (q: any) => q.eq("recipeId", recipe._id))
            .collect();

        if (recipeIngredients.length > 0) {
            const suppliedByIngredientId = new Map<string, number>();
            for (const supply of ingredientSupplies) {
                suppliedByIngredientId.set(
                    supply.ingredientId,
                    (suppliedByIngredientId.get(supply.ingredientId) ?? 0) +
                        supply.qty,
                );
            }

            let totalRequiredAfterReady = 0;
            let totalCoveredByIngredients = 0;

            for (const ingredient of recipeIngredients) {
                const requiredAfterReady = remainingConsumableQty *
                    ingredient.qtyPerConsumable;
                const supplied =
                    suppliedByIngredientId.get(ingredient.ingredientId) ?? 0;

                totalRequiredAfterReady += requiredAfterReady;
                totalCoveredByIngredients += Math.min(
                    requiredAfterReady,
                    supplied,
                );
            }

            ingredientCoveragePct = totalRequiredAfterReady === 0
                ? 1
                : roundTo(
                    totalCoveredByIngredients / totalRequiredAfterReady,
                    4,
                );
        }
    }

    await ctx.db.patch(requestItem._id, {
        readySuppliedQty,
        ingredientCoveragePct,
        remainingConsumableQty,
        updatedAt: now,
    });

    return {
        readySuppliedQty,
        ingredientCoveragePct,
        remainingConsumableQty,
    };
}

export const listGuildInvites = queryGeneric({
    args: {
        guildId: v.id("guilds"),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        await assertGuildMember(ctx, args.guildId, userId);

        return await ctx.db
            .query("guildInvites")
            .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
            .order("desc")
            .collect();
    },
});

export const listRaidRequests = queryGeneric({
    args: {
        guildId: v.id("guilds"),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        await assertGuildMember(ctx, args.guildId, userId);

        const requests = await ctx.db
            .query("raidRequests")
            .withIndex("by_guild_date", (q) => q.eq("guildId", args.guildId))
            .collect();

        const requestsWithItems = await Promise.all(
            requests.map(async (request) => {
                const items = await ctx.db
                    .query("raidRequestItems")
                    .withIndex(
                        "by_raid_request",
                        (q) => q.eq("raidRequestId", request._id),
                    )
                    .collect();

                return {
                    ...request,
                    items,
                };
            }),
        );

        return requestsWithItems;
    },
});

export const createGuildInvite = mutationGeneric({
    args: {
        guildId: v.id("guilds"),
        code: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        await assertGuildManager(ctx, args.guildId, userId);

        const now = Date.now();

        const inviteId = await ctx.db.insert("guildInvites", {
            guildId: args.guildId,
            createdByUserId: userId,
            code: args.code,
            expiresAt: args.expiresAt,
            createdAt: now,
            updatedAt: now,
        });

        return {
            inviteId,
            createdAt: now,
            updatedAt: now,
        };
    },
});

export const acceptGuildInvite = mutationGeneric({
    args: {
        guildId: v.id("guilds"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const now = Date.now();

        const matchingCodeInvites = await ctx.db
            .query("guildInvites")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .collect();

        const invite = matchingCodeInvites.find(
            (entry) =>
                entry.guildId === args.guildId &&
                entry.acceptedByUserId === undefined &&
                entry.expiresAt >= now,
        );

        if (!invite) {
            return {
                accepted: false,
            };
        }

        await ctx.db.patch(invite._id, {
            acceptedByUserId: userId,
            acceptedAt: now,
            updatedAt: now,
        });

        const existingMembership = await ctx.db
            .query("guildMemberships")
            .withIndex("by_guild_user", (q) => q.eq("guildId", args.guildId))
            .filter((q) => q.eq(q.field("userId"), userId))
            .first();

        if (!existingMembership) {
            await ctx.db.insert("guildMemberships", {
                guildId: args.guildId,
                userId,
                role: "member",
                joinedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        } else {
            await ctx.db.patch(existingMembership._id, {
                updatedAt: now,
            });
        }

        return {
            accepted: true,
            inviteId: invite._id,
            acceptedAt: now,
        };
    },
});

export const createRaidRequest = mutationGeneric({
    args: {
        guildId: v.id("guilds"),
        title: v.string(),
        raidDate: v.string(),
        items: v.array(
            v.object({
                consumableId: v.id("consumables"),
                requestedQty: v.number(),
                note: v.optional(v.string()),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        await assertGuildManager(ctx, args.guildId, userId);

        const now = Date.now();

        const raidRequestId = await ctx.db.insert("raidRequests", {
            guildId: args.guildId,
            title: args.title,
            raidDate: args.raidDate,
            createdByUserId: userId,
            createdAt: now,
            updatedAt: now,
        });

        const raidRequestItemIds = [];
        for (const item of args.items) {
            if (item.requestedQty <= 0) {
                throw new Error("Requested quantity must be greater than 0.");
            }

            const itemId = await ctx.db.insert("raidRequestItems", {
                raidRequestId,
                consumableId: item.consumableId,
                requestedQty: item.requestedQty,
                readySuppliedQty: 0,
                ingredientCoveragePct: 0,
                remainingConsumableQty: item.requestedQty,
                note: item.note,
                createdAt: now,
                updatedAt: now,
            });

            raidRequestItemIds.push(itemId);
        }

        return {
            raidRequestId,
            raidRequestItemIds,
            createdAt: now,
            updatedAt: now,
        };
    },
});

export const listRaidRequestItemSupplies = queryGeneric({
    args: {
        raidRequestItemId: v.id("raidRequestItems"),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const { raidRequest } = await getRaidRequestItemWithGuild(
            ctx,
            args.raidRequestItemId,
        );
        await assertGuildMember(ctx, raidRequest.guildId, userId);

        const ingredientSupplies = await ctx.db
            .query("ingredientSupplies")
            .withIndex(
                "by_request_item",
                (q) => q.eq("raidRequestItemId", args.raidRequestItemId),
            )
            .collect();

        const readyConsumableSupplies = await ctx.db
            .query("readyConsumableSupplies")
            .withIndex(
                "by_request_item",
                (q) => q.eq("raidRequestItemId", args.raidRequestItemId),
            )
            .collect();

        return {
            ingredientSupplies: ingredientSupplies.sort(
                (a, b) => b.suppliedAt - a.suppliedAt,
            ),
            readyConsumableSupplies: readyConsumableSupplies.sort(
                (a, b) => b.suppliedAt - a.suppliedAt,
            ),
        };
    },
});

export const addIngredientSupply = mutationGeneric({
    args: {
        guildId: v.id("guilds"),
        raidRequestItemId: v.id("raidRequestItems"),
        ingredientId: v.id("ingredients"),
        qty: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.qty <= 0) {
            throw new Error("Supply quantity must be greater than 0.");
        }

        const userId = await requireAuthenticatedUserId(ctx);
        await assertGuildMember(ctx, args.guildId, userId);

        const { raidRequest } = await getRaidRequestItemWithGuild(
            ctx,
            args.raidRequestItemId,
        );
        if (raidRequest.guildId !== args.guildId) {
            throw new Error("Guild mismatch for request item supply.");
        }

        const now = Date.now();
        const supplyId = await ctx.db.insert("ingredientSupplies", {
            guildId: args.guildId,
            raidRequestItemId: args.raidRequestItemId,
            ingredientId: args.ingredientId,
            qty: args.qty,
            contributorUserId: userId,
            suppliedAt: now,
            note: args.note,
            createdAt: now,
            updatedAt: now,
        });

        const metrics = await recomputeRaidRequestItemMetrics(
            ctx,
            args.raidRequestItemId,
            now,
        );

        return {
            supplyId,
            suppliedAt: now,
            ...metrics,
        };
    },
});

export const addReadyConsumableSupply = mutationGeneric({
    args: {
        guildId: v.id("guilds"),
        raidRequestItemId: v.id("raidRequestItems"),
        consumableId: v.id("consumables"),
        qty: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.qty <= 0) {
            throw new Error("Supply quantity must be greater than 0.");
        }

        const userId = await requireAuthenticatedUserId(ctx);
        await assertGuildMember(ctx, args.guildId, userId);

        const { requestItem, raidRequest } = await getRaidRequestItemWithGuild(
            ctx,
            args.raidRequestItemId,
        );
        if (raidRequest.guildId !== args.guildId) {
            throw new Error("Guild mismatch for request item supply.");
        }
        if (requestItem.consumableId !== args.consumableId) {
            throw new Error("Consumable does not match raid request item.");
        }

        const now = Date.now();
        const supplyId = await ctx.db.insert("readyConsumableSupplies", {
            guildId: args.guildId,
            raidRequestItemId: args.raidRequestItemId,
            consumableId: args.consumableId,
            qty: args.qty,
            contributorUserId: userId,
            suppliedAt: now,
            note: args.note,
            createdAt: now,
            updatedAt: now,
        });

        const metrics = await recomputeRaidRequestItemMetrics(
            ctx,
            args.raidRequestItemId,
            now,
        );

        return {
            supplyId,
            suppliedAt: now,
            ...metrics,
        };
    },
});

function createExternalId(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${
        Math.random().toString(36).slice(2, 8)
    }`;
}

function slugifyGuildName(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function getUniqueGuildSlug(ctx: ConvexCtx, baseSlug: string) {
    const normalizedBase = slugifyGuildName(baseSlug) || "guild";

    let candidate = normalizedBase;
    let index = 1;

    for (;;) {
        const existing = await ctx.db
            .query("guilds")
            .withIndex("by_slug", (q: any) => q.eq("slug", candidate))
            .first();

        if (!existing) {
            return candidate;
        }

        candidate = `${normalizedBase}-${index}`;
        index += 1;
    }
}

export const ensureGuildByExternalId = mutationGeneric({
    args: {
        guildExternalId: v.string(),
        name: v.string(),
        slug: v.optional(v.string()),
        realm: v.union(
            v.literal("Nordanaar"),
            v.literal("Tel'Abim"),
            v.literal("Ambershire"),
        ),
        faction: v.union(v.literal("Alliance"), v.literal("Horde")),
        role: v.optional(
            v.union(
                v.literal("lead"),
                v.literal("officer"),
                v.literal("member"),
            ),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const now = Date.now();

        let guild = await ctx.db
            .query("guilds")
            .withIndex(
                "by_external_id",
                (q: any) => q.eq("externalId", args.guildExternalId),
            )
            .first();

        let created = false;

        if (!guild) {
            const slug = await getUniqueGuildSlug(
                ctx,
                args.slug ?? args.guildExternalId,
            );

            const guildId = await ctx.db.insert("guilds", {
                externalId: args.guildExternalId,
                name: args.name,
                slug,
                realm: args.realm,
                faction: args.faction,
                ownerId: userId,
                createdAt: now,
                updatedAt: now,
            });

            guild = await ctx.db.get(guildId);
            created = true;
        }

        if (!guild) {
            throw new Error("Unable to create or load guild.");
        }

        const existingMembership = await ctx.db
            .query("guildMemberships")
            .withIndex("by_guild_user", (q: any) => q.eq("guildId", guild._id))
            .filter((q: any) => q.eq(q.field("userId"), userId))
            .first();

        const membershipRole = args.role ?? "lead";

        if (!existingMembership) {
            await ctx.db.insert("guildMemberships", {
                guildId: guild._id,
                userId,
                role: membershipRole,
                joinedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }

        return {
            guildId: guild._id,
            externalId: args.guildExternalId,
            created,
            membershipRole,
            updatedAt: now,
        };
    },
});

export const listViewerGuilds = queryGeneric({
    args: {},
    handler: async (ctx) => {
        const userId = await requireAuthenticatedUserId(ctx);

        const memberships = await ctx.db
            .query("guildMemberships")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .collect();

        const guildEntries = await Promise.all(
            memberships.map(async (membership: any) => {
                const guild = await ctx.db.get(membership.guildId);
                if (!guild) {
                    return null;
                }

                return {
                    externalId: guild.externalId ?? guild._id,
                    name: guild.name,
                    realm: guild.realm,
                    faction: guild.faction,
                    role: membership.role,
                    createdAt: guild.createdAt,
                    updatedAt: guild.updatedAt,
                };
            }),
        );

        return guildEntries.filter((entry: any) => entry !== null);
    },
});

export const listGuildMembersByExternalId = queryGeneric({
    args: {
        guildExternalId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildMember(ctx, guild._id, userId);

        const memberships = await ctx.db
            .query("guildMemberships")
            .withIndex("by_guild", (q: any) => q.eq("guildId", guild._id))
            .collect();

        const members = await Promise.all(
            memberships.map(async (membership: any) => {
                const memberUser = await ctx.db.get(membership.userId);

                return {
                    guildExternalId: args.guildExternalId,
                    userId: membership.userId,
                    role: membership.role,
                    characterName: memberUser?.name ?? memberUser?.email ??
                        String(membership.userId),
                    createdAt: membership.createdAt,
                    updatedAt: membership.updatedAt,
                };
            }),
        );

        return members;
    },
});

export const createGuildByExternalId = mutationGeneric({
    args: {
        externalId: v.optional(v.string()),
        name: v.string(),
        slug: v.optional(v.string()),
        realm: v.union(
            v.literal("Nordanaar"),
            v.literal("Tel'Abim"),
            v.literal("Ambershire"),
        ),
        faction: v.union(v.literal("Alliance"), v.literal("Horde")),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const now = Date.now();
        const externalId = args.externalId ?? createExternalId("guild");

        const existingGuild = await ctx.db
            .query("guilds")
            .withIndex(
                "by_external_id",
                (q: any) => q.eq("externalId", externalId),
            )
            .first();

        if (existingGuild) {
            return {
                guildId: existingGuild._id,
                externalId,
                name: existingGuild.name,
                realm: existingGuild.realm,
                faction: existingGuild.faction,
                created: false,
            };
        }

        const slug = await getUniqueGuildSlug(ctx, args.slug ?? externalId);

        const guildId = await ctx.db.insert("guilds", {
            externalId,
            name: args.name,
            slug,
            realm: args.realm,
            faction: args.faction,
            ownerId: userId,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.db.insert("guildMemberships", {
            guildId,
            userId,
            role: "lead",
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
        });

        return {
            guildId,
            externalId,
            name: args.name,
            realm: args.realm,
            faction: args.faction,
            created: true,
        };
    },
});

async function requireGuildByExternalId(
    ctx: ConvexCtx,
    guildExternalId: string,
) {
    const guild = await ctx.db
        .query("guilds")
        .withIndex(
            "by_external_id",
            (q: any) => q.eq("externalId", guildExternalId),
        )
        .first();

    if (!guild) {
        throw new Error(`Guild externalId not found: ${guildExternalId}`);
    }

    return guild;
}

async function requireRaidRequestItemByExternalId(
    ctx: ConvexCtx,
    raidRequestItemExternalId: string,
) {
    const item = await ctx.db
        .query("raidRequestItems")
        .withIndex(
            "by_external_id",
            (q: any) => q.eq("externalId", raidRequestItemExternalId),
        )
        .first();

    if (!item) {
        throw new Error(
            `Raid request item externalId not found: ${raidRequestItemExternalId}`,
        );
    }

    return item;
}

async function requireConsumableByExternalId(
    ctx: ConvexCtx,
    consumableExternalId: string,
) {
    const consumable = await ctx.db
        .query("consumables")
        .withIndex(
            "by_external_id",
            (q: any) => q.eq("externalId", consumableExternalId),
        )
        .first();

    if (!consumable) {
        throw new Error(
            `Consumable externalId not found: ${consumableExternalId}`,
        );
    }

    return consumable;
}

async function requireIngredientByExternalId(
    ctx: ConvexCtx,
    ingredientExternalId: string,
) {
    const ingredient = await ctx.db
        .query("ingredients")
        .withIndex(
            "by_external_id",
            (q: any) => q.eq("externalId", ingredientExternalId),
        )
        .first();

    if (!ingredient) {
        throw new Error(
            `Ingredient externalId not found: ${ingredientExternalId}`,
        );
    }

    return ingredient;
}

export const listGuildInvitesByExternalId = queryGeneric({
    args: {
        guildExternalId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildMember(ctx, guild._id, userId);

        const invites = await ctx.db
            .query("guildInvites")
            .withIndex("by_guild", (q: any) => q.eq("guildId", guild._id))
            .order("desc")
            .collect();

        return invites.map((invite: any) => ({
            externalId: invite.externalId ?? invite._id,
            guildExternalId: args.guildExternalId,
            code: invite.code,
            createdByUserId: invite.createdByUserId,
            expiresAt: invite.expiresAt,
            acceptedByUserId: invite.acceptedByUserId,
            acceptedAt: invite.acceptedAt,
            createdAt: invite.createdAt,
            updatedAt: invite.updatedAt,
        }));
    },
});

export const createGuildInviteByExternalId = mutationGeneric({
    args: {
        guildExternalId: v.string(),
        externalId: v.optional(v.string()),
        code: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildManager(ctx, guild._id, userId);

        const now = Date.now();
        const inviteExternalId = args.externalId ?? createExternalId("invite");

        const inviteId = await ctx.db.insert("guildInvites", {
            externalId: inviteExternalId,
            guildId: guild._id,
            createdByUserId: userId,
            code: args.code,
            expiresAt: args.expiresAt,
            createdAt: now,
            updatedAt: now,
        });

        return {
            inviteId,
            externalId: inviteExternalId,
            guildExternalId: args.guildExternalId,
            createdAt: now,
            updatedAt: now,
        };
    },
});

export const acceptGuildInviteByExternalId = mutationGeneric({
    args: {
        guildExternalId: v.string(),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        const now = Date.now();

        const matchingCodeInvites = await ctx.db
            .query("guildInvites")
            .withIndex("by_code", (q: any) => q.eq("code", args.code))
            .collect();

        const invite = matchingCodeInvites.find(
            (entry: any) =>
                entry.guildId === guild._id &&
                entry.acceptedByUserId === undefined &&
                entry.expiresAt >= now,
        );

        if (!invite) {
            return {
                accepted: false,
            };
        }

        await ctx.db.patch(invite._id, {
            acceptedByUserId: userId,
            acceptedAt: now,
            updatedAt: now,
        });

        const existingMembership = await ctx.db
            .query("guildMemberships")
            .withIndex("by_guild_user", (q: any) => q.eq("guildId", guild._id))
            .filter((q: any) => q.eq(q.field("userId"), userId))
            .first();

        if (!existingMembership) {
            await ctx.db.insert("guildMemberships", {
                guildId: guild._id,
                userId,
                role: "member",
                joinedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        } else {
            await ctx.db.patch(existingMembership._id, {
                updatedAt: now,
            });
        }

        return {
            accepted: true,
            inviteExternalId: invite.externalId ?? invite._id,
            guildExternalId: args.guildExternalId,
            acceptedAt: now,
        };
    },
});

export const listRaidRequestsByExternalId = queryGeneric({
    args: {
        guildExternalId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildMember(ctx, guild._id, userId);

        const requests = await ctx.db
            .query("raidRequests")
            .withIndex("by_guild_date", (q: any) => q.eq("guildId", guild._id))
            .collect();

        const requestsWithItems = await Promise.all(
            requests.map(async (request: any) => {
                const items = await ctx.db
                    .query("raidRequestItems")
                    .withIndex(
                        "by_raid_request",
                        (q: any) => q.eq("raidRequestId", request._id),
                    )
                    .collect();

                return {
                    request,
                    items,
                };
            }),
        );

        const uniqueConsumableIds = new Set<string>();
        for (const entry of requestsWithItems) {
            for (const item of entry.items) {
                uniqueConsumableIds.add(item.consumableId);
            }
        }

        const consumableById = new Map<string, any>();
        await Promise.all(
            [...uniqueConsumableIds].map(async (consumableId) => {
                const consumable = await ctx.db.get(consumableId as any);
                if (consumable) {
                    consumableById.set(consumableId, consumable);
                }
            }),
        );

        return requestsWithItems.map(({ request, items }) => ({
            externalId: request.externalId ?? request._id,
            guildExternalId: args.guildExternalId,
            title: request.title,
            raidDate: request.raidDate,
            createdByUserId: request.createdByUserId,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            items: items.map((item: any) => ({
                externalId: item.externalId ?? item._id,
                raidRequestExternalId: request.externalId ?? request._id,
                consumableExternalId:
                    consumableById.get(item.consumableId)?.externalId ??
                        item.consumableId,
                requestedQty: item.requestedQty,
                readySuppliedQty: item.readySuppliedQty,
                ingredientCoveragePct: item.ingredientCoveragePct,
                remainingConsumableQty: item.remainingConsumableQty,
                note: item.note,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
        }));
    },
});

export const createRaidRequestByExternalIds = mutationGeneric({
    args: {
        guildExternalId: v.string(),
        externalId: v.optional(v.string()),
        title: v.string(),
        raidDate: v.string(),
        items: v.array(
            v.object({
                externalId: v.optional(v.string()),
                consumableExternalId: v.string(),
                requestedQty: v.number(),
                note: v.optional(v.string()),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildManager(ctx, guild._id, userId);

        const now = Date.now();
        const raidRequestExternalId = args.externalId ??
            createExternalId("raid-request");

        const raidRequestId = await ctx.db.insert("raidRequests", {
            externalId: raidRequestExternalId,
            guildId: guild._id,
            title: args.title,
            raidDate: args.raidDate,
            createdByUserId: userId,
            createdAt: now,
            updatedAt: now,
        });

        const createdItems: Array<{ itemId: string; externalId: string }> = [];
        for (const item of args.items) {
            if (item.requestedQty <= 0) {
                throw new Error("Requested quantity must be greater than 0.");
            }

            const consumable = await requireConsumableByExternalId(
                ctx,
                item.consumableExternalId,
            );
            const itemExternalId = item.externalId ??
                createExternalId("raid-request-item");

            const itemId = await ctx.db.insert("raidRequestItems", {
                externalId: itemExternalId,
                raidRequestId,
                consumableId: consumable._id,
                requestedQty: item.requestedQty,
                readySuppliedQty: 0,
                ingredientCoveragePct: 0,
                remainingConsumableQty: item.requestedQty,
                note: item.note,
                createdAt: now,
                updatedAt: now,
            });

            createdItems.push({
                itemId,
                externalId: itemExternalId,
            });
        }

        return {
            raidRequestId,
            externalId: raidRequestExternalId,
            guildExternalId: args.guildExternalId,
            itemExternalIds: createdItems,
            createdAt: now,
            updatedAt: now,
        };
    },
});

export const listRaidRequestItemSuppliesByExternalId = queryGeneric({
    args: {
        raidRequestItemExternalId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await requireAuthenticatedUserId(ctx);
        const requestItem = await requireRaidRequestItemByExternalId(
            ctx,
            args.raidRequestItemExternalId,
        );
        const { raidRequest } = await getRaidRequestItemWithGuild(
            ctx,
            requestItem._id,
        );
        await assertGuildMember(ctx, raidRequest.guildId, userId);

        const ingredientSupplies = await ctx.db
            .query("ingredientSupplies")
            .withIndex(
                "by_request_item",
                (q: any) => q.eq("raidRequestItemId", requestItem._id),
            )
            .collect();

        const readyConsumableSupplies = await ctx.db
            .query("readyConsumableSupplies")
            .withIndex(
                "by_request_item",
                (q: any) => q.eq("raidRequestItemId", requestItem._id),
            )
            .collect();

        const ingredientIds = [
            ...new Set(ingredientSupplies.map((s: any) => s.ingredientId)),
        ];
        const consumableIds = [
            ...new Set(readyConsumableSupplies.map((s: any) => s.consumableId)),
        ];
        const contributorUserIds = [
            ...new Set(
                [...ingredientSupplies, ...readyConsumableSupplies].map(
                    (s: any) => s.contributorUserId,
                ),
            ),
        ];

        const ingredientById = new Map<string, any>();
        const consumableById = new Map<string, any>();
        const contributorNameByUserId = new Map<string, string>();

        await Promise.all([
            ...ingredientIds.map(async (ingredientId: string) => {
                const ingredient = await ctx.db.get(ingredientId as any);
                if (ingredient) {
                    ingredientById.set(ingredientId, ingredient);
                }
            }),
            ...consumableIds.map(async (consumableId: string) => {
                const consumable = await ctx.db.get(consumableId as any);
                if (consumable) {
                    consumableById.set(consumableId, consumable);
                }
            }),
            ...contributorUserIds.map(async (contributorUserId: string) => {
                const user = await ctx.db.get(contributorUserId as any);
                contributorNameByUserId.set(
                    contributorUserId,
                    user?.name ?? user?.email ?? String(contributorUserId),
                );
            }),
        ]);

        return {
            ingredientSupplies: ingredientSupplies
                .sort((a: any, b: any) => b.suppliedAt - a.suppliedAt)
                .map((supply: any) => ({
                    externalId: supply.externalId ?? supply._id,
                    raidRequestItemExternalId: args.raidRequestItemExternalId,
                    ingredientExternalId:
                        ingredientById.get(supply.ingredientId)?.externalId ??
                            supply.ingredientId,
                    qty: supply.qty,
                    contributorUserId: supply.contributorUserId,
                    contributorName:
                        contributorNameByUserId.get(supply.contributorUserId) ??
                            String(supply.contributorUserId),
                    suppliedAt: supply.suppliedAt,
                    note: supply.note,
                    createdAt: supply.createdAt,
                    updatedAt: supply.updatedAt,
                })),
            readyConsumableSupplies: readyConsumableSupplies
                .sort((a: any, b: any) => b.suppliedAt - a.suppliedAt)
                .map((supply: any) => ({
                    externalId: supply.externalId ?? supply._id,
                    raidRequestItemExternalId: args.raidRequestItemExternalId,
                    consumableExternalId:
                        consumableById.get(supply.consumableId)?.externalId ??
                            supply.consumableId,
                    qty: supply.qty,
                    contributorUserId: supply.contributorUserId,
                    contributorName:
                        contributorNameByUserId.get(supply.contributorUserId) ??
                            String(supply.contributorUserId),
                    suppliedAt: supply.suppliedAt,
                    note: supply.note,
                    createdAt: supply.createdAt,
                    updatedAt: supply.updatedAt,
                })),
        };
    },
});

export const addIngredientSupplyByExternalIds = mutationGeneric({
    args: {
        externalId: v.optional(v.string()),
        guildExternalId: v.string(),
        raidRequestItemExternalId: v.string(),
        ingredientExternalId: v.string(),
        qty: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.qty <= 0) {
            throw new Error("Supply quantity must be greater than 0.");
        }

        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildMember(ctx, guild._id, userId);

        const requestItem = await requireRaidRequestItemByExternalId(
            ctx,
            args.raidRequestItemExternalId,
        );
        const { raidRequest } = await getRaidRequestItemWithGuild(
            ctx,
            requestItem._id,
        );
        if (raidRequest.guildId !== guild._id) {
            throw new Error("Guild mismatch for request item supply.");
        }

        const ingredient = await requireIngredientByExternalId(
            ctx,
            args.ingredientExternalId,
        );

        const now = Date.now();
        const supplyExternalId = args.externalId ??
            createExternalId("ingredient-supply");

        const supplyId = await ctx.db.insert("ingredientSupplies", {
            externalId: supplyExternalId,
            guildId: guild._id,
            raidRequestItemId: requestItem._id,
            ingredientId: ingredient._id,
            qty: args.qty,
            contributorUserId: userId,
            suppliedAt: now,
            note: args.note,
            createdAt: now,
            updatedAt: now,
        });

        const metrics = await recomputeRaidRequestItemMetrics(
            ctx,
            requestItem._id,
            now,
        );

        return {
            supplyId,
            externalId: supplyExternalId,
            raidRequestItemExternalId: args.raidRequestItemExternalId,
            suppliedAt: now,
            ...metrics,
        };
    },
});

export const addReadyConsumableSupplyByExternalIds = mutationGeneric({
    args: {
        externalId: v.optional(v.string()),
        guildExternalId: v.string(),
        raidRequestItemExternalId: v.string(),
        consumableExternalId: v.string(),
        qty: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.qty <= 0) {
            throw new Error("Supply quantity must be greater than 0.");
        }

        const userId = await requireAuthenticatedUserId(ctx);
        const guild = await requireGuildByExternalId(ctx, args.guildExternalId);
        await assertGuildMember(ctx, guild._id, userId);

        const requestItem = await requireRaidRequestItemByExternalId(
            ctx,
            args.raidRequestItemExternalId,
        );
        const { raidRequest } = await getRaidRequestItemWithGuild(
            ctx,
            requestItem._id,
        );
        if (raidRequest.guildId !== guild._id) {
            throw new Error("Guild mismatch for request item supply.");
        }

        const consumable = await requireConsumableByExternalId(
            ctx,
            args.consumableExternalId,
        );
        if (requestItem.consumableId !== consumable._id) {
            throw new Error("Consumable does not match raid request item.");
        }

        const now = Date.now();
        const supplyExternalId = args.externalId ??
            createExternalId("ready-supply");

        const supplyId = await ctx.db.insert("readyConsumableSupplies", {
            externalId: supplyExternalId,
            guildId: guild._id,
            raidRequestItemId: requestItem._id,
            consumableId: consumable._id,
            qty: args.qty,
            contributorUserId: userId,
            suppliedAt: now,
            note: args.note,
            createdAt: now,
            updatedAt: now,
        });

        const metrics = await recomputeRaidRequestItemMetrics(
            ctx,
            requestItem._id,
            now,
        );

        return {
            supplyId,
            externalId: supplyExternalId,
            raidRequestItemExternalId: args.raidRequestItemExternalId,
            suppliedAt: now,
            ...metrics,
        };
    },
});

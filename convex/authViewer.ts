import { getAuthUserId } from "@convex-dev/auth/server";
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const viewer = queryGeneric({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            return null;
        }

        const accounts = await ctx.db
            .query("authAccounts")
            .withIndex("userIdAndProvider", (q: any) => q.eq("userId", userId))
            .collect();

        const providers = [
            ...new Set(
                accounts.map((account: any) => String(account.provider)),
            ),
        ];

        return {
            userId,
            name: user.name ?? null,
            email: user.email ?? null,
            providers,
        };
    },
});

export const updateDisplayName = mutationGeneric({
    args: {
        displayName: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authentication required to update display name.");
        }

        const displayName = args.displayName.trim();
        if (displayName.length < 2) {
            throw new Error("Display name must be at least 2 characters.");
        }

        if (displayName.length > 40) {
            throw new Error("Display name must be 40 characters or fewer.");
        }

        await ctx.db.patch(userId, {
            name: displayName,
        });

        return {
            userId,
            name: displayName,
        };
    },
});

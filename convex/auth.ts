import { convexAuth } from "@convex-dev/auth/server";
import Discord from "@auth/core/providers/discord";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [Discord],
});

export type RequestedBackendMode = "local" | "convex";

export interface ConsumeBackendConfig {
    requested: RequestedBackendMode;
    active: "local" | "convex";
    convexUrl?: string;
    shouldProvideConvexClient: boolean;
    note?: string;
}

function parseRequestedMode(value: unknown): RequestedBackendMode {
    if (typeof value !== "string") {
        return "local";
    }

    return value.toLowerCase() === "convex" ? "convex" : "local";
}

export function resolveConsumeBackendConfig(): ConsumeBackendConfig {
    const requested = parseRequestedMode(import.meta.env.VITE_CONSUME_BACKEND);
    const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

    if (requested === "local") {
        return {
            requested,
            active: "local",
            convexUrl,
            shouldProvideConvexClient: false,
        };
    }

    if (!convexUrl) {
        return {
            requested,
            active: "local",
            convexUrl,
            shouldProvideConvexClient: false,
            note:
                "Convex backend requested but VITE_CONVEX_URL is missing. Falling back to local state.",
        };
    }

    return {
        requested,
        active: "convex",
        convexUrl,
        shouldProvideConvexClient: true,
        note:
            "Convex client is initialized with external-ID bridge APIs for consume state sync.",
    };
}

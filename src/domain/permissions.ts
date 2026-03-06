import type { GuildRole } from "./types";

function isPrivilegedRole(role: GuildRole | undefined) {
    return role === "lead" || role === "officer";
}

export function canManageInvites(role: GuildRole | undefined) {
    return isPrivilegedRole(role);
}

export function canCreateRaidRequests(role: GuildRole | undefined) {
    return isPrivilegedRole(role);
}

export function canMemberSupply(role: GuildRole | undefined) {
    return role === "lead" || role === "officer" || role === "member";
}

export function roleLabel(role: GuildRole | undefined) {
    if (!role) {
        return "Guest";
    }

    if (role === "lead") {
        return "Guild Lead";
    }

    if (role === "officer") {
        return "Officer";
    }

    return "Member";
}

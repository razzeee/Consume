import { describe, expect, it } from "vitest";
import {
    canCreateRaidRequests,
    canManageInvites,
    canMemberSupply,
} from "../src/domain/permissions";

describe("permission matrix", () => {
    it("enforces lead/officer/member permissions across core actions", () => {
        const roles = ["lead", "officer", "member"] as const;

        const matrix = roles.map((role) => ({
            role,
            canManageInvites: canManageInvites(role),
            canCreateRaidRequests: canCreateRaidRequests(role),
            canMemberSupply: canMemberSupply(role),
        }));

        expect(matrix).toEqual([
            {
                role: "lead",
                canManageInvites: true,
                canCreateRaidRequests: true,
                canMemberSupply: true,
            },
            {
                role: "officer",
                canManageInvites: true,
                canCreateRaidRequests: true,
                canMemberSupply: true,
            },
            {
                role: "member",
                canManageInvites: false,
                canCreateRaidRequests: false,
                canMemberSupply: true,
            },
        ]);

        expect(canManageInvites(undefined)).toBe(false);
        expect(canCreateRaidRequests(undefined)).toBe(false);
        expect(canMemberSupply(undefined)).toBe(false);
    });
});

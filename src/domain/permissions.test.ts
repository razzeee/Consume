import { describe, expect, it } from "vitest";
import {
    canCreateRaidRequests,
    canManageInvites,
    canMemberSupply,
    roleLabel,
} from "./permissions";

describe("permission helpers", () => {
    it("allows invite and request management for privileged roles", () => {
        expect(canManageInvites("lead")).toBe(true);
        expect(canManageInvites("officer")).toBe(true);
        expect(canManageInvites("member")).toBe(false);

        expect(canCreateRaidRequests("lead")).toBe(true);
        expect(canCreateRaidRequests("officer")).toBe(true);
        expect(canCreateRaidRequests("member")).toBe(false);
    });

    it("allows supply contributions for all guild member roles", () => {
        expect(canMemberSupply("lead")).toBe(true);
        expect(canMemberSupply("officer")).toBe(true);
        expect(canMemberSupply("member")).toBe(true);
        expect(canMemberSupply(undefined)).toBe(false);
    });

    it("maps role labels consistently", () => {
        expect(roleLabel("lead")).toBe("Guild Lead");
        expect(roleLabel("officer")).toBe("Officer");
        expect(roleLabel("member")).toBe("Member");
        expect(roleLabel(undefined)).toBe("Guest");
    });
});

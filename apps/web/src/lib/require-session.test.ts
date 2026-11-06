import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "./require-session";

const { getSession, redirect } = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth-client", () => ({ authClient: { getSession } }));

describe("protected page session", () => {
  beforeEach(() => {
    getSession.mockReset();
    redirect.mockClear();
  });

  it("redirects a visitor without a session to sign-in", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow("REDIRECT:/login");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("returns the session for a signed-in user", async () => {
    const session = { user: { id: "student-1", name: "Campus User" } };
    getSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toEqual(session);
    expect(redirect).not.toHaveBeenCalled();
  });
});

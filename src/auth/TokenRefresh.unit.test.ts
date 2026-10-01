import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotifyApi, AuthorizationCodeWithPKCEStrategy, ProvidedAccessTokenStrategy, InMemoryCachingStrategy, TokenRefreshError, emptyAccessToken } from "../index.js";
import AccessTokenHelpers from "./AccessTokenHelpers.js";
import type { AccessToken } from "../types.js";
import GenericCache from "../caching/GenericCache.js";

const cacheKey = "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token";
const token = (): AccessToken => ({
    access_token: "old-access", token_type: "Bearer", expires_in: 3600,
    expires: Date.now() - 1, refresh_token: "old-refresh",
});
const response = (refresh_token?: string) => new Response(JSON.stringify({
    access_token: "new-access", token_type: "Bearer", expires_in: 3600,
    ...(refresh_token === undefined ? {} : { refresh_token }),
}));

describe("Token refresh lifecycle", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
        vi.spyOn(AccessTokenHelpers, "generateCodeChallenge").mockResolvedValue("challenge");
        window.history.replaceState({}, "", "/");
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it.each(["pkce", "provided"] as const)("preserves omitted refresh tokens through successive %s refreshes", async kind => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response()));
        vi.stubGlobal("fetch", fetchMock);
        const { strategy } = setup(kind);
        for (let i = 0; i < 2; i++) {
            const refreshed = await strategy.getOrCreateAccessToken();
            expect(refreshed.refresh_token).toBe("old-refresh");
            expect(refreshed.expires).toBe(Date.now() + 3600_000);
            vi.advanceTimersByTime(3600_001);
        }
        expect(fetchMock).toHaveBeenCalledTimes(2);
        for (const [, init] of fetchMock.mock.calls) {
            expect(init.body.get("refresh_token")).toBe("old-refresh");
        }
    });

    it.each(["pkce", "provided"] as const)("uses a replacement refresh token on the next %s refresh", async kind => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response("replacement"))
            .mockResolvedValueOnce(response());
        vi.stubGlobal("fetch", fetchMock);
        const { strategy } = setup(kind);
        expect((await strategy.getOrCreateAccessToken()).refresh_token).toBe("replacement");
        vi.advanceTimersByTime(3600_001);
        expect((await strategy.getOrCreateAccessToken()).refresh_token).toBe("replacement");
        expect(fetchMock.mock.calls[1][1].body.get("refresh_token")).toBe("replacement");
    });

    it("clears invalid PKCE credentials and starts sign-in without retrying the refresh token", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);
        const { strategy, cache, redirect, sdk } = setup("pkce");
        expect(await sdk.authenticate()).toEqual({ authenticated: false, accessToken: emptyAccessToken });
        expect(await cache.get(cacheKey)).toBeNull();
        expect(await strategy.getAccessToken()).toBeNull();
        expect(redirect).toHaveBeenCalledTimes(1);
        expect(redirect.mock.calls[0][0]).toContain("https://accounts.spotify.com/authorize?");
        await sdk.authenticate();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("clears invalid provided credentials and exposes the OAuth error without retrying", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);
        const { strategy, sdk } = setup("provided");
        await expect(sdk.authenticate()).rejects.toMatchObject({ name: "TokenRefreshError", error: "invalid_grant", status: 400 });
        expect(await strategy.getAccessToken()).toBeNull();
        expect(await sdk.authenticate()).toEqual({ authenticated: false, accessToken: emptyAccessToken });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each(["pkce", "provided"] as const)("retains expired %s credentials after a network failure for a later retry", async kind => {
        const failure = new Error("network unavailable");
        const fetchMock = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(response());
        vi.stubGlobal("fetch", fetchMock);
        const { strategy, redirect } = setup(kind);
        await expect(strategy.getOrCreateAccessToken()).rejects.toBe(failure);
        expect((await strategy.getOrCreateAccessToken()).refresh_token).toBe("old-refresh");
        expect(fetchMock.mock.calls[1][1].body.get("refresh_token")).toBe("old-refresh");
        expect(redirect).not.toHaveBeenCalled();
    });

    it.each(["pkce", "provided"] as const)("retains expired %s credentials after a non-JSON server failure", async kind => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
            .mockResolvedValueOnce(response());
        vi.stubGlobal("fetch", fetchMock);
        const { strategy } = setup(kind);
        await expect(strategy.getOrCreateAccessToken()).rejects.toMatchObject({ name: "TokenRefreshError", error: undefined, status: 503 });
        expect((await strategy.getOrCreateAccessToken()).refresh_token).toBe("old-refresh");
    });

    it("does not navigate or retry invalid credentials during background cache renewal", async () => {
        const storage = new Map<string, string>();
        const cache = new GenericCache({
            get: key => storage.get(key) ?? null,
            set: (key, value) => { storage.set(key, value); },
            remove: key => { storage.delete(key); },
        }, new Map(), 1000);
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);
        const { sdk, redirect } = setup("pkce", cache);
        cache.setCacheItem(cacheKey, { ...token(), expires: Date.now() + 3600_000 });
        await sdk.authenticate();
        vi.setSystemTime(Date.now() + 3600_001);
        await vi.advanceTimersByTimeAsync(3000);
        expect(await cache.get(cacheKey)).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(redirect).not.toHaveBeenCalled();
        await sdk.authenticate();
        expect(redirect).toHaveBeenCalledTimes(1);
    });

    it("retains expired credentials when background renewal fails transiently", async () => {
        const storage = new Map<string, string>();
        const cache = new GenericCache({
            get: key => storage.get(key) ?? null,
            set: (key, value) => { storage.set(key, value); },
            remove: key => { storage.delete(key); },
        }, new Map(), 1000);
        vi.spyOn(console, "error").mockImplementation(() => {});
        const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));
        vi.stubGlobal("fetch", fetchMock);
        const { sdk, redirect } = setup("pkce", cache);
        cache.setCacheItem(cacheKey, { ...token(), expires: Date.now() + 3600_000 });
        await sdk.authenticate();
        vi.setSystemTime(Date.now() + 3600_001);
        await vi.advanceTimersByTimeAsync(1000);
        expect(JSON.parse(storage.get(cacheKey)!).refresh_token).toBe("old-refresh");
        expect(redirect).not.toHaveBeenCalled();
        fetchMock.mockImplementation(() => Promise.resolve(response()));
        expect((await sdk.authenticate()).authenticated).toBe(true);
    });

    it("keeps provided-token logout signed out without attempting refresh", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const { sdk } = setup("provided");
        sdk.logOut();
        expect(await sdk.getAccessToken()).toBeNull();
        expect((await sdk.authenticate()).authenticated).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

function setup(kind: "pkce" | "provided", cache = new InMemoryCachingStrategy()) {
    const strategy = kind === "pkce"
        ? new AuthorizationCodeWithPKCEStrategy("client", "http://127.0.0.1/callback", [])
        : new ProvidedAccessTokenStrategy("client", token());
    cache.setCacheItem(cacheKey, token());
    const redirect = vi.fn().mockResolvedValue(undefined);
    const sdk = new SpotifyApi(strategy, {
        cachingStrategy: cache,
        redirectionStrategy: { redirect, onReturnFromRedirect: async () => {} },
    });
    return { strategy, cache, redirect, sdk };
}

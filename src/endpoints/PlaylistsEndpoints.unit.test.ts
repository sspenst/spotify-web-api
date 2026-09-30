import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { SpotifyApi } from "../SpotifyApi.js";
import FakeAuthStrategy from "../test/FakeAuthStrategy.js";
import type { Episode, Page, Playlist, PlaylistedItem, SnapshotReference, Track } from "../types.js";

describe("Playlist API contracts", () => {
    let sdk: SpotifyApi;
    let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
    const snapshot = { snapshot_id: "new-version" };
    const uris = ["spotify:track:one", "spotify:episode:two"];

    beforeEach(() => {
        fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));
        sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
    });

    afterEach(() => vi.unstubAllGlobals());

    function respond(body: unknown, status = 200) {
        fetchMock.mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));
    }

    function request(method: string, path: string, body?: unknown) {
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`https://api.spotify.com/v1/${path}`);
        expect(init?.method).toBe(method);
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer fake-auth-token");
        expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
        expect(init?.body).toBe(body === undefined ? undefined : JSON.stringify(body));
    }

    it("gets playlist metadata with encoded fields, market and additional types", async () => {
        const metadata = { id: "playlist", description: null, public: null };
        respond(metadata);
        const result = await sdk.playlists.getPlaylist("playlist", "CA", "name,items.items(item(name))", ["track", "episode"]);
        request("GET", "playlists/playlist?market=CA&fields=name%2Citems.items%28item%28name%29%29&additional_types=track%2Cepisode");
        expect(result).toEqual(metadata);
        expect(result.items).toBeUndefined();
        expectTypeOf(result).toEqualTypeOf<Playlist<Track | Episode>>();
    });

    it("returns modern playlist items and allows unavailable entries", async () => {
        const page = { href: "items", limit: 50, next: null, previous: null, offset: 0, total: 1,
            items: [{ added_at: null, added_by: null, is_local: false, item: null }] };
        respond(page);
        const result = await sdk.playlists.getPlaylistItems("playlist", "CA", "items(item),total", 50, 0, ["episode"]);
        request("GET", "playlists/playlist/items?market=CA&fields=items%28item%29%2Ctotal&limit=50&offset=0&additional_types=episode");
        expect(result).toEqual(page);
        expectTypeOf(result).toEqualTypeOf<Page<PlaylistedItem<Track | Episode>>>();
    });

    it("omits unspecified playlist-item query parameters", async () => {
        const result = await sdk.playlists.getPlaylistItems("playlist");
        request("GET", "playlists/playlist/items");
        expectTypeOf(result).toEqualTypeOf<Page<PlaylistedItem<Track>>>();
    });

    it("adds mixed URIs at position zero and returns the snapshot", async () => {
        const result = await sdk.playlists.addItemsToPlaylist("playlist", uris, 0);
        request("POST", "playlists/playlist/items", { position: 0, uris });
        expect(result).toEqual(snapshot);
        expectTypeOf(result).toEqualTypeOf<SnapshotReference>();
    });

    it("appends items when no position is specified", async () => {
        await sdk.playlists.addItemsToPlaylist("playlist", uris);
        request("POST", "playlists/playlist/items", { uris });
    });

    it.each(["items", "tracks"] as const)("removes entries supplied as %s using the modern body and returns the snapshot", async (key) => {
        const entries = [{ uri: uris[0] }];
        const result = await sdk.playlists.removeItemsFromPlaylist("playlist", key === "items"
            ? { items: entries, snapshot_id: "old-version" }
            : { tracks: entries, snapshot_id: "old-version" });
        request("DELETE", "playlists/playlist/items", { items: entries, snapshot_id: "old-version" });
        expect(result).toEqual(snapshot);
        expectTypeOf(result).toEqualTypeOf<SnapshotReference>();
    });

    it.each([{ label: "replaces", replacement: ["spotify:track:one", "spotify:episode:two"] },
        { label: "clears", replacement: [] }])("$label playlist items", async ({ replacement }) => {
        const result = await sdk.playlists.updatePlaylistItems("playlist", { uris: replacement });
        request("PUT", "playlists/playlist/items", { uris: replacement });
        expect(result).toEqual(snapshot);
    });

    it("reorders with a snapshot and returns the new version", async () => {
        const result = await sdk.playlists.movePlaylistItems("playlist", 0, 2, 10, "old-version");
        request("PUT", "playlists/playlist/items", { range_start: 0, range_length: 2, insert_before: 10, snapshot_id: "old-version" });
        expect(result).toEqual(snapshot);
    });

    it("changes details including false flags and an empty description", async () => {
        respond(undefined, 204);
        const details = { name: "Renamed", public: false, collaborative: false, description: "" };
        await sdk.playlists.changePlaylistDetails("playlist", details);
        request("PUT", "playlists/playlist", details);
    });

    it.each(["playlists", "currentUser"] as const)("creates for the current user through %s", async (entry) => {
        const created = { id: "created", items: { items: [] } };
        respond(created, 201);
        const details = { name: "New playlist", public: false, collaborative: true };
        const result = entry === "playlists" ? await sdk.playlists.createPlaylist(details)
            : await sdk.currentUser.playlists.createPlaylist(details);
        request("POST", "me/playlists", details);
        expect(result).toEqual(created);
    });

    it("preserves the explicit legacy user-specific creation overload", async () => {
        await sdk.playlists.createPlaylist("user", { name: "Legacy" });
        request("POST", "users/user/playlists", { name: "Legacy" });
    });

    it("paginates the current user's playlists without changing totals", async () => {
        const page = { items: [], total: 73, next: "next-page" };
        respond(page);
        expect(await sdk.currentUser.playlists.playlists(50, 0)).toEqual(page);
        request("GET", "me/playlists?limit=50&offset=0");
    });

    it("preserves legacy user playlist listing", async () => {
        await sdk.playlists.getUsersPlaylists("user", 50, 0);
        request("GET", "users/user/playlists?limit=50&offset=0");
    });

    it.each(["follow", "unfollow"] as const)("uses the library endpoint to %s", async (operation) => {
        respond(undefined, 204);
        await sdk.currentUser.playlists[operation]("playlist");
        request(operation === "follow" ? "PUT" : "DELETE", "me/library?uris=spotify%3Aplaylist%3Aplaylist");
    });

    it("checks the current user's library for a playlist", async () => {
        respond([true]);
        expect(await sdk.currentUser.playlists.isFollowing("playlist")).toEqual([true]);
        request("GET", "me/library/contains?uris=spotify%3Aplaylist%3Aplaylist");
    });

    it("preserves the legacy follower check when ids are provided", async () => {
        respond([true]);
        await sdk.currentUser.playlists.isFollowing("playlist", ["user"]);
        request("GET", "playlists/playlist/followers/contains?ids=user");
    });

    it("gets cover image metadata", async () => {
        const images = [{ url: "https://example.com/cover.jpg", width: null, height: null }];
        respond(images);
        expect(await sdk.playlists.getPlaylistCoverImage("playlist")).toEqual(images);
        request("GET", "playlists/playlist/images");
    });

    function coverRequest() {
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.spotify.com/v1/playlists/playlist/images");
        expect(init?.method).toBe("PUT");
        expect(new Headers(init?.headers).get("Content-Type")).toBe("image/jpeg");
        expect(init?.body).toBe("anBlZw==");
    }

    it("uploads raw base64 in a browser without Buffer", async () => {
        respond(undefined, 204);
        vi.stubGlobal("Buffer", undefined);
        await sdk.playlists.addCustomPlaylistCoverImage("playlist", "anBlZw==");
        coverRequest();
    });

    it("uploads a Buffer in Node without DOM constructors", async () => {
        respond(undefined, 204);
        vi.stubGlobal("HTMLCanvasElement", undefined);
        vi.stubGlobal("HTMLImageElement", undefined);
        await sdk.playlists.addCustomPlaylistCoverImage("playlist", Buffer.from("jpeg"));
        coverRequest();
    });

    it("uploads raw base64 in Node without DOM constructors", async () => {
        respond(undefined, 204);
        vi.stubGlobal("HTMLCanvasElement", undefined);
        vi.stubGlobal("HTMLImageElement", undefined);
        await sdk.playlists.addCustomPlaylistCoverImage("playlist", "anBlZw==");
        coverRequest();
    });

    it("converts a browser canvas to JPEG without Buffer", async () => {
        respond(undefined, 204);
        vi.stubGlobal("Buffer", undefined);
        const canvas = document.createElement("canvas");
        const encode = vi.spyOn(canvas, "toDataURL").mockReturnValue("data:image/jpeg;base64,anBlZw==");
        await sdk.playlists.addCustomPlaylistCoverImage("playlist", canvas);
        expect(encode).toHaveBeenCalledWith("image/jpeg");
        coverRequest();
    });

    it("converts a browser image to JPEG without Buffer", async () => {
        respond(undefined, 204);
        vi.stubGlobal("Buffer", undefined);
        const image = document.createElement("img");
        image.width = 100;
        image.height = 80;
        const drawImage = vi.fn();
        const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
        const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,anBlZw==");
        try {
            await sdk.playlists.addCustomPlaylistCoverImage("playlist", image);
            expect(drawImage).toHaveBeenCalledWith(image, 0, 0);
            coverRequest();
        } finally {
            context.mockRestore();
            encode.mockRestore();
        }
    });

    it("uploads a base64 string directly without JSON encoding", async () => {
        respond(undefined, 204);
        await sdk.playlists.addCustomPlaylistCoverImageFromBase64String("playlist", "anBlZw==");
        coverRequest();
    });

    it("rejects unsupported cover inputs before sending a request", async () => {
        await expect(sdk.playlists.addCustomPlaylistCoverImage("playlist", {} as HTMLImageElement))
            .rejects.toThrow("ImageData must be");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("propagates Spotify access errors", async () => {
        respond({ error: { status: 403 } }, 403);
        await expect(sdk.playlists.getPlaylistItems("playlist")).rejects.toThrow("Forbidden (403): access denied");
    });
});

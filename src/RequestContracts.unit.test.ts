import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { SpotifyApi, DefaultResponseDeserializer, emptyAccessToken } from "./index.js";
import type { Album, Artist, Audiobook, Chapter, Episode, Show, Track, AudioFeatures, IResponseDeserializer, Page, SavedTrack, SearchResults, SnapshotReference, Playlist, UserProfile } from "./index.js";
import FakeAuthStrategy from "./test/FakeAuthStrategy.js";

const collections = [
    { name: "albums", key: "albums", call: (sdk: SpotifyApi) => sdk.albums.get(["one"]) },
    { name: "artists", key: "artists", call: (sdk: SpotifyApi) => sdk.artists.get(["one"]) },
    { name: "audiobooks", key: "audiobooks", call: (sdk: SpotifyApi) => sdk.audiobooks.get(["one"]) },
    { name: "chapters", key: "chapters", call: (sdk: SpotifyApi) => sdk.chapters.get(["one"], "US") },
    { name: "episodes", key: "episodes", call: (sdk: SpotifyApi) => sdk.episodes.get(["one"], "US") },
    { name: "shows", key: "shows", call: (sdk: SpotifyApi) => sdk.shows.get(["one"], "US") },
    { name: "tracks", key: "tracks", call: (sdk: SpotifyApi) => sdk.tracks.get(["one"]) },
    { name: "audio features", key: "audio_features", call: (sdk: SpotifyApi) => sdk.tracks.audioFeatures(["one"]) },
];

afterEach(() => vi.restoreAllMocks());

describe("Nullable request contracts", () => {
    describe.each(collections)("$name collection", ({ call, key }) => {
        it.each(["204", "empty", "json null", "no token", "handled error", "custom null"])("returns null for %s", async (scenario) => {
            const auth = new FakeAuthStrategy();
            if (scenario === "no token") {
                vi.spyOn(auth, "getOrCreateAccessToken").mockResolvedValue(emptyAccessToken);
                vi.spyOn(console, "warn").mockImplementation(() => {});
            }
            const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response(
                scenario === "json null" ? "null" : null, { status: scenario === "204" ? 204 : scenario === "handled error" ? 403 : 200 }));
            const deserializer: IResponseDeserializer = { async deserialize<T>(): Promise<T | null> { return null; } };
            const sdk = new SpotifyApi(auth, {
                fetch: fetchMock,
                ...(scenario === "handled error" ? { errorHandler: { async handleErrors() { return true; } } } : {}),
                ...(scenario === "custom null" ? { deserializer } : {}),
            });
            expect(await call(sdk)).toBeNull();
            expect(fetchMock).toHaveBeenCalledTimes(scenario === "no token" ? 0 : 1);
        });

        it("preserves empty and populated arrays", async () => {
            for (const items of [[], [{ id: "one" }]]) {
                const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: async () => new Response(JSON.stringify({ [key]: items })) });
                expect(await call(sdk)).toEqual(items);
            }
        });

        it.each([401, 403, 404, 429, 500])("rejects HTTP %i by default", async (status) => {
            const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: async () => new Response("{}", { status }) });
            await expect(call(sdk)).rejects.toThrow();
        });

        it("rejects malformed JSON by default", async () => {
            const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: async () => new Response("not json") });
            await expect(call(sdk)).rejects.toBeInstanceOf(SyntaxError);
        });
    });

    it("routes asynchronous deserializer errors through the configured handler", async () => {
        const error = new Error("custom deserializer failed");
        const handleErrors = vi.fn().mockResolvedValue(true);
        const sdk = new SpotifyApi(new FakeAuthStrategy(), {
            fetch: async () => new Response("{}"), errorHandler: { handleErrors },
            deserializer: { async deserialize() { throw error; } },
        });
        expect(await sdk.albums.get("one")).toBeNull();
        expect(handleErrors).toHaveBeenCalledWith(error);
        handleErrors.mockResolvedValue(false);
        await expect(sdk.albums.get("one")).rejects.toBe(error);
    });

    it("only suppresses malformed JSON when the error handler opts in", async () => {
        const handleErrors = vi.fn().mockResolvedValue(true);
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: async () => new Response("not json"), errorHandler: { handleErrors } });
        expect(await sdk.search("one", ["track"])).toBeNull();
        expect(handleErrors).toHaveBeenCalledWith(expect.any(SyntaxError));
    });

    it("validates 204 responses without calling the deserializer", async () => {
        const response = new Response(null, { status: 204 });
        const validateResponse = vi.fn().mockResolvedValue(undefined);
        const deserialize = vi.fn();
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: async () => response, responseValidator: { validateResponse }, deserializer: { deserialize } });
        expect(await sdk.makeRequest<Album>("GET", "albums/one")).toBeNull();
        expect(validateResponse).toHaveBeenCalledWith(response);
        expect(deserialize).not.toHaveBeenCalled();
        validateResponse.mockRejectedValue(new Error("validation failed"));
        await expect(sdk.makeRequest<Album>("GET", "albums/one")).rejects.toThrow("validation failed");
    });

    it.each(["204", "text", "no token", "handled error"])("none mode resolves undefined for %s", async (scenario) => {
        const auth = new FakeAuthStrategy();
        if (scenario === "no token") {
            vi.spyOn(auth, "getOrCreateAccessToken").mockResolvedValue(emptyAccessToken);
            vi.spyOn(console, "warn").mockImplementation(() => {});
        }
        const deserialize = vi.fn();
        const sdk = new SpotifyApi(auth, {
            fetch: async () => new Response(scenario === "204" ? null : "text", { status: scenario === "204" ? 204 : scenario === "handled error" ? 500 : 200 }),
            deserializer: { deserialize }, errorHandler: { async handleErrors() { return scenario === "handled error"; } },
        });
        const result = sdk.makeRequest("PUT", "me/player/pause", undefined, undefined, "none");
        expectTypeOf(result).toEqualTypeOf<Promise<void>>();
        expect(await result).toBeUndefined();
        expect(deserialize).not.toHaveBeenCalled();
    });

    it("exposes nullable single, bulk, generic, read and write contracts", async () => {
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: async () => new Response(null, { status: 204 }) });
        expectTypeOf(sdk.makeRequest<Album>("GET", "albums/one")).toEqualTypeOf<Promise<Album | null>>();
        expectTypeOf(sdk.albums.get("one")).toEqualTypeOf<Promise<Album | null>>();
        expectTypeOf(sdk.albums.get(["one"])).toEqualTypeOf<Promise<Album[] | null>>();
        expectTypeOf(sdk.artists.get("one")).toEqualTypeOf<Promise<Artist | null>>();
        expectTypeOf(sdk.artists.get(["one"])).toEqualTypeOf<Promise<Artist[] | null>>();
        expectTypeOf(sdk.audiobooks.get("one")).toEqualTypeOf<Promise<Audiobook | null>>();
        expectTypeOf(sdk.audiobooks.get(["one"])).toEqualTypeOf<Promise<Audiobook[] | null>>();
        expectTypeOf(sdk.chapters.get("one", "US")).toEqualTypeOf<Promise<Chapter | null>>();
        expectTypeOf(sdk.chapters.get(["one"], "US")).toEqualTypeOf<Promise<Chapter[] | null>>();
        expectTypeOf(sdk.episodes.get("one", "US")).toEqualTypeOf<Promise<Episode | null>>();
        expectTypeOf(sdk.episodes.get(["one"], "US")).toEqualTypeOf<Promise<Episode[] | null>>();
        expectTypeOf(sdk.shows.get("one", "US")).toEqualTypeOf<Promise<Show | null>>();
        expectTypeOf(sdk.shows.get(["one"], "US")).toEqualTypeOf<Promise<Show[] | null>>();
        expectTypeOf(sdk.tracks.get("one")).toEqualTypeOf<Promise<Track | null>>();
        expectTypeOf(sdk.tracks.get(["one"])).toEqualTypeOf<Promise<Track[] | null>>();
        expectTypeOf(sdk.tracks.audioFeatures("one")).toEqualTypeOf<Promise<AudioFeatures | null>>();
        expectTypeOf(sdk.tracks.audioFeatures(["one"])).toEqualTypeOf<Promise<AudioFeatures[] | null>>();
        expectTypeOf(sdk.search("one", ["album", "track"])).toEqualTypeOf<Promise<SearchResults<readonly ["album", "track"]> | null>>();
        expectTypeOf(sdk.currentUser.profile()).toEqualTypeOf<Promise<UserProfile | null>>();
        expectTypeOf(sdk.currentUser.tracks.savedTracks()).toEqualTypeOf<Promise<Page<SavedTrack> | null>>();
        expectTypeOf(sdk.currentUser.playlists.isFollowing("one")).toEqualTypeOf<Promise<boolean[] | null>>();
        expectTypeOf(sdk.currentUser.playlists.isFollowing("one", ["user"])).toEqualTypeOf<Promise<boolean[] | null>>();
        expectTypeOf(sdk.playlists.createPlaylist({ name: "one" })).toEqualTypeOf<Promise<Playlist | null>>();
        expectTypeOf(sdk.playlists.createPlaylist("user", { name: "one" })).toEqualTypeOf<Promise<Playlist | null>>();
        expectTypeOf(sdk.playlists.addItemsToPlaylist("one", [])).toEqualTypeOf<Promise<SnapshotReference | null>>();
        expectTypeOf(sdk.playlists.updatePlaylistItems("one", {})).toEqualTypeOf<Promise<SnapshotReference | null>>();
        expectTypeOf(sdk.playlists.removeItemsFromPlaylist("one", { items: [] })).toEqualTypeOf<Promise<SnapshotReference | null>>();
        expectTypeOf(sdk.currentUser.shows.saveShows(["one"])).toEqualTypeOf<Promise<void>>();
        expectTypeOf(sdk.currentUser.shows.removeSavedShows(["one"])).toEqualTypeOf<Promise<void>>();
        expect(await sdk.playlists.addItemsToPlaylist("one", [])).toBeNull();
        expect(await sdk.playlists.updatePlaylistItems("one", {})).toBeNull();
        expect(await sdk.playlists.removeItemsFromPlaylist("one", { items: [] })).toBeNull();
        expect(await sdk.currentUser.shows.saveShows(["one"])).toBeUndefined();
    });
});

describe("Default deserializer", () => {
    it.each(["", "null"])("returns null for %j", async (body) => {
        const result = new DefaultResponseDeserializer().deserialize<Album>(new Response(body));
        expectTypeOf(result).toEqualTypeOf<Promise<Album | null>>();
        expect(await result).toBeNull();
    });
    it.each([" ", "not json", "{", "command-id"])("rejects nonempty malformed JSON %j", async (body) => {
        await expect(new DefaultResponseDeserializer().deserialize(new Response(body))).rejects.toBeInstanceOf(SyntaxError);
    });
    it("preserves valid data and falsy JSON values", async () => {
        for (const value of [{ id: "one" }, [], false, 0, ""]) {
            expect(await new DefaultResponseDeserializer().deserialize(new Response(JSON.stringify(value)))).toEqual(value);
        }
    });
});

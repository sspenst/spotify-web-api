import { describe, expect, it, vi } from "vitest";
import { SpotifyApi } from "../SpotifyApi.js";
import FakeAuthStrategy from "../test/FakeAuthStrategy.js";

// Legacy methods stay usable for apps with access. No runtime fallback or
// swallowed 403/404 is allowed, even though the live tests require opt-in.
const cases = [
    { name: "related artists", path: "artists/artist/related-artists", body: { artists: [{ id: "related" }] },
        call: (sdk: SpotifyApi) => sdk.artists.relatedArtists("artist"), expected: { artists: [{ id: "related" }] } },
    { name: "featured playlists", path: "browse/featured-playlists?country=GB&locale=en_GB&timestamp=2024-01-01T00%3A00%3A00&limit=2&offset=0",
        body: { playlists: { items: [{ id: "playlist" }] } },
        call: (sdk: SpotifyApi) => sdk.browse.getFeaturedPlaylists("GB", "en_GB", "2024-01-01T00:00:00", 2, 0),
        expected: { playlists: { items: [{ id: "playlist" }] } } },
    { name: "category playlists", path: "browse/categories/category/playlists?country=GB&limit=2&offset=0",
        body: { playlists: { items: [{ id: "playlist" }] } },
        call: (sdk: SpotifyApi) => sdk.browse.getPlaylistsForCategory("category", "GB", 2, 0),
        expected: { playlists: { items: [{ id: "playlist" }] } } },
    { name: "genre seeds", path: "recommendations/available-genre-seeds", body: { genres: ["rock"] },
        call: (sdk: SpotifyApi) => sdk.recommendations.genreSeeds(), expected: { genres: ["rock"] } },
    { name: "recommendations", path: "recommendations?seed_artists=one%2Ctwo&seed_genres=rock&seed_tracks=track&limit=2&market=GB&min_energy=0",
        body: { seeds: [], tracks: [{ id: "track" }] },
        call: (sdk: SpotifyApi) => sdk.recommendations.get({ seed_artists: ["one", "two"], seed_genres: ["rock"], seed_tracks: ["track"], limit: 2, market: "GB", min_energy: 0 }),
        expected: { seeds: [], tracks: [{ id: "track" }] } },
    { name: "single audio features", path: "audio-features/track", body: { id: "track", tempo: 120 },
        call: (sdk: SpotifyApi) => sdk.tracks.audioFeatures("track"), expected: { id: "track", tempo: 120 } },
    { name: "multiple audio features", path: "audio-features?ids=one%2Ctwo", body: { audio_features: [{ id: "one" }, { id: "two" }] },
        call: (sdk: SpotifyApi) => sdk.tracks.audioFeatures(["one", "two"]), expected: [{ id: "one" }, { id: "two" }] },
    { name: "audio analysis", path: "audio-analysis/track", body: { track: { tempo: 120 }, bars: [] },
        call: (sdk: SpotifyApi) => sdk.tracks.audioAnalysis("track"), expected: { track: { tempo: 120 }, bars: [] } },
];

describe("Restricted endpoint contracts", () => {
    it.each(cases)("$name preserves the request and response", async ({ call, path, body, expected }) => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
        expect(await call(sdk)).toEqual(expected);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`https://api.spotify.com/v1/${path}`);
        expect(init?.method).toBe("GET");
        expect(init?.body).toBeUndefined();
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer fake-auth-token");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    describe.each([401, 403, 404, 429, 500])("HTTP %i", (status) => {
        it.each(cases)("$name propagates failure", async ({ call }) => {
            const body = { error: { status, message: "endpoint denied" } };
            const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
            const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
            const message = status === 401 ? "Bad or expired token"
                : status === 403 ? "Forbidden (403): access denied"
                : status === 429 ? "The app has exceeded its rate limits."
                : `Unrecognised response code: ${status}`;
            await expect(call(sdk)).rejects.toThrow(message);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });
});

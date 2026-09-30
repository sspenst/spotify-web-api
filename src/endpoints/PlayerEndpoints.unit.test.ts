import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { SpotifyApi } from "../SpotifyApi.js";
import FakeAuthStrategy from "../test/FakeAuthStrategy.js";
import type { Context, PlaybackState, PlayHistory, TrackItem } from "../types.js";

const commands = [
    { name: "transfer", method: "PUT", path: "me/player", body: { device_ids: ["device"], play: false },
        call: (sdk: SpotifyApi) => sdk.player.transferPlayback(["device"], false) },
    { name: "start", method: "PUT", path: "me/player/play?device_id=device", body: { uris: ["spotify:track:one"], position_ms: 7000 },
        call: (sdk: SpotifyApi) => sdk.player.startResumePlayback("device", undefined, ["spotify:track:one"], undefined, 7000) },
    { name: "pause", method: "PUT", path: "me/player/pause?device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.pausePlayback("device") },
    { name: "next", method: "POST", path: "me/player/next?device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.skipToNext("device") },
    { name: "previous", method: "POST", path: "me/player/previous?device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.skipToPrevious("device") },
    { name: "seek", method: "PUT", path: "me/player/seek?position_ms=0&device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.seekToPosition(0, "device") },
    { name: "repeat", method: "PUT", path: "me/player/repeat?state=off&device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.setRepeatMode("off", "device") },
    { name: "volume", method: "PUT", path: "me/player/volume?volume_percent=0&device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.setPlaybackVolume(0, "device") },
    { name: "shuffle", method: "PUT", path: "me/player/shuffle?state=false&device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.togglePlaybackShuffle(false, "device") },
    { name: "queue", method: "POST", path: "me/player/queue?uri=spotify%3Atrack%3Aone&device_id=device",
        call: (sdk: SpotifyApi) => sdk.player.addItemToPlaybackQueue("spotify:track:one", "device") },
];

describe("Player API contracts", () => {
    describe.each([
        { name: "text", status: 200, body: "Spotify-command-id" },
        { name: "empty", status: 200, body: "" },
        { name: "no content", status: 204, body: null },
    ])("successful $name response", ({ status, body }) => {
        it.each(commands)("$name preserves its request and resolves without parsing", async ({ call, method, path, ...command }) => {
            const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));
            const deserialize = vi.fn().mockRejectedValue(new Error("Must not deserialize commands"));
            const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock, deserializer: { deserialize } });
            expect(await call(sdk)).toBeUndefined();
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe(`https://api.spotify.com/v1/${path}`);
            expect(init?.method).toBe(method);
            expect(init?.body).toBe("body" in command ? JSON.stringify(command.body) : undefined);
            expect(deserialize).not.toHaveBeenCalled();
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    it.each([0, 7000, undefined])("sends position %s using Spotify's field name", async (position) => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
        await sdk.player.startResumePlayback("device", "spotify:album:one", undefined, { position: 2 }, position);
        expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
            context_uri: "spotify:album:one", offset: { position: 2 },
            ...(position === undefined ? {} : { position_ms: position }),
        });
    });

    describe.each([401, 403, 429, 500])("HTTP %i", (status) => {
        it.each(commands)("$name rejects failed commands", async ({ call }) => {
            const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { status } }), { status }));
            const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
            await expect(call(sdk)).rejects.toThrow();
        });
    });

    it("still runs response validation and request hooks for successful commands", async () => {
        const response = new Response("command-id", { status: 200 });
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
        const beforeRequest = vi.fn();
        const afterRequest = vi.fn();
        const validateResponse = vi.fn().mockRejectedValue(new Error("Custom validation failed"));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), {
            fetch: fetchMock, beforeRequest, afterRequest, responseValidator: { validateResponse },
        });
        await expect(sdk.player.pausePlayback("device")).rejects.toThrow("Custom validation failed");
        expect(beforeRequest).toHaveBeenCalledTimes(1);
        expect(afterRequest).toHaveBeenCalledWith(fetchMock.mock.calls[0][0], fetchMock.mock.calls[0][1], response);
        expect(validateResponse).toHaveBeenCalledWith(response);
    });

    it.each(["getPlaybackState", "getCurrentlyPlayingTrack"] as const)("%s returns null for no playback", async (method) => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
        const result = await sdk.player[method]();
        expect(result).toBeNull();
        expectTypeOf(result).toEqualTypeOf<PlaybackState | null>();
    });

    it("preserves nullable playback fields", async () => {
        const playback = { item: null, progress_ms: null, context: null };
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(playback), { status: 200 }));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
        expect(await sdk.player.getPlaybackState()).toEqual(playback);
        expectTypeOf<PlaybackState["item"]>().toEqualTypeOf<TrackItem | null>();
        expectTypeOf<PlaybackState["progress_ms"]>().toEqualTypeOf<number | null>();
        expectTypeOf<PlayHistory["context"]>().toEqualTypeOf<Context | null>();
    });

    it("still rejects malformed JSON from playback reads", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("invalid-json", { status: 200 }));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
        await expect(sdk.player.getPlaybackState()).rejects.toBeInstanceOf(SyntaxError);
    });

    it("still parses playlist mutation responses", async () => {
        const snapshot = { snapshot_id: "version" };
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));
        const sdk = new SpotifyApi(new FakeAuthStrategy(), { fetch: fetchMock });
        expect(await sdk.playlists.addItemsToPlaylist("playlist", ["spotify:track:one"])).toEqual(snapshot);
    });
});

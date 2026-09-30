import { describe, expect, expectTypeOf, it } from "vitest";
import { SpotifyApi } from "./index.js";
import type { AlbumBase, Album, SimplifiedAlbum, Track, SimplifiedTrack, Artist, SimplifiedArtist, Audiobook, SimplifiedAudiobook, Chapter, SimplifiedChapter, Episode, SimplifiedEpisode, Show, SimplifiedShow, Playlist, SimplifiedPlaylist, User, UserReference, AddedBy, LinkedFrom, AudioFeatures, UserProfile, Device, Context, Copyright, ExternalIds } from "./index.js";
import FakeAuthStrategy from "./test/FakeAuthStrategy.js";

describe("Response resource types", () => {
    it("exports fixed resource discriminants through the package entry point", () => {
        expectTypeOf<AlbumBase["type"]>().toEqualTypeOf<"album">();
        expectTypeOf<Album["type"]>().toEqualTypeOf<"album">();
        expectTypeOf<SimplifiedAlbum["type"]>().toEqualTypeOf<"album">();
        expectTypeOf<Track["type"]>().toEqualTypeOf<"track">();
        expectTypeOf<SimplifiedTrack["type"]>().toEqualTypeOf<"track">();
        expectTypeOf<Artist["type"]>().toEqualTypeOf<"artist">();
        expectTypeOf<SimplifiedArtist["type"]>().toEqualTypeOf<"artist">();
        expectTypeOf<Audiobook["type"]>().toEqualTypeOf<"audiobook">();
        expectTypeOf<SimplifiedAudiobook["type"]>().toEqualTypeOf<"audiobook">();
        expectTypeOf<Chapter["type"]>().toEqualTypeOf<"chapter">();
        expectTypeOf<SimplifiedChapter["type"]>().toEqualTypeOf<"chapter">();
        expectTypeOf<Episode["type"]>().toEqualTypeOf<"episode">();
        expectTypeOf<SimplifiedEpisode["type"]>().toEqualTypeOf<"episode">();
        expectTypeOf<Show["type"]>().toEqualTypeOf<"show">();
        expectTypeOf<SimplifiedShow["type"]>().toEqualTypeOf<"show">();
        expectTypeOf<Playlist["type"]>().toEqualTypeOf<"playlist">();
        expectTypeOf<SimplifiedPlaylist["type"]>().toEqualTypeOf<"playlist">();
        expectTypeOf<User["type"]>().toEqualTypeOf<"user">();
        expectTypeOf<UserReference["type"]>().toEqualTypeOf<"user">();
        expectTypeOf<AddedBy["type"]>().toEqualTypeOf<"user">();
        expectTypeOf<LinkedFrom["type"]>().toEqualTypeOf<"track">();
        expectTypeOf<AudioFeatures["type"]>().toEqualTypeOf<"audio_features">();
        // These fields describe different things and must not inherit the resource literal.
        expectTypeOf<AlbumBase["album_type"]>().toEqualTypeOf<string>();
        expectTypeOf<SimplifiedAudiobook["media_type"]>().toEqualTypeOf<string>();
        expectTypeOf<SimplifiedShow["media_type"]>().toEqualTypeOf<string>();
        expectTypeOf<Device["type"]>().toEqualTypeOf<string>();
        expectTypeOf<Context["type"]>().toEqualTypeOf<string>();
        expectTypeOf<Copyright["type"]>().toEqualTypeOf<string>();
    });

    it("accepts omission of all fields removed in February 2026 Development mode", () => {
        const album = {} satisfies Pick<AlbumBase, "available_markets" | "label" | "popularity">;
        const simplifiedAlbum = {} satisfies Pick<SimplifiedAlbum, "album_group">;
        const track = {} satisfies Pick<Track, "available_markets" | "linked_from" | "popularity">;
        const artist = {} satisfies Pick<Artist, "followers" | "popularity">;
        const audiobook = {} satisfies Pick<SimplifiedAudiobook, "available_markets" | "publisher">;
        const chapter = {} satisfies Pick<SimplifiedChapter, "available_markets">;
        const show = {} satisfies Pick<SimplifiedShow, "available_markets" | "publisher">;
        const user = {} satisfies Pick<UserProfile, "email" | "followers" | "country" | "explicit_content" | "product">;
        expect([album, simplifiedAlbum, track, artist, audiobook, chapter, show, user]).toEqual(Array(8).fill({}));
        expectTypeOf<AlbumBase["available_markets"]>().toEqualTypeOf<string[] | undefined>();
        expectTypeOf<SimplifiedTrack["available_markets"]>().toEqualTypeOf<string[] | undefined>();
        // March restored external_ids; retain the existing data contract.
        expectTypeOf<AlbumBase["external_ids"]>().toEqualTypeOf<ExternalIds>();
        expectTypeOf<Track["external_ids"]>().toEqualTypeOf<ExternalIds>();
    });

    it("narrows track and episode unions without casts", () => {
        function title(item: Track | Episode): string {
            if (item.type === "track") return item.album.name;
            return item.show.name;
        }
        expectTypeOf(title).returns.toEqualTypeOf<string>();
    });

    it("passes through album and track responses with missing markets", async () => {
        const album = { id: "album", type: "album", name: "Album", tracks: { items: [] } };
        const track = { id: "track", type: "track", name: "Track", album };
        const sdk = new SpotifyApi(new FakeAuthStrategy(), {
            fetch: async (url) => new Response(JSON.stringify(String(url).includes("/tracks/") ? track : album)),
        });
        expect(await sdk.albums.get("album")).toEqual(album);
        expect(await sdk.tracks.get("track")).toEqual(track);
    });
});

// Compile-time regression checks: consumers must handle absence and use valid discriminants.
function checkConsumerContracts(album: Album | null, item: Track | Episode) {
    // @ts-expect-error A request can return null.
    album.name;
    // @ts-expect-error Markets may be absent even when an album exists.
    album?.available_markets.length;
    // @ts-expect-error Resource discriminants reject unrelated literals.
    const wrong: AlbumBase["type"] = "track";
    if (item.type === "episode") {
        // @ts-expect-error An episode has a show, not an album.
        item.album;
    }
    return wrong;
}

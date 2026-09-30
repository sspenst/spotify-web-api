import { beforeAll, describe, expect, it } from "vitest";
import { buildIntegrationTestUserSdkInstance } from "../test/SpotifyApiBuilder";
import { SpotifyApi } from "../SpotifyApi";
import { FetchApiSpy } from "../test/FetchApiSpy";
import { validUser } from "../test/data/validUser";

describe("Integration: Playlists Endpoints", () => {
    let sut: SpotifyApi;
    let fetchSpy: FetchApiSpy;
    let playlistId: string;

    beforeAll(async () => {
        [sut, fetchSpy] = buildIntegrationTestUserSdkInstance();
        const me = await sut.currentUser.profile();
        const playlists = await sut.currentUser.playlists.playlists(50);
        const ownedPlaylist = playlists.items.find(playlist => playlist.owner.id === me.id);
        if (!ownedPlaylist) {
            throw new Error("Playlist integration tests require a playlist owned by the authenticated user among the first 50 playlists.");
        }
        playlistId = ownedPlaylist.id;
    });

    it("getPlaylist can return information", async () => {
        const result = await sut.playlists.getPlaylist(playlistId);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/playlists/${playlistId}`);
        expect(result.items).toBeDefined();
    });

    it("getPlaylist can return information with additional_types", async () => {
        const result = await sut.playlists.getPlaylist(playlistId, undefined, undefined, ['episode']);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/playlists/${playlistId}?additional_types=episode`);
        expect(result.items).toBeDefined();
    });

    it("getPlaylistItems can return information", async () => {
        const result = await sut.playlists.getPlaylistItems(playlistId);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/playlists/${playlistId}/items`);
        expect(Array.isArray(result.items)).toBe(true);
    });

    it("getPlaylistItems can return information with additional_types", async () => {
        const result = await sut.playlists.getPlaylistItems(playlistId, undefined, undefined, 1, 0, ['episode']);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/playlists/${playlistId}/items?limit=1&offset=0&additional_types=episode`);
        expect(Array.isArray(result.items)).toBe(true);
    });

    it("getUsersPlaylists can return information", async () => {
        const valid = validUser();
        const result = await sut.playlists.getUsersPlaylists(valid.id);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/users/${valid.id}/playlists`);
        expect(Array.isArray(result.items)).toBe(true);
    });
    
    it("getPlaylistCoverImage returns image info", async () => {
        const result = await sut.playlists.getPlaylistCoverImage(playlistId);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/playlists/${playlistId}/images`);
        expect(Array.isArray(result)).toBe(true);
    });
});

import { restrictedEndpointTest } from "../test/SpotifyApiBuilder.js";
import fs from "fs";
import { assert, afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildIntegrationTestUserSdkInstance } from "../test/SpotifyApiBuilder";
import { SpotifyApi } from "../SpotifyApi";
import { FetchApiSpy } from "../test/FetchApiSpy";
import { validArtist } from "../test/data/validArtist";
import { validAlbumResult } from "../test/data/validAlbumResult";
import { validAudioBook } from "../test/data/validAudioBook";
import { validShow } from "../test/data/validShow";
import { validEpisode } from "../test/data/validEpisode";
import { validTrack } from "../test/data/validTrack";

describe("Integration: Users Endpoints (logged in user)", { timeout: 20000 }, () => {
    let sut: SpotifyApi;
    let fetchSpy: FetchApiSpy;

    let artistId: string;
    let wasArtistFollowed: boolean;

    let albumId: string;
    let wasAlbumSaved: boolean;

    let audioBookId: string;
    let wasAudioBookSaved: boolean;

    let episodeId: string;
    let wasEpisodeSaved: boolean;

    let showId: string;
    let wasShowSaved: boolean;

    let trackId: string;
    let wasTrackSaved: boolean;

    beforeAll(async () => {
        [sut, fetchSpy] = buildIntegrationTestUserSdkInstance();

        artistId = validArtist().id;
        const wasArtistFollowedResponse = await sut.currentUser.followsArtistsOrUsers([artistId], "artist");
        assert(wasArtistFollowedResponse !== null);
        wasArtistFollowed = wasArtistFollowedResponse[0];
        if (!wasArtistFollowed) {
            await sut.currentUser.followArtistsOrUsers([artistId], "artist");
        }

        albumId = validAlbumResult().id;
        const wasAlbumSavedResponse = await sut.currentUser.albums.hasSavedAlbums([albumId]);
        assert(wasAlbumSavedResponse !== null);
        wasAlbumSaved = wasAlbumSavedResponse[0];
        if (!wasAlbumSaved) {
            await sut.currentUser.albums.saveAlbums([albumId]);
        }

        audioBookId = validAudioBook().id;
        const wasAudioBookSavedResponse = await sut.currentUser.audiobooks.hasSavedAudiobooks([audioBookId]);
        assert(wasAudioBookSavedResponse !== null);
        wasAudioBookSaved = wasAudioBookSavedResponse[0];
        if (!wasAudioBookSaved) {
            await sut.currentUser.audiobooks.saveAudiobooks([audioBookId]);
        }

        episodeId = validEpisode().id;
        const wasEpisodeSavedResponse = await sut.currentUser.episodes.hasSavedEpisodes([episodeId]);
        assert(wasEpisodeSavedResponse !== null);
        wasEpisodeSaved = wasEpisodeSavedResponse[0];
        if (!wasEpisodeSaved) {
            await sut.currentUser.episodes.saveEpisodes([episodeId]);
        }

        showId = validShow().id;
        const wasShowSavedResponse = await sut.currentUser.shows.hasSavedShow([showId]);
        assert(wasShowSavedResponse !== null);
        wasShowSaved = wasShowSavedResponse[0];
        if (!wasShowSaved) {
            await sut.currentUser.shows.saveShows([showId]);
        }

        trackId = validTrack().id;
        const wasTrackSavedResponse = await sut.currentUser.tracks.hasSavedTracks([trackId]);
        assert(wasTrackSavedResponse !== null);
        wasTrackSaved = wasTrackSavedResponse[0];
        if (!wasTrackSaved) {
            await sut.currentUser.tracks.saveTracks([trackId]);
        }
    });

    afterAll(async () => {
        if (wasArtistFollowed) {
            await sut.currentUser.followArtistsOrUsers([artistId], "artist");
        } else {
            await sut.currentUser.unfollowArtistsOrUsers([artistId], "artist");
        }

        if (wasAlbumSaved) {
            await sut.currentUser.albums.saveAlbums([albumId]);
        } else {
            await sut.currentUser.albums.removeSavedAlbums([albumId]);
        }

        if (wasAudioBookSaved) {
            await sut.currentUser.audiobooks.saveAudiobooks([audioBookId]);
        } else {
            await sut.currentUser.audiobooks.removeSavedAudiobooks([audioBookId]);
        }

        if (wasEpisodeSaved) {
            await sut.currentUser.episodes.saveEpisodes([episodeId]);
        } else {
            await sut.currentUser.episodes.removeSavedEpisodes([episodeId]);
        }

        if (wasShowSaved) {
            await sut.currentUser.shows.saveShows([showId]);
        } else {
            await sut.currentUser.shows.removeSavedShows([showId]);
        }

        if (wasTrackSaved) {
            await sut.currentUser.tracks.saveTracks([trackId]);
        } else {
            await sut.currentUser.tracks.removeSavedTracks([trackId]);
        }
    });

    it("getCurrentUsersProfile returns a real user", async () => {
        const result = await sut.currentUser.profile();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me");
        expect(result.id.length).toBeGreaterThan(0);
    });

    it("getUsersTopItems returns items for tracks", async () => {
        const result = await sut.currentUser.topItems("tracks");
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/top/tracks");
        expect(result.limit).toBeGreaterThan(0);
    });

    it("getUsersTopItems returns items for artists", async () => {
        const result = await sut.currentUser.topItems("artists");
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/top/artists");
        expect(result.limit).toBeGreaterThan(0);
    });

    it("getUsersTopItems returns items for tracks and time_range", async () => {
        const result = await sut.currentUser.topItems("tracks", 'medium_term');
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/top/tracks?time_range=medium_term");
        expect(result.limit).toBeGreaterThan(0);
    });

    it("getUsersTopItems returns items for artists and time_range", async () => {
        const result = await sut.currentUser.topItems("artists", 'short_term');
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/top/artists?time_range=short_term");
        expect(result.limit).toBeGreaterThan(0);
    });

    it("getFollowedArtists returns artists", async () => {
        const result = await sut.currentUser.followedArtists();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/following?type=artist");
        expect(result.artists.items.length).toBeGreaterThan(0);
    });

    it("un/followArtistsOrUsersforCurrentUser can add and remove follows for artists", async () => {
        await sut.currentUser.followArtistsOrUsers([artistId], "artist");
        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/following?type=artist");

        const result = await sut.currentUser.followedArtists();
        assert(result !== null);
        expect(result.artists.items.find((a) => a.id === artistId)).toBeTruthy();

        await sut.currentUser.unfollowArtistsOrUsers([artistId], "artist");
        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/following?type=artist");

        const result2 = await sut.currentUser.followedArtists();
        assert(result2 !== null);
        expect(result2.artists.items.find((a) => a.id === artistId)).toBeFalsy();
    });

    it("checkUserFollowsArtistsOrUsers correctly identifies followed artist", async () => {
        await sut.currentUser.followArtistsOrUsers([artistId], "artist");

        const result = await sut.currentUser.followsArtistsOrUsers([artistId], "artist");
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/following/contains?ids=${artistId}&type=artist`);
        expect(result[0]).toBeTruthy();
    });

    // albums
    it("getUsersSavedAlbums returns items", async () => {
        const result = await sut.currentUser.albums.savedAlbums();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/albums");
        expect(result.items.length).toBeGreaterThan(0);
    });

    it("checkCurrentUsersSavedAlbums returns true for saved known album", async () => {
        const result = await sut.currentUser.albums.hasSavedAlbums([albumId]);
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/albums/contains?ids=${albumId}`);
        expect(result[0]).toBe(true);
    });

    it("can save and remove album for user", async () => {
        await sut.currentUser.albums.saveAlbums([albumId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/albums`);

        const result = await sut.currentUser.albums.savedAlbums();
        assert(result !== null);
        expect(result.items.find((a) => a.album.id === albumId)).toBeTruthy();

        await sut.currentUser.albums.removeSavedAlbums([albumId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/albums`);

        const result2 = await sut.currentUser.albums.savedAlbums();
        assert(result2 !== null);
        expect(result2.items.find((a) => a.album.id === albumId)).toBeFalsy();
    });

    // audiobooks
    it("getCurrentUsersSavedAudiobooks returns items", async () => {
        const result = await sut.currentUser.audiobooks.savedAudiobooks();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/audiobooks");
        expect(result.items.length).toBeGreaterThan(0);
    });

    it("checkCurrentUsersSavedAudiobooks returns true for saved book", async () => {
        const result = await sut.currentUser.audiobooks.hasSavedAudiobooks([audioBookId]);
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/audiobooks/contains?ids=${audioBookId}`);
        expect(result[0]).toBeTruthy();
    });

    it("can save and remove audiobook for user", async () => {
        await sut.currentUser.audiobooks.saveAudiobooks([audioBookId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/audiobooks?ids=${audioBookId}`);

        const result2 = await sut.currentUser.audiobooks.savedAudiobooks();
        assert(result2 !== null);
        expect(result2.items.find((a) => a.id === audioBookId)).toBeTruthy();

        await sut.currentUser.audiobooks.removeSavedAudiobooks([audioBookId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/audiobooks?ids=${audioBookId}`);

        const result3 = await sut.currentUser.audiobooks.savedAudiobooks();
        assert(result3 !== null);
        expect(result3.items.find((a) => a.id === audioBookId)).toBeFalsy();
    });

    // episodes
    it("savedEpisodes returns items", async () => {
        const result = await sut.currentUser.episodes.savedEpisodes();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/episodes");
        expect(result.items.length).toBeGreaterThan(0);
    });
    
    it("hasSavedEpisodes returns true for saved episode", async () => {
        const result = await sut.currentUser.episodes.hasSavedEpisodes([episodeId]);
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/episodes/contains?ids=${episodeId}`);
        expect(result[0]).toBeTruthy();
    });
    
    it("can save and remove episode for user", async () => {
        await sut.currentUser.episodes.saveEpisodes([episodeId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/episodes`);

        const result = await sut.currentUser.episodes.savedEpisodes();
        assert(result !== null);
        expect(result.items.find((e) => e.episode.id === episodeId)).toBeTruthy();

        await sut.currentUser.episodes.removeSavedEpisodes([episodeId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/episodes`);

        const result2 = await sut.currentUser.episodes.savedEpisodes();
        assert(result2 !== null);
        expect(result2.items.find((e) => e.episode.id === episodeId)).toBeFalsy();
    });

    // shows
    it("savedShows returns shows", async () => {
        const result = await sut.currentUser.shows.savedShows();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/shows");
        expect(result.items.length).toBeGreaterThan(0);
    });

    it("hasSavedShow returns true for saved show", async () => {
        const result = await sut.currentUser.shows.hasSavedShow([showId]);
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/shows/contains?ids=${showId}`);
        expect(result[0]).toBeTruthy();
    });

    it("hasSavedShow issues correct request for multiple saved shows", async () => {
        await sut.currentUser.shows.hasSavedShow([showId, showId]);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/shows/contains?ids=${showId}%2C${showId}`);
    });

    it("can save and remove show for user", async () => {
        await sut.currentUser.shows.removeSavedShows([showId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/shows?ids=${showId}`);

        const result = await sut.currentUser.shows.savedShows();
        assert(result !== null);
        expect(result.items.find((s) => s.show.id === showId)).toBeFalsy();

        await sut.currentUser.shows.saveShows([showId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/shows?ids=${showId}`);

        const result2 = await sut.currentUser.shows.savedShows();
        assert(result2 !== null);
        expect(result2.items.find((s) => s.show.id === showId)).toBeTruthy();
    });

    // tracks
    it("savedTracks returns items", async () => {
        const result = await sut.currentUser.tracks.savedTracks();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/tracks");
        expect(result.items.length).toBeGreaterThan(0);
    });

    it("hasSavedTracks returns true for saved track", async () => {
        const result = await sut.currentUser.tracks.hasSavedTracks([trackId]);
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`);
        expect(result[0]).toBeTruthy();
    });

    it("can save and remove track for user", async () => {
        await sut.currentUser.tracks.saveTracks([trackId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/tracks`);

        const result = await sut.currentUser.tracks.savedTracks();
        assert(result !== null);
        expect(result.items.find((t) => t.track.id === trackId)).toBeTruthy();

        await sut.currentUser.tracks.removeSavedTracks([trackId]);
        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/me/tracks`);

        const result2 = await sut.currentUser.tracks.savedTracks();
        assert(result2 !== null);
        expect(result2.items.find((t) => t.track.id === trackId)).toBeFalsy();
    });

    // playlists
    it("create and modify playlists for a user works", async () => {
        const result = await sut.currentUser.playlists.createPlaylist({
            name: "test playlist name!",
            description: "test playlist description!"
        });
        assert(result !== null);

        const file = fs.readFileSync("./src/test/data/valid-image.jpg", { encoding: "base64" });
        const otherTrackId = "0ZEigpVOtVunIcimL7dJuh";
        const otherTrackUri = `spotify:track:${otherTrackId}`;
        const valid = validAlbumResult();
        const validTrack = valid.tracks.items[0];

        await sut.playlists.addCustomPlaylistCoverImage(result.id, file);
        await sut.playlists.addItemsToPlaylist(result.id, [validTrack.uri, validTrack.uri, validTrack.uri, otherTrackUri]);

        const snapshotUpdated = await sut.playlists.movePlaylistItems(result.id, 3, 1, 0);
        assert(snapshotUpdated !== null); // Move last track to start

        let playlist = await sut.playlists.getPlaylist(result.id);
        assert(playlist !== null);
        expect(playlist.items!.items.length).toBe(4);
        expect(playlist.items!.items[0].item?.id).toBe(otherTrackId);
        expect(playlist.items!.items[1].item?.id).toBe(validTrack.id);

        await sut.playlists.removeItemsFromPlaylist(result.id, {
            snapshot_id: snapshotUpdated.snapshot_id,
            items: [{ uri: validTrack.uri }]
        });

        const playlistWithoutTracks = await sut.playlists.getPlaylist(result.id);
        assert(playlistWithoutTracks !== null);
        expect(playlistWithoutTracks.items!.items.length).toBe(1);

        await sut.playlists.changePlaylistDetails(result.id, {
            name: "test playlist name 2",
            description: "test playlist description 2"
        });

        const playlist2 = await sut.playlists.getPlaylist(result.id);
        assert(playlist2 !== null);
        expect(playlist2.name).toBe("test playlist name 2");

        await sut.currentUser.playlists.unfollow(result.id);
    });

    it("getCurrentUsersPlaylists returns playlists", async () => {
        const result = await sut.currentUser.playlists.playlists();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/me/playlists");
        expect(result.items.length).toBeGreaterThan(0);
    });

    restrictedEndpointTest("getFeaturedPlaylists returns playlists", async () => {
        const result = await sut.browse.getFeaturedPlaylists();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe("https://api.spotify.com/v1/browse/featured-playlists");
        expect(result.playlists.items.length).toBeGreaterThan(0);
    });

    restrictedEndpointTest("getCategorysPlaylists returns playlists", async () => {
        const category_id = "0JQ5DAqbMKFEC4WFtoNRpw";
        const result = await sut.browse.getPlaylistsForCategory(category_id);
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/browse/categories/${category_id}/playlists`);
        expect(result.playlists.items.length).toBeGreaterThan(0);
    });

});

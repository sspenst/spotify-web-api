import { restrictedEndpointTest } from "../test/SpotifyApiBuilder.js";
import { assert, beforeEach, describe, expect, it } from "vitest";
import { buildIntegrationTestSdkInstance } from "../test/SpotifyApiBuilder";
import { SpotifyApi } from "../SpotifyApi";
import { FetchApiSpy } from "../test/FetchApiSpy";

describe("Integration: Recommendations Endpoints", () => {
    let sut: SpotifyApi;
    let fetchSpy: FetchApiSpy;

    beforeEach(() => {
        [sut, fetchSpy] = buildIntegrationTestSdkInstance();
    });

    restrictedEndpointTest("getGenres can return information", async () => {
        const result = await sut.recommendations.genreSeeds();
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/recommendations/available-genre-seeds`);
        expect(result.genres.length).toBeGreaterThan(0);
        expect(result.genres).toContain("rock");
        for (const genre of result.genres) expect(genre).toEqual(expect.any(String));
    });

    restrictedEndpointTest("get can return recommendations", async () => {
        const result = await sut.recommendations.get({
            seed_artists: ["0oSGxfWSnnOXhD2fKuz2Gy"],
            seed_genres: ["rock"],
            seed_tracks: ["0c6xIDDpzE81m2q797ordA"]
        });
        assert(result !== null);

        expect(result.tracks.length).toBeGreaterThan(0);
    })
});

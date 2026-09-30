import { assert, beforeEach, describe, expect, it } from "vitest";
import { buildIntegrationTestSdkInstance } from "../test/SpotifyApiBuilder";
import { SpotifyApi } from "../SpotifyApi";
import { FetchApiSpy } from "../test/FetchApiSpy";
import { validEpisode } from "../test/data/validEpisode";

describe("Integration: Episodes Endpoints", () => {
    let sut: SpotifyApi;
    let fetchSpy: FetchApiSpy;

    beforeEach(() => {
        [sut, fetchSpy] = buildIntegrationTestSdkInstance();
    });

    it("getEpisode can return information", async () => {
        const valid = validEpisode();
        const result = await sut.episodes.get(valid.id, "GB");
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/episodes/${valid.id}?market=GB`);

        // Keep identity assertions; descriptions, previews, artwork and show counts
        // are mutable catalog data, not a fixed response snapshot.
        expect(result).toMatchObject({
            id: valid.id, uri: valid.uri, type: "episode", href: valid.href,
            release_date: valid.release_date, release_date_precision: valid.release_date_precision,
            show: { id: valid.show.id, uri: valid.show.uri, type: "show" }
        });
        expect(result.name).toEqual(expect.any(String));
        expect(result.name.length).toBeGreaterThan(0);
        expect(result.description).toEqual(expect.any(String));
        expect(result.html_description).toEqual(expect.any(String));
        expect(result.duration_ms).toBeGreaterThan(0);
        expect(result.explicit).toEqual(expect.any(Boolean));
        expect(result.is_playable).toEqual(expect.any(Boolean));
        expect(result.languages).toContain("en");
        expect(result.images.length).toBeGreaterThan(0);
        for (const image of result.images) expect(image.url).toMatch(/^https:\/\//);
        if (result.audio_preview_url !== null) {
            expect(result.audio_preview_url).toMatch(/^https:\/\//);
        }
        expect(Number.isInteger(result.show.total_episodes)).toBe(true);
        expect(result.show.total_episodes).toBeGreaterThan(0);
    });

    it("getEpisodes can return multiple items at once", async () => {
        const valid = validEpisode();
        const result = await sut.episodes.get([valid.id, valid.id], "GB");
        assert(result !== null);

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/episodes?ids=${valid.id}%2C${valid.id}&market=GB`);
        expect(result[0].id).toBe(valid.id);
        expect(result[1].id).toBe(valid.id);
    });
});

import { beforeEach, describe, expect, it } from "vitest";
import { buildIntegrationTestSdkInstance } from "../test/SpotifyApiBuilder";
import { SpotifyApi } from "../SpotifyApi";
import { FetchApiSpy } from "../test/FetchApiSpy";

describe("Integration: Markets Endpoints", () => {
    let sut: SpotifyApi;
    let fetchSpy: FetchApiSpy;

    beforeEach(() => {
        [sut, fetchSpy] = buildIntegrationTestSdkInstance();
    });

    it("getAvailableMarkets can return information", async () => {
        const result = await sut.markets.getAvailableMarkets();

        expect(fetchSpy.lastRequest().input).toBe(`https://api.spotify.com/v1/markets`);
        // Spotify adds markets; validate the contract instead of a historic list.
        expect(result.markets.length).toBeGreaterThan(0);
        expect(result.markets).toEqual(expect.arrayContaining(["GB", "US"]));
        expect(new Set(result.markets).size).toBe(result.markets.length);
        for (const market of result.markets) expect(market).toMatch(/^[A-Z]{2}$/);
    });
});
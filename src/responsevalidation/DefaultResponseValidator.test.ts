import { describe, expect, it } from "vitest";
import { DefaultResponseValidator, SpotifyError } from "../index.js";

describe("DefaultResponseValidator", () => {
    const validator = new DefaultResponseValidator();

    it.each([
        [401, "Unauthorized", "Bad or expired token"],
        [403, "Forbidden", "Forbidden (403): access denied"],
        [429, "Too Many Requests", "The app has exceeded its rate limits."],
        [500, "Internal Server Error", "Unrecognised response code: 500"],
    ])("exposes the response for status %s and preserves the message", async (status, statusText, message) => {
        const response = new Response("error body", {
            status,
            statusText,
            headers: { "Retry-After": "30" },
        });
        const error = await validator.validateResponse(response).catch(error => error);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(SpotifyError);
        expect(error.name).toBe("SpotifyError");
        expect(error.message).toContain(message);
        expect(error.status).toBe(status);
        expect(error.statusText).toBe(statusText);
        expect(error.response).toBe(response);
        expect(error.response.headers.get("Retry-After")).toBe("30");
        expect(await error.response.text()).toBe("error body");
    });

    it("accepts successful responses", async () => {
        await expect(validator.validateResponse(new Response("{}"))).resolves.toBeUndefined();
    });
});

/** An OAuth token refresh failure. invalid_grant requires signing in again. */
export default class TokenRefreshError extends Error {
    constructor(public readonly error: string | undefined, public readonly status: number, message: string) {
        super(message);
        this.name = "TokenRefreshError";
    }
}

import type { IValidateResponses } from "../types.js";
import SpotifyError from "../errorhandling/SpotifyError.js";

export default class DefaultResponseValidator implements IValidateResponses {
    public async validateResponse(response: Response): Promise<void> {

        switch (response.status) {
            case 401:
                throw new SpotifyError("Bad or expired token. This can happen if the user revoked a token or the access token has expired. You should re-authenticate the user.", response);
            case 403:
                const body = await response.clone().text();
                throw new SpotifyError(`Forbidden (403): access denied. Check app endpoint access, user permissions and scopes. Body: ${body}`, response);
            case 429:
                throw new SpotifyError("The app has exceeded its rate limits.", response);
            default:
                if (!response.status.toString().startsWith('20')) {
                    const body = await response.clone().text();
                    throw new SpotifyError(`Unrecognised response code: ${response.status} - ${response.statusText}. Body: ${body}`, response);
                }
        }

    }
}

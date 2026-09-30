export default class SpotifyError extends Error {
    public readonly status: number;
    public readonly statusText: string;

    constructor(message: string, public readonly response: Response) {
        super(message);
        this.name = "SpotifyError";
        this.status = response.status;
        this.statusText = response.statusText;
    }
}

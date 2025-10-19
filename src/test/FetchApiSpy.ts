export class FetchApiSpy {
    private issuedRequests: Array<{ input: RequestInfo | URL; init?: RequestInit; }> = [];

    public async fetch(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response> {
        this.issuedRequests.push({ input, init });
        return fetch(input, init);
    }

    public lastRequest() {
        return this.issuedRequests[this.issuedRequests.length - 1];
    }
}

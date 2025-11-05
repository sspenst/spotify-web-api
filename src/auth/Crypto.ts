export class Crypto {
    public static get current() {
        // Use globalThis.crypto which is available in:
        // - All modern browsers
        // - Node.js 19+ (this package requires Node 20+)
        // - Deno, Cloudflare Workers, and other modern runtimes
        if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined') {
            return globalThis.crypto;
        }
        
        throw new Error('Web Crypto API is not available in this environment');
    }
}

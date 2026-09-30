# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Project Overview

This repository is a maintained fork of [spotify/spotify-web-api-ts-sdk](https://github.com/spotify/spotify-web-api-ts-sdk), the official TypeScript SDK for the Spotify Web API. As noted in the [README](README.md), the upstream repository is no longer actively maintained. The maintainer fixes issues and addresses pull requests raised upstream here, in this fork.

The SDK provides a fully typed interface for interacting with Spotify's endpoints, supporting both browser (ESM) and Node.js (CommonJS) environments. It requires Node 18.0.0+ and uses the native `fetch` API.

## Common Commands

### Development
- `npm install` - Install dependencies
- `npm start` - Run the example app with Vite dev server (requires `.env` file in root with `VITE_SPOTIFY_CLIENT_ID` and `VITE_REDIRECT_TARGET=http://127.0.0.1:3000`)
- `npm test` - Run all tests with Vitest
- `vitest run src/path/to/file.test.ts` - Run a specific test file

### Building
- `npm run build` - Build both CJS and MJS distributions
- `npm run build:cjs` - Build CommonJS distribution only
- `npm run build:mjs` - Build ESM distribution only
- `npm run ci` - CI build command (same as `npm run build`)

### Testing
Tests require environment variables:
- `INTEGRATION_TESTS_REFRESH_TOKEN` - User refresh token for integration tests
- `INTEGRATION_TESTS_SPOTIFY_CLIENT_ID` - Spotify client ID
- `INTEGRATION_TESTS_SPOTIFY_CLIENT_SECRET` - Spotify client secret

Use a `.env` file in the root directory (dotenv is supported).

## Architecture

### Core Structure

**SpotifyApi** (`src/SpotifyApi.ts`) is the main entry point and orchestrator. It:
- Manages authentication via pluggable `IAuthStrategy` implementations
- Provides access to all endpoint categories as properties (albums, artists, playlists, etc.)
- Handles the core request/response lifecycle via `makeRequest()`
- Supports extensive configuration through `SdkOptions` and `SdkConfiguration`

### Authentication Strategies (`src/auth/`)

The SDK uses a strategy pattern for authentication:
- `ClientCredentialsStrategy` - Server-side OAuth with client credentials
- `AuthorizationCodeWithPKCEStrategy` - Browser-based authorization code flow with PKCE
- `ProvidedAccessTokenStrategy` - Use pre-existing access tokens

All strategies implement `IAuthStrategy` which handles token management, caching, and auto-refresh.

### Endpoints (`src/endpoints/`)

Each API category has its own endpoint class extending `EndpointsBase`:
- `AlbumsEndpoints`, `ArtistsEndpoints`, `TracksEndpoints`, etc.
- Endpoint classes receive the `SpotifyApi` instance and use inherited helper methods (`getRequest`, `postRequest`, `putRequest`, `deleteRequest`)
- The `paramsFor()` method in `EndpointsBase` builds URL query strings from objects

### Extensibility Points

The SDK is highly extensible via `SdkOptions`:

1. **fetch** - Override HTTP implementation
2. **beforeRequest/afterRequest** - Request/response interceptors for logging/instrumentation
3. **deserializer** (`IResponseDeserializer`) - Custom response deserialization
4. **responseValidator** (`IValidateResponses`) - Custom response validation logic
5. **errorHandler** (`IHandleErrors`) - Global error handling
6. **redirectionStrategy** (`IRedirectionStrategy`) - Custom OAuth redirect behavior (useful for SPA frameworks)
7. **cachingStrategy** (`ICachingStrategy`) - Token caching (defaults: LocalStorage for browser, InMemory for Node)

### Type System (`src/types.ts`)

All Spotify API types are defined here, exported via `index.ts`. The SDK provides complete type safety for requests and responses.

### Build System

Dual build targets:
- **MJS**: `tsconfig.mjs.json` → `dist/mjs/` (ESM)
- **CJS**: `tsconfig.cjs.json` → `dist/cjs/` (CommonJS)

Package.json exports field resolves the correct build based on module system.

### Testing

- Uses Vitest with jsdom environment
- Test root is `src/` (configured in `vitest.config.ts`)
- Test files: `*.test.ts` alongside source files
- Integration tests require real Spotify credentials via environment variables
- Test helpers in `src/test/` include `FetchApiMock`, `FetchApiSpy`, `SpotifyApiBuilder`

## Development Notes

- Always use `.js` extensions in imports (TypeScript config requires explicit extensions)
- The redirect URI must be `http://127.0.0.1:3000` (not localhost) for OAuth flows
- Strict mode is enabled in TypeScript config
- All endpoint methods are strongly typed and return promises

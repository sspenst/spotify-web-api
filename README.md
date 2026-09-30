# Spotify Web API

TypeScript SDK for the [Spotify Web API](https://developer.spotify.com/web-api/).

```bash
npm install @sspenst/spotify-web-api
```

This package is a maintained fork of [Spotify Web API SDK - TypeScript](https://github.com/spotify/spotify-web-api-ts-sdk), incorporating fixes and improvements for issues raised here and upstream.

The package includes ESM and CommonJS builds for Node.js 20+ and modern browsers, using native `fetch`.

To stream audio inside a browser, use Spotify's [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) alongside this package.

## Running the example app

First install the dependencies:

```bash
npm install
```

Create a `.env` file in the example directory with your `client_id` and redirect url:

```bash .env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_for_tests
VITE_REDIRECT_TARGET=http://127.0.0.1:3000
```

To run the app:

```bash
npm run start
```

### Creating a client instance

Creating an instance of the SDK is easy, and can be done in a number of ways depending on which form of authentication you want to use.

```js
import { SpotifyApi } from '@sspenst/spotify-web-api';

// Choose one of the following:
const sdk = SpotifyApi.withUserAuthorization("client-id", "http://127.0.0.1:3000", ["scope1", "scope2"]);
const sdk = SpotifyApi.withClientCredentials("client-id", "secret");
```

Each of these factory methods will return a `SpotifyApi` instance, which you can use to make requests to the Spotify Web API.

Once you have an authenticated instance of the SDK, you can make requests to the Spotify Web API by using the methods exposed on the client instance of the API. Types are embedded in the package, so if you're using Visual Studio Code or other compatible IDEs, you should get intellisense and type checking by default.

```js
const items = await sdk.search("The Beatles", ["artist"]);

console.table(items.artists.items.map((item) => ({
    name: item.name,
    followers: item.followers.total,
    popularity: item.popularity,
})));
```

### Authentication Methods

- Authorization Code Flow with PKCE
- Client Credentials Flow
- Mixed Server and Client Side Authentication

We do auto-token refresh when expired and a refresh token is available.

### Picking an Authentication Method

For browser applications, use Authorization Code Flow with PKCE. It handles the redirect to Spotify and back, and lets you make requests with the user's access token.

Calling any of the methods on the SDK will automatically perform any redirects/refreshes that are necessary.

```js
const sdk = SpotifyApi.withUserAuthorization("client-id", "http://127.0.0.1:3000", ["scope1", "scope2"]);
const user = await sdk.currentUser.profile()
```


For server applications that do not need user data, use Client Credentials Flow. It requires a Client ID and Client Secret and only supports endpoints that do not require user authorization. Keep the Client Secret on the server.

Server applications that need user data require a user's access token. See Mixed Server and Client Side Authentication below for one way to obtain and use it.

### Mixed Server and Client Side Authentication

There's capabilities in the client if you want to interact with Spotify from your Node.js server, but perform a client side Authorization Code Flow with PKCE.
You might want to do this if you want your server side SDK instance to be authorized "as a specific user" to interact with user data.

You'll need to do three things.

1. Perform Authorization Code Flow with PKCE using some special helper functions
2. Expose a URL from your Node.js application that accepts a token post-back
3. Initilise an instance of the SDK with the posted-back token

Setup:

*Client Side*
```js
SpotifyApi.performUserAuthorization("client-id", "http://127.0.0.1:3000", ["scope1", "scope2"], "https://your-backend-server.com/accept-user-token");
// Alternatively if you want to perform your own custom post-back
SpotifyApi.performUserAuthorization("client-id", "http://127.0.0.1:3000", ["scope1", "scope2"], (accessToken) => { /* do postback here */ });
```

These functions will work as usual, triggering a client side redirect to grant permissions, along with verifying the response and performing token exchange.

*Server Side*
```js
const { SpotifyApi } = require("@sspenst/spotify-web-api");

const express = require('express');
const bodyParser = require('body-parser'); 
const app = express();
 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let sdk;

app.post('/accept-user-token', (req, res) => {
    let data = req.body;
    sdk = SpotifyApi.withAccessToken("client-id", data); // SDK now authenticated as client-side user
}); 
 
app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
});
```

[Check out our blog post for more examples using ES Modules or CommonJS](https://developer.spotify.com/blog/2023-07-03-typescript-sdk)

## Playlist APIs

Playlist item methods use Spotify's current `/playlists/{id}/items` endpoints. Both
`addItemsToPlaylist` and `removeItemsFromPlaylist` return `{ snapshot_id }`.
Create playlists for the authenticated user without passing a user ID:

```ts
const playlist = await sdk.currentUser.playlists.createPlaylist({
    name: "My playlist",
    public: false,
});
// Also available as sdk.playlists.createPlaylist({ name: "My playlist" }).
const added = await sdk.playlists.addItemsToPlaylist(playlist.id, [trackUri]);
const page = await sdk.playlists.getPlaylistItems(playlist.id);
for (const entry of page.items) {
    if (entry.item) console.log(entry.item.name);
}
await sdk.playlists.removeItemsFromPlaylist(playlist.id, {
    items: [{ uri: trackUri }],
    snapshot_id: added.snapshot_id,
});
```

Responses now expose `playlist.items` and `entry.item`, replacing `playlist.tracks`
and `entry.track`. Playlist contents may be absent, and an entry's `item` may be
null. Legacy response fields remain optional in the types; the SDK does not rename
response fields. The old removal request `{ tracks: [...] }` is accepted and sent
as `{ items: [...] }`.

Use user authorization (PKCE or a provided user access token) for playlist
operations. Client credentials do not grant access to a user's playlists or allow
playlist creation. Request `playlist-modify-public` and/or `playlist-modify-private`
for writes, `playlist-read-private` and `playlist-read-collaborative` as needed for
reads, and `ugc-image-upload` for custom covers. Cover uploads accept a raw base64
JPEG string, Buffer, browser canvas, or browser image; Spotify limits the payload
to 256 KB.

`currentUser.playlists.follow` and `unfollow` now use `/me/library` with a playlist
URI. `isFollowing(playlistId)` uses `/me/library/contains` for the current user.
Spotify documents `playlist-modify-public` for saving/removing playlists and
`playlist-read-private` for checking saved playlists; obtain those scopes before
using these calls. The overload `isFollowing(playlistId, ids)` retains the deprecated
follower endpoint, which can only check the current user.

Spotify restricts playlist-item access to playlists the user owns or collaborates
on. Saving/following a playlist does not grant access to its items, so a 403 can be
expected for other playlists. The user-specific creation overload, other users'
playlist lists, and featured/category playlist methods remain available for older
apps but are deprecated or unavailable in Development mode. Prefer
`currentUser.playlists.playlists(limit, offset)` and follow the returned `next`
page; the SDK passes through Spotify's `total` unchanged.

See Spotify's [playlist migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide),
[playlist items reference](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items),
[library save reference](https://developer.spotify.com/documentation/web-api/reference/save-library-items),
and [cover upload reference](https://developer.spotify.com/documentation/web-api/reference/upload-custom-playlist-cover).

## Extensibility

All of the constructors support a configuration object that lets you override the default behavior of the SDK.

Our defaults look like this, and each of the properties is optional, and can be overridden.

```ts
const defaultConfig: SdkConfiguration = {
    fetch: (req: RequestInfo | URL, init: RequestInit | undefined) => fetch(req, init),
    beforeRequest: (_: string, __: RequestInit) => { },
    afterRequest: (_: string, __: RequestInit, ___: Response) => { },
    deserializer: new DefaultResponseDeserializer(),
    responseValidator: new DefaultResponseValidator(),
    errorHandler: new NoOpErrorHandler(),
    redirectionStrategy: new DocumentLocationRedirectionStrategy(),
    cachingStrategy: isBrowser
        ? new LocalStorageCachingStrategy()
        : new InMemoryCachingStrategy()
};
```

As a general rule, this options should be overridden when you create your instance of the client, and you probably won't have to change any of them unless you have some very specific requirements.

You can provide the options like this, to any of the constructors or static initilisation methods:

```js
const opts = {
    fetch: (req, init) => {
        console.log("Called via my custom fetch!");
        return fetch(req, init);
    }
}

const sdk = SpotifyApi.withUserAuthorization("client-id", "https://callback", ["scope1"], opts);
```

All the below examples are in TypeScript, but the same method signatures all apply to JavaScript - just without the Type information.

### Extensibility - fetch

You can override the default Fetch implementation by passing in a function that takes a `RequestInfo` and `RequestInit` and returns a `Promise<Response>`. By default, we use the browser and nodes built in `fetch` implementation.

```js
const opts = {
    fetch: (req, init) => {
        // Do something with the request
        return fetch(req, init);
    }
}
```

### Extensibility - beforeRequest and afterRequest

You can override the default `beforeRequest` and `afterRequest` callbacks by passing in functions that take a `RequestInfo` and `RequestInit` and return nothing. By default, we do nothing.

You can use these functions to implement custom instrumentation, logging, or other functionality.

```js
const opts = {
    beforeRequest: (req, init) => {
        console.log("Called before the request is made");
    },
    afterRequest: (req, init, res) => {
        console.log("Called after the request is made");
    }
}
```

### Extensibility - deserializer

You can override the default deserializer by passing in a class that implements the `IResponseDeserializer` interface. By default, we use the `DefaultResponseDeserializer` class.

To implement your own, you need to provide an object with the following method signature:

```ts
async deserialize<TReturnType>(response: Response): Promise<TReturnType> {
    // Implement your custom deserialization logic here
}
```

You'll probably never need to do this unless you feel the need to add custom logging around deserialization behaviour or wish to customise the default objects returned during serialization failures.

### Extensibility - responseValidator

You can override the default response validator by passing in a class that implements the `IValidateResponses` interface. By default, we use the `DefaultResponseValidator` class.

Our default impelementation validates the following:

- The response status code is in the 200 range
- Errors are thrown for 400 and 500 range status codes
- Non-200 response codes throw errors with the API response body inside of them

If you need to customise this behaviour, replace the implementation like this:

```ts
export default class MyResponseValidator implements IValidateResponses {
    public async validateResponse(response: Response): Promise<void> {
        // Something here
    }
}
```

### Extensibility - errorHandler

You can override the default error handler by passing in a class that implements the `IHandleErrors` interface. By default, we use the `NoOpErrorHandler` class which... does nothing!

If you need to customise this behaviour, replace the implementation like this:

```ts
export default class MyErrorHandler implements IHandleErrors {
    public async handleErrors(error: any): Promise<boolean> {
        return false;
    }
}
```

If you return `true` from your error handler, the SDK will not throw an error, and treat it as handleed, returning null from the request that triggered it. Returning false will re-throw the original error after your handler has run.

### Extensibility - redirectionStrategy

You can override the default redirection strategy by passing in a class that implements the `IRedirectionStrategy` interface. By default, we use the `DocumentLocationRedirectionStrategy` class.

```ts
export default class DocumentLocationRedirectionStrategy implements IRedirectionStrategy {
    public async redirect(targetUrl: string | URL): Promise<void> {
        document.location = targetUrl.toString();
    }

    public async onReturnFromRedirect(): Promise<void> {
    }
}
```

You might want to override this behaviour if you use a client side framework like React or Vue and you need to record some state, or trigger some operation before the redirect for oAuth / token exchange happens. For example - you might want to add something to localStorage that you can read back when the user returns to the application.

### Extensibility - cachingStrategy

You can override token caching with an `ICachingStrategy` implementation. The defaults are `LocalStorageCachingStrategy` in browsers and `InMemoryCachingStrategy` in Node.js.

```ts
interface ICachingStrategy {
    getOrCreate<T>(
        cacheKey: string,
        createFunction: () => Promise<T & ICachable & object>,
        updateFunction?: (item: T) => Promise<T & ICachable & object>
    ): Promise<T & ICachable>;
    get<T>(cacheKey: string): Promise<T & ICachable | null>;
    setCacheItem<T>(cacheKey: string, item: T & ICachable): void;
    remove(cacheKey: string): void;
}
```

## Running the tests

To run the tests, you need to have a Spotify account.

You will need to create a new app in the Spotify Developer portal, and add a redirect URI of `http://127.0.0.1:3000`.

You will need to add the following environment variables:

- `INTEGRATION_TESTS_ACCESS_TOKEN`
- `INTEGRATION_TESTS_REFRESH_TOKEN`
- `INTEGRATION_TESTS_SPOTIFY_CLIENT_ID`
- `INTEGRATION_TESTS_SPOTIFY_CLIENT_SECRET`

`INTEGRATION_TESTS_ACCESS_TOKEN` and `INTEGRATION_TESTS_REFRESH_TOKEN` are used to run integration tests in the scope of a *real user account*. This is required to test endpoints that require a user's authorization, such as `followPlaylist`. You need to make sure that your user has access to whichever Spotify app your client credentials and secret are for. You can obtain an access token and refresh token by running the example app and authenticating.

You can run the tests with `npm run test`, or using a plugin like [Wallaby](https://wallabyjs.com/).

We support `dotenv`, so you can add these to a `.env` file in the root of the repository.

To run the embedded example app, you will need to add the following environment variables:

- `VITE_SPOTIFY_CLIENT_ID`=the same value as set in INTEGRATION_TESTS_SPOTIFY_CLIENT_ID
- `VITE_REDIRECT_TARGET`=http://127.0.0.1:3000

For the example app to work, this .env file needs to be in the ./example folder.

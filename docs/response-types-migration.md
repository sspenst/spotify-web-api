# Migrating response types

This is a breaking TypeScript contract correction for fork issues #4 and #5,
reworking upstream PRs [116](https://github.com/spotify/spotify-web-api-ts-sdk/pull/116)
and [164](https://github.com/spotify/spotify-web-api-ts-sdk/pull/164).

## Nullable data results

`SpotifyApi.makeRequest<T>()`, all four protected request helpers, data endpoint
methods and their overloads, and `IResponseDeserializer.deserialize<T>()` now
return `Promise<T | null>`. This reflects an authentication strategy returning
`emptyAccessToken` (for example while initiating a browser redirect), HTTP 204,
an empty response body, JSON `null`, or an error explicitly suppressed by your
error handler. Collection-unwrapping methods preserve `null`, rather than throwing
or converting it to `undefined`. A successful empty collection is still `[]`.
Search pages and playlist snapshots need the same guard as single resources.

```ts
const albums = await sdk.albums.get(albumIds);
if (albums === null) {
    // Authentication may still be in progress, or there was no response data.
    return;
}
for (const album of albums) console.log(album.name);
```

The default error handler still rethrows HTTP, network, validation, and JSON
parsing failures. A nonempty malformed body (including whitespace alone) is not
an empty response. Nullability does not make an inaccessible endpoint succeed.
Deserializer promise rejections now reach the configured error handler, as other
request failures do. Returning `true` from that handler explicitly opts into
suppressing the error; data requests then return `null`. Response validators now
also run for HTTP 204, so custom validators must accept that status when appropriate.

Custom deserializers should declare `Promise<T | null>` and return `null` directly
when there is no data, without casting it to `T`. Existing deserializers returning
`Promise<T>` remain assignable if they always produce data or throw. Deserializers
remain responsible for interpreting successful non-204 bodies.

The `makeRequest(method, url, body, contentType, "none")` overload remains
`Promise<void>` and resolves `undefined`, including for 204, missing tokens,
and explicitly handled errors. It validates HTTP responses and skips body parsing.
Playback commands still use it; playback reads remain `PlaybackState | null`.
Other existing methods that deliberately discard response data remain `Promise<void>`.
`currentUser.shows.saveShows` and `removeSavedShows` now also discard their result
and return `Promise<void>`, consistent with the other library writes. Code that
inspected their previous untyped result should simply await completion.

## Resources and omitted fields

`AlbumBase` is exported from the package entry point. Fixed resource `type` fields
are literal strings for albums, artists, tracks, playlists, shows, episodes,
audiobooks, chapters, users (including references and `added_by`), linked tracks,
and audio features. Track/episode unions can now be narrowed using `item.type`.
Fixtures and objects assembled by consumers must retain their literal `type`
(using a type annotation or `satisfies`, rather than widening it to `string`).
Device types, playback contexts, copyright kinds, album categories (`album_type`),
and media types have different semantics and remain strings.

The shared response types support both Development and Extended Quota modes by
making fields removed in Spotify's
[February 2026 changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
optional wherever currently modeled:

| Resource | Optional fields |
| --- | --- |
| Album | `available_markets`, `album_group` on simplified albums, `label`, `popularity` |
| Track | `available_markets`, `popularity`; `linked_from` was already optional |
| Artist | `followers`, `popularity` |
| Audiobook | `available_markets`, `publisher` |
| Chapter | `available_markets` |
| Show | `available_markets`, `publisher` |
| User/profile | `country`, `email`, `explicit_content`, `followers`, `product` |

Guard these fields or supply a fallback, such as `album.available_markets ?? []`.
An omitted popularity or follower count is unknown, not necessarily zero.
Album/track `external_ids` remain modeled: Spotify
[restored them in March](https://developer.spotify.com/documentation/web-api/references/changes/march-2026).
Playlist `items` access and legacy optional `tracks` were addressed previously.
The current [album reference](https://developer.spotify.com/documentation/web-api/reference/get-an-album)
and [track reference](https://developer.spotify.com/documentation/web-api/reference/get-track)
document the `album`/`track` resource literals and deprecated markets.

## Audit scope and remaining work

The requested AlbumBase export, album/track markets, and fixed resource literals
from issue #5 are addressed. This does not finish a general response-type audit.
Known follow-up work includes separating simplified/full album metadata (the
existing AlbumBase still requires some full-album fields), typing album artists
as simplified artists, nullable search/show entries (#9), followed-artists cursor
paging (#22), nullable image dimensions and preview fields, app-mode-aware search
limits, and `UserProfile.account_id` added in May 2026. Recommendation seed types
and playback context categories describe multiple kinds and need their own audit.
Remaining library endpoint migrations and structured API errors are separate work.
Keep issue tracking on GitHub; this change does not close issues or alter endpoint access.

Mocked contract tests can be run with `npm test -- src/RequestContracts.unit.test.ts
src/ResponseTypes.unit.test.ts src/endpoints/PlayerEndpoints.unit.test.ts
src/endpoints/PlaylistsEndpoints.unit.test.ts src/endpoints/RestrictedEndpoints.unit.test.ts`.
Run `npx tsc --project tsconfig.contract-tests.json` to check all test sources without executing live requests,
including exact return types and expected consumer compilation failures. Both
`npm run build` targets also emit the corrected public declarations.

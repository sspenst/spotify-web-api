## [3.0.1](https://github.com/sspenst/spotify-web-api/compare/v3.0.0...v3.0.1) (2026-10-01)


### Bug Fixes

* **auth:** preserve refresh tokens and handle invalid grants ([ddfba3c](https://github.com/sspenst/spotify-web-api/commit/ddfba3cb915d2cd6c284b8100821111741f00218)), closes [#56](https://github.com/sspenst/spotify-web-api/issues/56) [#25](https://github.com/sspenst/spotify-web-api/issues/25)

# [3.0.0](https://github.com/sspenst/spotify-web-api/compare/v2.0.0...v3.0.0) (2026-09-30)


### Bug Fixes

* **types:** correct nullable request results and resource response types ([2947c80](https://github.com/sspenst/spotify-web-api/commit/2947c8007d49c95d0e2c889a984761655830433b)), closes [#4](https://github.com/sspenst/spotify-web-api/issues/4) [#5](https://github.com/sspenst/spotify-web-api/issues/5)


### Features

* added new interface ISpotifyError ([59d3427](https://github.com/sspenst/spotify-web-api/commit/59d342755478ff6afde82faa6dcf21404ba1bd47))


### BREAKING CHANGES

* **types:** Handle null data, optional fields and literal types. Show writes return void; 204
is validated.

# [2.0.0](https://github.com/sspenst/spotify-web-api/compare/v1.0.1...v2.0.0) (2026-09-30)


### Bug Fixes

* **player:** fix playback position, command responses and nullable types ([9424071](https://github.com/sspenst/spotify-web-api/commit/94240719e95c2472512bee53115a863b0b7ec421)), closes [#3](https://github.com/sspenst/spotify-web-api/issues/3) [#12](https://github.com/sspenst/spotify-web-api/issues/12) [#13](https://github.com/sspenst/spotify-web-api/issues/13) [#17](https://github.com/sspenst/spotify-web-api/issues/17) [#23](https://github.com/sspenst/spotify-web-api/issues/23)


### BREAKING CHANGES

* **player:** Playback read results and nullable playback fields require null checks.

## [1.0.1](https://github.com/sspenst/spotify-web-api/compare/v1.0.0...v1.0.1) (2026-09-30)


### Bug Fixes

* align integration tests with spotify endpoint restrictions ([c059e2f](https://github.com/sspenst/spotify-web-api/commit/c059e2fddf954b8bf92b5365f16186e294bcddad))

# [1.0.0](https://github.com/sspenst/spotify-web-api/compare/v0.0.6...v1.0.0) (2026-09-30)


### Bug Fixes

* playlist fixes for updated spotify apis ([23884f5](https://github.com/sspenst/spotify-web-api/commit/23884f5c1e27fe56dd6c8453b3ecdc05035aed02)), closes [#20](https://github.com/sspenst/spotify-web-api/issues/20) [#49](https://github.com/sspenst/spotify-web-api/issues/49) [#50](https://github.com/sspenst/spotify-web-api/issues/50)


### BREAKING CHANGES

* Responses use items / item; callers using tracks / track must migrate.

## [0.0.6](https://github.com/sspenst/spotify-web-api/compare/v0.0.5...v0.0.6) (2025-11-05)


### Bug Fixes

* use web crypto instead of require ([db3c078](https://github.com/sspenst/spotify-web-api/commit/db3c078db3b7e17104fd174abbfdb51a4c1142b2))

## [0.0.5](https://github.com/sspenst/spotify-web-api/compare/v0.0.4...v0.0.5) (2025-10-22)


### Bug Fixes

* remove ClientCredentials scope ([179d994](https://github.com/sspenst/spotify-web-api/commit/179d9948e90f3c57bfb6aa926a169231af1ca03b))

## [0.0.4](https://github.com/sspenst/spotify-web-api/compare/v0.0.3...v0.0.4) (2025-10-20)


### Bug Fixes

* current user param updates ([9cc8365](https://github.com/sspenst/spotify-web-api/commit/9cc8365842a48251565825e6b3e05f92d3c415c1))

## [0.0.3](https://github.com/sspenst/spotify-web-api/compare/v0.0.2...v0.0.3) (2025-10-19)


### Bug Fixes

* @sspenst/spotify-web-api ([33c60dd](https://github.com/sspenst/spotify-web-api/commit/33c60ddb5f3668abbb99e1bd6e8d7131cd4163e9))

## [0.0.2](https://github.com/sspenst/spotify-web-api/compare/v0.0.1...v0.0.2) (2025-10-19)


### Bug Fixes

* no semantic release notes in commit message ([48a81ac](https://github.com/sspenst/spotify-web-api/commit/48a81acb2188b22aab21b47b10de5b000adc255c))
* readme extensibility header ([7caa1c2](https://github.com/sspenst/spotify-web-api/commit/7caa1c2d5942ff6e6510580d15571fcd734a5d63))

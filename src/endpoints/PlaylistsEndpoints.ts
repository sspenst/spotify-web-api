import type { Market, Playlist, MaxInt, Page, Track, SnapshotReference, Image, PlaylistedItem, QueryAdditionalTypes, TrackItem, SimplifiedPlaylist, ChangePlaylistDetailsRequest, CreatePlaylistRequest, UpdatePlaylistItemsRequest, RemovePlaylistItemsRequest } from '../types.js';
import EndpointsBase from './EndpointsBase.js';

export default class PlaylistsEndpoints extends EndpointsBase {

    public getPlaylist<AdditionalTypes extends QueryAdditionalTypes | undefined = undefined>(
        playlist_id: string, market?: Market, fields?: string, additional_types?: AdditionalTypes
    ) {
        // TODO: better support for fields
        const params = this.paramsFor({ market, fields, additional_types: additional_types?.join(',') });
        return this.getRequest<Playlist<AdditionalTypes extends undefined ? Track : TrackItem>>(`playlists/${playlist_id}${params}`);
    }

    public getPlaylistItems<AdditionalTypes extends QueryAdditionalTypes | undefined = undefined>(
        playlist_id: string, market?: Market, fields?: string, limit?: MaxInt<50>, offset?: number, additional_types?: AdditionalTypes
    ) {
        // TODO: better support for fields
        const params = this.paramsFor({ market, fields, limit, offset, additional_types: additional_types?.join(',') });
        return this.getRequest<Page<PlaylistedItem<AdditionalTypes extends undefined ? Track : TrackItem>>>(`playlists/${playlist_id}/items${params}`);
    }

    public async changePlaylistDetails(playlist_id: string, request: ChangePlaylistDetailsRequest) {
        await this.putRequest(`playlists/${playlist_id}`, request);
    }

    public movePlaylistItems(playlist_id: string, range_start: number, range_length: number, moveToPosition: number, snapshot_id?: string) {
        return this.updatePlaylistItems(playlist_id, {
            range_start,
            range_length,
            insert_before: moveToPosition,
            snapshot_id
        });
    }

    public updatePlaylistItems(playlist_id: string, request: UpdatePlaylistItemsRequest) {
        return this.putRequest<SnapshotReference>(`playlists/${playlist_id}/items`, request);
    }

    public addItemsToPlaylist(playlist_id: string, uris?: string[], position?: number) {
        return this.postRequest<SnapshotReference>(`playlists/${playlist_id}/items`, { position, uris });
    }

    public removeItemsFromPlaylist(playlist_id: string, request: RemovePlaylistItemsRequest) {
        const items = request.items ?? request.tracks;
        return this.deleteRequest<SnapshotReference>(`playlists/${playlist_id}/items`, { items, snapshot_id: request.snapshot_id });
    }

    /** @deprecated Unavailable in Development mode. Use currentUser.playlists.playlists(). */
    public getUsersPlaylists(user_id: string, limit?: MaxInt<50>, offset?: number) {
        const params = this.paramsFor({ limit, offset });
        return this.getRequest<Page<SimplifiedPlaylist>>(`users/${user_id}/playlists${params}`);
    }

    public createPlaylist(request: CreatePlaylistRequest): Promise<Playlist>;
    /** @deprecated Use createPlaylist(request) for POST /me/playlists. The user-specific endpoint is unavailable in Development mode. */
    public createPlaylist(user_id: string, request: CreatePlaylistRequest): Promise<Playlist>;
    public createPlaylist(userOrRequest: string | CreatePlaylistRequest, request?: CreatePlaylistRequest): Promise<Playlist> {
        if (typeof userOrRequest === "string") {
            return this.postRequest<Playlist>(`users/${userOrRequest}/playlists`, request);
        }
        return this.postRequest<Playlist>("me/playlists", userOrRequest);
    }

    public getPlaylistCoverImage(playlist_id: string) {
        return this.getRequest<Image[]>(`playlists/${playlist_id}/images`);
    }

    public async addCustomPlaylistCoverImage(playlist_id: string, imageData: Buffer | HTMLImageElement | HTMLCanvasElement | string) {
        let base64EncodedJpeg: string = "";

        if (typeof imageData === "string") {
            base64EncodedJpeg = imageData;
        } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(imageData)) {
            base64EncodedJpeg = imageData.toString("base64");
        } else if (typeof HTMLCanvasElement !== "undefined" && imageData instanceof HTMLCanvasElement) {
            base64EncodedJpeg = imageData.toDataURL("image/jpeg").split(';base64,')[1];
        } else if (typeof HTMLImageElement !== "undefined" && imageData instanceof HTMLImageElement) {
            const canvas = document.createElement("canvas");
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Could not get canvas context");
            }
            ctx.drawImage(imageData, 0, 0);
            base64EncodedJpeg = canvas.toDataURL("image/jpeg").split(';base64,')[1];
        } else {
            throw new Error("ImageData must be a Buffer, HTMLImageElement, HTMLCanvasElement, or string containing a base64 encoded jpeg");
        }

        await this.addCustomPlaylistCoverImageFromBase64String(playlist_id, base64EncodedJpeg);
    }

    public async addCustomPlaylistCoverImageFromBase64String(playlist_id: string, base64EncodedJpeg: string) {
        await this.putRequest(`playlists/${playlist_id}/images`, base64EncodedJpeg, "image/jpeg");
    }
}

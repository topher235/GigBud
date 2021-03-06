import {
	RequestTokenFromRefresh, SearchArtist,
	GetAlbumsFromArtist, GetTracksFromAlbum,
	CreatePlaylist, AddSongsToPlaylist, GetUser,
	AuthenticateUser, RequestAccessTokens,
	GetArtistRecommendations
} from 'utils/Spotify';
import constants from 'utils/constants';
import { SecureStore } from 'expo';
import { AsyncStorage } from 'react-native';

// Spotify factory
export default class SpotifyService {
	constructor() {
		this.refreshToken = '';
		this.id = '';
		this.secret = '';
		this.artistImageUrl = '';
	}

	// Store api and auth tokens for using spotify
	async storeTokens(tokens) {
		SecureStore.setItemAsync(constants.local_spotify_access_token,
            tokens.access_token);
        SecureStore.setItemAsync(constants.local_spotify_refresh_token,
            tokens.refresh_token);
        AsyncStorage.setItem(constants.local_streaming_service, 'spotify');
        AsyncStorage.setItem(constants.isLoggedIn, 'true');
	}

	// Authenticates the user with their spotify account
	// saves their access tokens to local storage
	async authenticateUser() {
		id = await SecureStore.getItemAsync(constants.local_spotify_id);
		secret = await SecureStore.getItemAsync(constants.local_spotify_secret);
		let scopes = 'playlist-modify-private playlist-modify-public';
		let result = await AuthenticateUser(id, secret, scopes);
		if(result.type === 'success') {
			let tokens = await RequestAccessTokens(result.authCode, id, secret, result.redirectUrl);
			this.storeTokens(tokens);
			return {type: 'success'};
		} else {
			return {type: 'error', description: 'description'};
		}
	}

	// Returns api and access tokens
	async getTokensFromStorage() {
		return Promise.all([
			SecureStore.getItemAsync(constants.local_spotify_refresh_token),
			SecureStore.getItemAsync(constants.local_spotify_id),
			SecureStore.getItemAsync(constants.local_spotify_secret)
		]);
	}

	// Returns status, track details, track titles, and an image url
	// for the artist
	async getAllTracks(artistName) {
		// Retrieve tokens from storage
		let p = await this.getTokensFromStorage();
		this.refreshToken = p[0];
        this.id = p[1];
        this.secret = p[2];
        // Get access token from the refresh token
        let token = await RequestTokenFromRefresh(this.refreshToken, this.id, this.secret);
        // Get artist details
        let artist = await SearchArtist(token, artistName);
        this.artistImageUrl = artist.artists.items[0].images[1].url;
        // Get albums details
        let albums = await GetAlbumsFromArtist(token, artist.artists.items[0].id);
        // Get songs details
        trackObjects = [];
        trackTitles = [];
        for(var album in albums) {
            let tracksResult = await GetTracksFromAlbum(token, albums[album].id);
            for(var track in tracksResult) {
                trackObjects.push(tracksResult[track]);
                trackTitles.push(tracksResult[track].name.toLowerCase());
            }
        }
        // Return status, track details, track titles, and image url
        return ['OK', trackObjects, trackTitles, this.artistImageUrl];
	}

	// Shuffles an array and returns the result
	// could possibly put this in utils/functions.js
	shuffle(a) {
		for(let i = a.length-1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i+1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	// Creates a playlist on the user's spotify account
	async handleSubmit(playlistTracks, trackObjects, title, isPublic, doShuffle,
						includeOtherArtists, otherArtists) {
		// Get other artists
		if(includeOtherArtists) {
			for(let i = 0; i < otherArtists.length; i++) {
				// Get all tracks from an artist
				let allTracks = await this.getAllTracks(otherArtists[i].artist.name);
				let allTrackTitles = allTracks[2];
				console.log(allTrackTitles);
				// Push the track objects for this artist onto the list
				for(var obj in allTracks[1]) {
					trackObjects.push(allTracks[1][obj]);
				}
				// Iterate over their songs in their sets (possibly multiple sets - encore)
				for(let j = 0; j < otherArtists[i].sets.set.length; j++) {
					for(let k = 0; k < otherArtists[i].sets.set[j].song.length; k++) {
						// Add track to playlist
						let songTitle = otherArtists[i].sets.set[j].song[k].name;
						console.log(songTitle);
						if(allTrackTitles.includes(songTitle.toLowerCase())) {
							playlistTracks.push(songTitle);
						}
					}
				}
			}
		}
		// console.log(playlistTracks);
		var trackIDs = [];
		// Get track IDs
        for(var song in playlistTracks) {
            for(var track in trackObjects) {
                if(playlistTracks[song].toLowerCase() === trackObjects[track].name.toLowerCase()) {
                    trackIDs.push(trackObjects[track].id);
                    break;
                }
            }
        }
        // Shuffle IDs if user wants
        if(doShuffle)
        	trackIDs = this.shuffle(trackIDs);
        // Get access token from refresh
        let token = await RequestTokenFromRefresh(this.refreshToken, this.id, this.secret);
        // Get user profile
        let userID = await GetUser(token);
        // Create empty playlist
        let playlistID = await CreatePlaylist(token, userID, title, isPublic);
        // Add all songs to the new empty playlist
        let result = await AddSongsToPlaylist(token, playlistID, trackIDs);
		if('error' in result) {
			return 'error';
		} else {
			return 'OK';
		}
	}

	// Returns band recommendations from a list of band's
	async getRecommendations(artistNames) {
		// Retrieve tokens from storage
		let p = await this.getTokensFromStorage();
		this.refreshToken = p[0];
        this.id = p[1];
        this.secret = p[2];
        // Get access token from the refresh token
        let token = await RequestTokenFromRefresh(this.refreshToken, this.id, this.secret);
        // Search artists and get IDs
		let ids = [];
		for(let i = 0; i < artistNames.length; i++) {
			let artist = await SearchArtist(token, artistNames[i]);
			ids.push(artist.artists.items[0].id);
		}
		// Get recommendations from list of IDs
		return GetArtistRecommendations(token, ids);
	}

	// Returns an image url for a given band
	async GetImageUrl(artistName) {
		// Retrieve tokens from storage
		let p = await this.getTokensFromStorage();
		this.refreshToken = p[0];
		this.id = p[1];
		this.secret = p[2];
		// Get access token from refresh token
		let token = await RequestTokenFromRefresh(this.refreshToken, this.id, this.secret)
		// Search artist and return image url
		let artistJson = await SearchArtist(token, artistName);
		// could not find artist
		if(artistJson.artists.items.length === 0) {
			return '';
		} else {
			return artistJson.artists.items[0].images[1].url;
		}
	}
}

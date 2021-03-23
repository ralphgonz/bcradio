// 	bcradio: Play your bandcamp collection
// 	Ralph Gonzalez 2021

var bcradio = (function() {
	function KoViewModel() {
		// Params:
		this.userName = '';
		this.numberToLoad = 200;
		this.identityCookie = '';
		this.windowType = 'same';
		// Player:
		this.songTitle = ko.observable('');
		this.songPage = ko.observable('');
		this.albumArt = ko.observable('');
		this.thumbnail = ko.observable('images/scope-tiny.gif');
		this.collectionTitle = ko.observable('');
		this.showParams = ko.observable(true);
		this.showPlayer = ko.observable(false);
		this.showLoading = ko.observable(false);
	}
	var viewModel;

	var trackList;
	var itemInfos;
	var currentSongElt;
	var collectionListElt;

	///////////////////////////////// public methods /////////////////////////////////////
	var pub = {};
	
	pub.init = function() {
		viewModel = new KoViewModel();
		ko.applyBindings(viewModel);

		trackList = new TrackList();
		itemInfos = {};
		currentSongElt = $('#current-song');
		collectionListElt = $("#collection-list");

		var searchParams = new URLSearchParams(window.location.search);
		if (searchParams.has('username')) {
			viewModel.userName = searchParams.get('username');
			viewModel.numberToLoad = searchParams.get('history');
			viewModel.identityCookie = maybeUriEncode(searchParams.get('identity'));
			pub.start();
			return;
		}
	};

	pub.submitParams = function () {
		viewModel.identityCookie = maybeUriEncode(viewModel.identityCookie);
		if (!viewModel.userName) {
			reportBadUsername();
			return;
		}
		var width;
		var height;
		switch(viewModel.windowType) {
			case 'vertical':
				width = 420;
				height = 800;
				break;
			case 'album':
				width = 800;
				height = 856;
				break;
			case 'mini':
				width = 420;
				height = 165;
				break;
			default: // same tab
				pub.start();
				return;
		}
	
		var location = document.location.href.split('?')[0];
		var popup = window.open(`${location}?username=${viewModel.userName}&history=${viewModel.numberToLoad}&identity=${viewModel.identityCookie}`,
			'bcradio',
			`menubar=no,toolbar=no,location=no,status=no,left=100,top=100,width=${width},height=${height}`);
		popup.resizeTo(width, height);
	}

	pub.start = function() {
		viewModel.showLoading(true);
		var userNameRequest = `/${viewModel.userName}`;
		if (viewModel.identityCookie) {
			userNameRequest = `${userNameRequest}?identity-cookie=${viewModel.identityCookie}`;
		}
		$.get(userNameRequest, loadInitialData)
		.fail(function() {
			reportBadUsername("HTTP GET request failed");
		});
	};

	pub.resequence = function() {
		switch($('input[name=sequencing]:checked').val()) {
			case 'shuffle':
				trackList.sortShuffle();
				break;
			case 'alphabetic':
				trackList.sortAlphabetic();
				break;
			default:
				trackList.sortMostRecent();
		}

		trackList.setCurrent(0);
		trackList.nextUnplayed();
		populateCollectionList();
	};

	pub.prev = function() {
		trackList.prev();
		pub.next();
	}

	pub.next = function() {
		trackList.clearCurrentCount();
		currentSongElt.off();
		currentSongElt.trigger('pause');
		playNext();
	}

	///////////////////////////////// private /////////////////////////////////////

	var populateCollectionList = function() {
		collectionListElt.empty();
		for (var i=0 ; i<trackList.length() ; ++i) {
			collectionListElt.append(`<option value="${i}">${trackList.track(i).artist}: ${trackList.track(i).title}</option>\n`);
			syncIsPlayed(i);
		}
	}

	var syncIsPlayed = function(i) {
		if (trackList.track(i).isPlayed) {
			$(`#collection-list option[value=${i}]`).addClass("playedTrack");
		} else {
			$(`#collection-list option[value=${i}]`).removeClass("playedTrack");
		}
	}

	var maybeUriEncode = function(s) {
		if (!s) { return s; }
		var decoded = decodeURIComponent(s);
		if (decoded != s) { return s; }
		return encodeURIComponent(s);
	}

	var reportBadUsername = function(error) {
		viewModel.showLoading(false);
		alert(`No data found for username ${viewModel.userName} (${error})`)
	}

	var loadInitialData = function(data) {
		var dataBlobJson;
		var fanName;
		var error;
		try {
			var htmlData = $('<output>').append($.parseHTML(data));
			var dataBlob = htmlData.find("#pagedata").attr("data-blob");
			dataBlobJson = JSON.parse(dataBlob);

			// Load initial page of tracks
			fanName = dataBlobJson.fan_data.name;
			var cookieStatus = "";
			if (viewModel.identityCookie) {
				if (dataBlobJson.identities.fan) {
					cookieStatus = " (cookied)";
				} else {
					cookieStatus = " (invalid cookie)";
				}
			}
			viewModel.collectionTitle(`${fanName}'s collection${cookieStatus}`);
			extractInfos(Object.values(dataBlobJson.item_cache.collection)); // (a<album_id> or t<track_id>) -> { album_id, featured_track, item_art_id, item_id}
			extractTracks(dataBlobJson.tracklists.collection);
		} catch (err) {
			error = err.message;
		} finally {
			if (!dataBlobJson || !fanName || trackList.length() == 0) {
				reportBadUsername(error);
				return;
			}
		}

		if (viewModel.numberToLoad > 0) {
			// Query for remaining numberToLoad tracks
			var fanId = dataBlobJson.fan_data.fan_id;
			var lastToken = dataBlobJson.collection_data.last_token;
			var moreDataRequest = `?fan-id=${fanId}&older-than-token=${lastToken}&count=${viewModel.numberToLoad}`;
			if (viewModel.identityCookie) {
				moreDataRequest = `${moreDataRequest}&identity-cookie=${viewModel.identityCookie}`;
			}
			$.get(moreDataRequest, loadMoreData)
			.fail(function() {
				viewModel.showLoading(false);
				alert(`Failed attempting to retrieve ${viewModel.numberToLoad} additional elements`);
			});
		} else {
			startPlaying();
		}

		collectionListElt.on('change', function(){
			trackList.setCurrent($(this).val());
			pub.next();
		});
	}

	var loadMoreData = function(data) {
		var result = JSON.parse(data);
		extractInfos(result.items); // [{ album_id, featured_track, item_art_id, item_id}, ...]
		extractTracks(result.tracklists);
		startPlaying();
	}

	var startPlaying = function() {
		viewModel.showParams(false);
		viewModel.showPlayer(true);
		pub.resequence();
		viewModel.showLoading(false);
		playNext();
	}

	var extractInfos = function(items) {
		for (const info of items) {
			if (info["item_id"]) {
				itemInfos[info["item_id"]] = new ItemInfo(info["item_art_id"], info["item_url"]);
			}
		}
	}

	var extractTracks = function(collection) {
		for (const [album, songs] of Object.entries(collection)) {
			songs.forEach(function(track) {
				var file = track.file["mp3-v0"] || track.file["mp3-128"];
				var itemId = album.substring(1);
				trackList.addTrack(track.artist, track.title, file, itemInfos[itemId].artId, itemInfos[itemId].itemUrl);
			});
		}
	}
	
	var setMediaSession = function(track) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: track.title,
			artist: track.artist,
			artwork: [
			  { src: track.largeAlbumArt(), type: 'image/jpg' },
			]
		});
		navigator.mediaSession.setActionHandler('previoustrack', pub.prev);
		navigator.mediaSession.setActionHandler('nexttrack', pub.next);
    }

	var setTitles = function(track) {
		viewModel.albumArt(track.largeAlbumArt());
		viewModel.songTitle(`${track.artist}: ${track.title}`);
		viewModel.songPage(track.itemUrl);
		viewModel.thumbnail(track.smallAlbumArt());
		document.title = `${track.title} (${track.artist})`;
		currentSongElt.attr('src', track.songUrl);
		if ('mediaSession' in navigator) {
			setMediaSession(track);
		}
	}

	// Doubles as entry point for manually-clicked song, without affecting sequence
	var playNext = function() {
		if (!trackList.nextUnplayed()) {
			pub.resequence();
		}

		var i = trackList.advanceTrack();
		syncIsPlayed(i);
		collectionListElt.val(i);
		setTitles(trackList.track(i));

		currentSongElt.trigger('load');
		currentSongElt.trigger('play');
		currentSongElt.one('ended', function() { 
			playNext();
		});
	}
	
	/////////////////// Class: Track
	function Track(artist, title, songUrl, artId, itemUrl, position) {
		this.artist = artist;
		this.title = title;
		this.songUrl = songUrl;
		this.isPlayed = false;
		this.recent = position;
		this.artId = artId;
		this.itemUrl = itemUrl;
	}
	Track.prototype.smallAlbumArt = function() {
		if (this.artId) {
			return `https://f4.bcbits.com/img/a${this.artId}_3.jpg`
		} else {
			return '';
		}
	}
	Track.prototype.largeAlbumArt = function() {
		if (this.artId) {
			return `https://f4.bcbits.com/img/a${this.artId}_10.jpg`
		} else {
			return '';
		}
	}

	/////////////////// Class: TrackList
	function TrackList() {
		this.tracks = [];
		this.current = 0;
	}
	TrackList.prototype.setCurrent = function(i) {
		this.current = i;
	}
	TrackList.prototype.sortShuffle = function() {
		// Knuth/Fisher-Yates Shuffle
		var currentIndex = this.tracks.length, temporaryValue, randomIndex;
		while (0 !== currentIndex) {
		  randomIndex = Math.floor(Math.random() * currentIndex);
		  currentIndex -= 1;
		  temporaryValue = this.tracks[currentIndex];
		  this.tracks[currentIndex] = this.tracks[randomIndex];
		  this.tracks[randomIndex] = temporaryValue;
		}	  
	}
	TrackList.prototype.sortAlphabetic = function() {
		this.tracks.sort((a, b) =>
			a.artist.localeCompare(b.artist, 'en', {'sensitivity': 'base'})
			|| a.title.localeCompare(b.title, 'en', {'sensitivity': 'base'})
		)
	}
	TrackList.prototype.sortMostRecent = function() {
		this.tracks.sort((a, b) =>
			a.recent > b.recent ? 1 : (a.recent < b.recent ? -1 : 0)
		)
	}
	TrackList.prototype.clearCounts = function() {
		for (var i=0 ; i<this.tracks.length ; ++i) {
			this.tracks[i].isPlayed = false;
		};
	}
	TrackList.prototype.clearCurrentCount = function(i) {
		this.tracks[this.current].isPlayed = false;
	}
	TrackList.prototype.prev = function() {
		if (this.current < 2) {
			return;
		}
		this.current -= 2;
	}
	TrackList.prototype.nextUnplayed = function() {
		while (this.current < this.tracks.length && this.tracks[this.current].isPlayed) { ++this.current; }
		if (this.current >= this.tracks.length) {
			this.clearCounts();
			return false;
		}
		return true;
	}
	TrackList.prototype.advanceTrack = function() {
		this.tracks[this.current].isPlayed = true;
		return this.current++;
	}
	TrackList.prototype.addTrack = function(artist, title, file, artId, itemUrl) {
		this.tracks.push(new Track(artist, title, file, artId, itemUrl, this.length));
	}
	TrackList.prototype.length = function() {
		return this.tracks.length; 
	}
	TrackList.prototype.track = function(i) {
		return this.tracks[i];
	}

	/////////////////// Class: ItemInfo
	function ItemInfo(artId, itemUrl) {
		this.artId = artId;
		this.itemUrl = itemUrl;
	}

	return pub;
}());

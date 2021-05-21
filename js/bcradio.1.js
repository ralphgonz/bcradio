// 	bcradio: Play your bandcamp collection
// 	Ralph Gonzalez 2021

var bcradio = (function() {

	var userName;
	var numberToLoad;
	var identityCookie;

	var trackList;
	var itemInfos;
	var skipItems;

	var albumArtElt;
	var currentSongElt;
	var collectionTitleElt;
	var songTitleElt;
	var paramsElt;
	var playerElt;
	var thumbnailElt;
	var artContainerElt;
	var collectionListElt;
	var coverElt;
	var coverImageElt;

	///////////////////////////////// public methods /////////////////////////////////////
	var pub = {};
	
	pub.init = function() {
		albumArtElt = $('#album-art');
		currentSongElt = $('#current-song');
		collectionTitleElt = $('#collection-title');
		songTitleElt = $('#song-title');
		paramsElt = $('#params');
		playerElt = $('#player-container');
		paramsFormElt = $('#params-form');
		thumbnailElt = $('#thumbnail');
		artContainerElt = $('#art-container');
		collectionListElt = $("#collection-list");
		coverElt = $("#cover");
		coverImageElt = $("#cover-image");
		trackList = new TrackList();
		itemInfos = {};
		skipItems = loadSkipItems();

		collectionListElt.on('change', function(){
			trackList.setCurrent($(this).val());
			pub.next();
		});

		artContainerElt.on('click', function(e){
			var offset = $(this).offset();
			var x = (e.pageX - offset.left) / $(this).width();
			var y = (e.pageY - offset.top) / $(this).height();
			if (y > 0.67 && x < 0.33) { pub.prev(); }
			else if (y > 0.67 && x > 0.67) { pub.next(); }
			else if (y > 0.67) { pub.togglePausePlay(); }
			else { coverElt.show(); }
		});

		coverElt.on('click', function(e){
			var offset = $(this).offset();
			var x = (e.pageX - offset.left) / $(this).width();
			var y = (e.pageY - offset.top) / $(this).height();
			if (y > 0.67 && x < 0.33) { pub.prev(); }
			else if (y > 0.67 && x > 0.67) { pub.next(); }
			else if (y > 0.67) { pub.togglePausePlay(); }
			else { coverElt.hide(); }
		});

		var searchParams = new URLSearchParams(window.location.search);
		if (searchParams.has('username')) {
			userName = searchParams.get('username');
			numberToLoad = searchParams.get('history');
			identityCookie = maybeUriEncode(searchParams.get('identity'));
			pub.start();
			return;
		}
		
		paramsFormElt.submit(function (evt){
			evt.preventDefault();

			userName = $('#user-name').val().trim();
			numberToLoad = $('#history').val().trim();
			identityCookie = maybeUriEncode($('#identity-cookie').val().trim());
			if (!userName) {
				reportBadUsername();
				return;
			}
			var width;
			var height;
			switch($('input[name=windowType]:checked').val()) {
				case 'vertical':
					width = 420;
					height = 800;
					break;
				case 'album':
					width = 800;
					height = 856;
					break;
				case 'mini':
					width = 460;
					height = 165;
					break;
				default: // same tab
					pub.start();
					return;
			}
		
			var popup = window.open(`${document.location.href}?username=${userName}&history=${numberToLoad}&identity=${identityCookie}`,
				'bcradio',
				`menubar=no,toolbar=no,location=no,status=no,left=100,top=100,width=${width},height=${height}`);
			popup.resizeTo(width, height);
		});
	};

	pub.start = function() {
		$('#loading').show();
		var userNameRequest = `/userdata/${userName}`;
		if (identityCookie) {
			userNameRequest = `${userNameRequest}?identity-cookie=${identityCookie}`;
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

	pub.togglePausePlay = function() {
		if (currentSongElt.prop('paused')) {
			currentSongElt.trigger('play');
		} else {
			currentSongElt.trigger('pause');
		}
	}

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

	pub.delete = function() {
		var skipItem = trackList.track(trackList.current - 1).itemId;

		if (skipItems.has(skipItem)) {
			trackList.skipMatchingItems(skipItem, false);
			skipItems.delete(skipItem);
			saveSkipItems(skipItems);
			return;
		}

		var artist = trackList.track(trackList.current - 1).artist;
		if (!confirm(`Permanently skip this album by ${artist} on this browser?`)) {
			return;
		}
		trackList.skipMatchingItems(skipItem, true);
		skipItems.add(skipItem);
		saveSkipItems(skipItems);
		currentSongElt.off();
		currentSongElt.trigger('pause');
		playNext();
	}

	///////////////////////////////// private /////////////////////////////////////

	var loadSkipItems = function() {
		var s = localStorage.getItem("skipItems");
		if (!s) {
			return new Set();
		}
		return new Set(s.split("|"));
	}

	var saveSkipItems = function(sSet) {
		var s = Array.from(sSet).join("|");
		localStorage.setItem("skipItems", s);
	}

	var populateCollectionList = function() {
		collectionListElt.empty();
		for (var i=0 ; i<trackList.length() ; ++i) {
			collectionListElt.append(`<option value="${i}">${trackList.track(i).artist}: ${trackList.track(i).title}</option>\n`);
			syncIsPlayed(i);
		}
	}

	var syncIsPlayed = function(i) {
		if (trackList.track(i).isSkipped) {
			$(`#collection-list option[value=${i}]`).removeClass("playedTrack");
			$(`#collection-list option[value=${i}]`).addClass("skippedTrack");
		} else if (trackList.track(i).isPlayed) {
			$(`#collection-list option[value=${i}]`).removeClass("skippedTrack");
			$(`#collection-list option[value=${i}]`).addClass("playedTrack");
		} else {
			$(`#collection-list option[value=${i}]`).removeClass("skippedTrack");
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
		$('#loading').hide();
		alert(`No data found for username ${userName} (${error})`)
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
			if (identityCookie) {
				if (dataBlobJson.identities.fan) {
					cookieStatus = " (cookied)";
				} else {
					cookieStatus = " (invalid cookie)";
				}
			}
			collectionTitleElt.text(`${fanName}'s collection${cookieStatus}`);
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

		// Query for remaining numberToLoad tracks
		var fanId = dataBlobJson.fan_data.fan_id;
		var lastToken = dataBlobJson.collection_data.last_token;
		var moreDataRequest = `moredata?fan-id=${fanId}&older-than-token=${lastToken}&count=${numberToLoad}`;
		if (identityCookie) {
			moreDataRequest = `${moreDataRequest}&identity-cookie=${identityCookie}`;
		}
		$.get(moreDataRequest, loadMoreData)
		.fail(function() {
			$('#loading').hide();
			alert(`Failed attempting to retrieve ${numberToLoad} additional elements`);
		});
	}

	var loadMoreData = function(data) {
		var result = JSON.parse(data);
		extractInfos(result.items); // [{ album_id, featured_track, item_art_id, item_id}, ...]
		extractTracks(result.tracklists);
		startPlaying();
	}

	var startPlaying = function() {
		paramsElt.hide();
		playerElt.show();
		pub.resequence();
		$('#loading').hide();
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
				trackList.addTrack(track.artist, track.title, file, itemInfos[itemId].artId, itemId, itemInfos[itemId].itemUrl);
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
		albumArtElt.attr('src', track.largeAlbumArt());
		coverImageElt.attr('src', albumArtElt.attr('src'));
		songTitleElt.text(`${track.artist}: ${track.title}`)
		songTitleElt.attr('href', track.itemUrl);
		thumbnailElt.attr('href', track.smallAlbumArt());
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

		currentSongElt.one('error', function() {
			currentSongElt.trigger('pause');
			currentSongElt.off('error');
			alert('Failed to play song file...\n1. Try clicking Play again\n' +
			'2. If you supplied an identity cookie you may need to login to Bandcamp in another tab\n' +
			'3. Some mobile browsers don\'t support the identity cookie feature, unfortunately');
			currentSongElt.trigger('load');
		});
	}
	
	/////////////////// Class: Track
	function Track(artist, title, songUrl, artId, itemId, itemUrl, position, isSkipped) {
		this.artist = artist;
		this.title = title;
		this.songUrl = songUrl;
		this.isPlayed = isSkipped;
		this.isSkipped = isSkipped;
		this.recent = position;
		this.artId = artId;
		this.itemUrl = itemUrl;
		this.itemId = itemId;
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
			this.tracks[i].isPlayed = this.tracks[i].isSkipped;
		};
	}
	TrackList.prototype.clearCurrentCount = function(i) {
		this.tracks[this.current].isPlayed = false;
	}
	TrackList.prototype.skipMatchingItems = function(itemId, toSkip) {
		for (var i=0 ; i<this.tracks.length ; ++i) {
			if (this.tracks[i].itemId == itemId) {
				if (i != this.current - 1) {
					this.tracks[i].isPlayed = toSkip;
				}
				this.tracks[i].isSkipped = toSkip;
				syncIsPlayed(i);
			}
		};
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
	TrackList.prototype.addTrack = function(artist, title, file, artId, itemId, itemUrl) {
		this.tracks.push(new Track(artist, title, file, artId, itemId, itemUrl, this.length, skipItems.has(itemId)));
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

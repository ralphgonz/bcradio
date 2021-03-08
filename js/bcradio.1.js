// 	bcradio: Play your bandcamp collection
// 	Ralph Gonzalez 2021

var bcradio = (function() {

	var tracks = [];
	var itemInfos = {};
	var current = 0;
	var albumArtElt;
	var currentSongElt;
	var collectionTitleElt;
	var userNameElt;
	var historyElt;
	var songTitleElt;
	var paramsElt;
	var playerElt;
	var collectionListElt;
	var identityCookieElt;
	var thumbnailElt;
	var itemLinkElt;
	var viewportMetaElt;

	///////////////////////////////// public methods /////////////////////////////////////
	var pub = {};
	
	pub.init = function() {
		albumArtElt = $('#album-art');
		currentSongElt = $('#current-song');
		collectionTitleElt = $('#collection-title');
		userNameElt = $('#user-name');
		historyElt = $('#history');
		songTitleElt = $('#song-title');
		paramsElt = $('#params');
		playerElt = $('#player');
		paramsFormElt = $('#params-form');
		identityCookieElt = $('#identity-cookie');
		thumbnailElt = $('#thumbnail');
		itemLinkElt = $('#item-link');
		collectionListElt = $("#collection-list");
		viewportMetaElt = $("viewport-meta");

		setViewport();
		collectionListElt.on('change', function(){
			current = $(this).val();
			pub.next();
		});
		paramsFormElt.submit(function (evt){
			evt.preventDefault();
			pub.start();
		});
	};

	pub.start = function() {
		if (!userNameElt.val()) {
			reportBadUsername();
			return;
		}
		var userNameRequest = `/${userNameElt.val()}`;
		if ($(identityCookieElt).val()) {
			userNameRequest = `${userNameRequest}?identity-cookie=${$(identityCookieElt).val()}`;
		}
		$.get(userNameRequest, loadInitialData)
		.fail(function() {
			reportBadUsername();
		});
	};

	pub.resequence = function() {
		switch($('input[name=sequencing]:checked').val()) {
			case 'shuffle':
				sortShuffle();
				break;
			case 'alphabetic':
				sortAlphabetic();
				break;
			default:
				sortMostRecent();
		}

		current = 0;
		findNextUnplayed();
		populateCollectionList();
	};

	pub.prev = function() {
		if (current < 2) {
			return;
		}
		current -= 2;
		pub.next();
	}

	pub.next = function() {
		tracks[current].isPlayed = false;
		currentSongElt.off();
		currentSongElt.trigger('pause');
		playNext();
	}

	///////////////////////////////// private /////////////////////////////////////

	/////////////////// Class: Track
	function Track(artist, title, songUrl, artId, itemUrl) {
		this.artist = artist;
		this.title = title;
		this.songUrl = songUrl;
		this.isPlayed = false;
		this.recent = tracks.length;
		this.artId = artId;
		this.itemUrl = itemUrl;
	}

	/////////////////// Class: ItemInfo
	function ItemInfo(artId, itemUrl) {
		this.artId = artId;
		this.itemUrl = itemUrl;
	}

	// Guard against redirect swallowing meta tags
	var setViewport = function() {
		if (!viewportMetaElt.length) {
			$('head').append('<meta name="viewport" content="width=device-width, initial-scale=0.9, maximum-scale=0.9">');
		}
	}

	var findNextUnplayed = function() {
		while (current < tracks.length && tracks[current].isPlayed) { ++current; }
		if (current >= tracks.length) {
			clearCounts();
			pub.resequence();
		}
	}

	var populateCollectionList = function() {
		collectionListElt.empty();
		for (var i=0 ; i<tracks.length ; ++i) {
			collectionListElt.append(`<option value="${i}">${tracks[i].artist}: ${tracks[i].title}</option>\n`);
			markAsPlayed(i, tracks[i].isPlayed);
		}
	}

	var markAsPlayed = function(i) {
		if (tracks[i].isPlayed) {
			$(`#collection-list option[value=${i}]`).addClass("playedTrack");
		} else {
			$(`#collection-list option[value=${i}]`).removeClass("playedTrack");
		}
	}

	var reportBadUsername = function() {
		alert(`No data found for username ${userNameElt.val()}`)
	}

	var loadInitialData = function(data) {
		var dataBlobJson;
		var fanName;
		try {
			var htmlData = $('<output>').append($.parseHTML(data));
			var dataBlob = htmlData.find("#pagedata").attr("data-blob");
			dataBlobJson = JSON.parse(dataBlob);

			// Load initial page of tracks
			fanName = dataBlobJson.fan_data.name;
			var cookieStatus = "";
			if ($(identityCookieElt).val()) {
				if (dataBlobJson.identities.fan) {
					cookieStatus = " (cookied)";
				} else {
					cookieStatus = " (invalid cookie)";
				}
			}
			collectionTitleElt.text(`${fanName}'s collection${cookieStatus}`);
			extractInfos(Object.values(dataBlobJson.item_cache.collection)); // (a<album_id> or t<track_id>) -> { album_id, featured_track, item_art_id, item_id}
			extractTracks(dataBlobJson.tracklists.collection);
		} finally {
			if (!dataBlobJson || !fanName || tracks.length == 0) {
				reportBadUsername();
				return;
			}
		}

		// Query for remaining numberToLoad tracks
		var numberToLoad = historyElt.val();
		var fanId = dataBlobJson.fan_data.fan_id;
		var lastToken = dataBlobJson.collection_data.last_token;
		var moreDataRequest = `?fan-id=${fanId}&older-than-token=${lastToken}&count=${numberToLoad}`;
		if ($(identityCookieElt).val()) {
			moreDataRequest = `${moreDataRequest}&identity-cookie=${$(identityCookieElt).val()}`;
		}
		$.get(moreDataRequest, loadMoreData)
		.fail(function() {
			alert(`Failed attempting to retrieve ${numberToLoad} additional elements`);
		});
	}

	var smallAlbumArt = function(artId) {
		if (artId) {
			return `https://f4.bcbits.com/img/a${artId}_3.jpg`
		} else {
			return '';
		}
	}

	var largeAlbumArt = function(artId) {
		if (artId) {
			return `https://f4.bcbits.com/img/a${artId}_10.jpg`
		} else {
			return '';
		}
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
				tracks.push(new Track(track.artist, track.title, file, itemInfos[itemId].artId, itemInfos[itemId].itemUrl));
			});
		}
	}

	// Knuth/Fisher-Yates Shuffle
	var sortShuffle = function() {
		var currentIndex = tracks.length, temporaryValue, randomIndex;
		while (0 !== currentIndex) {
		  randomIndex = Math.floor(Math.random() * currentIndex);
		  currentIndex -= 1;
		  temporaryValue = tracks[currentIndex];
		  tracks[currentIndex] = tracks[randomIndex];
		  tracks[randomIndex] = temporaryValue;
		}	  
	}

	var sortAlphabetic = function() {
		tracks.sort((a, b) =>
			a.artist.localeCompare(b.artist, 'en', {'sensitivity': 'base'})
			|| a.title.localeCompare(b.title, 'en', {'sensitivity': 'base'})
		)
	}
	
	var sortMostRecent = function() {
		tracks.sort((a, b) =>
			a.recent > b.recent ? 1 : (a.recent < b.recent ? -1 : 0)
		)
	}
	
	// Doubles as entry point for manually-clicked song, without affecting sequence
	var setSong = function(i) {
		tracks[i].isPlayed = true;
		markAsPlayed(i);
		collectionListElt.val(i);
		itemLinkElt.attr('href', tracks[i].itemUrl);
		albumArtElt.attr('src', largeAlbumArt(tracks[i].artId));
		songTitleElt.text(`${tracks[i].artist}: ${tracks[i].title}`)
		songTitleElt.attr('href', tracks[i].itemUrl);
		thumbnailElt.attr('href', smallAlbumArt(tracks[i].artId));
		document.title = `${tracks[i].title} (${tracks[i].artist})`;
		currentSongElt.attr('src', tracks[i].songUrl);
		if ('mediaSession' in navigator) {
			setMediaSession(i);
		}
		currentSongElt.trigger('load');
		currentSongElt.trigger('play');
		currentSongElt.one('ended', function() { 
			playNext();
		 });
	}

	var setMediaSession = function(i) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: tracks[i].title,
			artist: tracks[i].artist,
			artwork: [
			  { src: largeAlbumArt(tracks[i].artId), type: 'image/jpg' },
			]
		});
		navigator.mediaSession.setActionHandler('previoustrack', pub.prev);
		navigator.mediaSession.setActionHandler('nexttrack', pub.next);
    }

	var playNext = function() {
		findNextUnplayed();
		setSong(current++);
	}

	var clearCounts = function() {
		for (var i=0 ; i<tracks.length ; ++i) {
			tracks[i].isPlayed = false;
		};
	}
	
	return pub;
}());

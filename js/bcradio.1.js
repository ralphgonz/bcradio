// 	bcradio: Play your bandcamp collection
// 	Ralph Gonzalez 2021

var bcradio = (function() {

	var tracks = [];
	var current = 0;
	// var albumArtElt;
	var currentSongElt;
	var collectionTitleElt;
	var userNameElt;
	var historyElt;
	var songTitleElt;
	var paramsElt;
	var playerElt;
	var collectionListElt;
	var identityCookieElt;

	///////////////////////////////// public methods /////////////////////////////////////
	var pub = {};
	
	pub.init = function() {
		// albumArtElt = $('#album-art');
		currentSongElt = $('#current-song');
		collectionTitleElt = $('#collection-title');
		userNameElt = $('#user-name');
		historyElt = $('#history');
		songTitleElt = $('#song-title');
		paramsElt = $('#params');
		playerElt = $('#player');
		paramsFormElt = $('#params-form');
		identityCookieElt = $('#identity-cookie');
		collectionListElt = $("#collection-list");
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
	function Track(artist, title, songUrl, artUrl) {
		this.artist = artist;
		this.title = title;
		this.songUrl = songUrl;
		this.artUrl = artUrl;
		this.isPlayed = false;
		this.recent = tracks.length;
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
		$(`#collection-list option[value=${i}]`).attr('style', tracks[i].isPlayed ? 'background-color:lightgrey' : '');
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
			collectionTitleElt.text(`${fanName}'s collection`);
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

	var loadMoreData = function(data) {
		var result = JSON.parse(data);
		extractTracks(result.tracklists);
		startPlaying();
	}

	var startPlaying = function() {
		paramsElt.hide();
		playerElt.show();
		pub.resequence();
		playNext();
	}

	var extractTracks = function(collection) {
		jQuery.each(collection, function() {
			jQuery.each(this, function() {
				var file = this.file["mp3-v0"] || this.file["mp3-128"];
				tracks.push(new Track(this.artist, this.title, file));
			})
		})
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
		// albumArtElt.attr('src', track.artUrl);
		songTitleElt.text(`${tracks[i].artist}: ${tracks[i].title}`)
		currentSongElt.attr('src', tracks[i].songUrl);
		currentSongElt.trigger('load');
		currentSongElt.trigger('play');
		currentSongElt.one('ended', function() { 
			playNext();
		 });
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

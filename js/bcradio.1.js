// 	bcradio: Play your bandcamp collection
// 	Ralph Gonzalez 2021

var bcradio = (function() {

	var tracks = [];
	var shuffledTracks = [];
	var current = 0;
	var albumArtElt;
	var currentSongElt;
	var collectionTitleElt;
	var userNameElt;
	var historyElt;
	var songTitleElt;

	///////////////////////////////// public methods /////////////////////////////////////
	var pub = {};
	
	pub.init = function() {
		albumArtElt = $('#album-art');
		currentSongElt = $('#current-song');
		collectionTitleElt = $('#collection-title');
		userNameElt = $('#user-name');
		historyElt = $('#history');
		songTitleElt = $('#song-title');

	};
	pub.start = function() {
		var userNameRequest = `/${userNameElt.val()}`;
		$.get(userNameRequest, function(data){
			var htmlData = $('<output>').append($.parseHTML(data));
			var dataBlobJson = JSON.parse(htmlData.find("#pagedata").attr("data-blob"));

			// Load initial page of tracks
			var fanName = dataBlobJson.fan_data.name;
			collectionTitleElt.text(`Bandcamp collection for ${fanName}`);
			extractTracks(dataBlobJson.tracklists.collection);
	
			// Query for remaining numberToLoad tracks
			var numberToLoad = historyElt.val();
			var fanId = dataBlobJson.fan_data.fan_id;
			var lastToken = dataBlobJson.collection_data.last_token;
			var moreDataRequest = `?fan-id=${fanId}&older-than-token=${lastToken}&count=${numberToLoad}`;
			$.get(moreDataRequest, function(data) {
				var result = JSON.parse(data);
				extractTracks(result.tracklists);
				// Start playing music
				shuffle();
				playNext();
			});
		});
	};
	pub.stop = function() {
	};

	///////////////////////////////// private /////////////////////////////////////

	/////////////////// Class: Track
	function Track(artist, title, songUrl, artUrl) {
		this.artist = artist;
		this.title = title;
		this.songUrl = songUrl;
		this.artUrl = artUrl;
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
	var shuffle = function() {
		shuffledTracks = tracks;
		var currentIndex = shuffledTracks.length, temporaryValue, randomIndex;
		while (0 !== currentIndex) {
		  randomIndex = Math.floor(Math.random() * currentIndex);
		  currentIndex -= 1;
		  temporaryValue = shuffledTracks[currentIndex];
		  shuffledTracks[currentIndex] = shuffledTracks[randomIndex];
		  shuffledTracks[randomIndex] = temporaryValue;
		}	  
	}
	
	// Doubles as entry point for manually-clicked song, without affecting sequence
	var setSong = function(track) {
		// albumArtElt.attr('src', track.artUrl);
		songTitleElt.text(`${track.artist}: ${track.title}`)
		currentSongElt.attr('src', track.songUrl);
		currentSongElt.trigger('load');
		currentSongElt.trigger('play');
		currentSongElt.on('ended', function() { 
			playNext();
		 });
	}

	var playNext = function() {
		if (current >= shuffledTracks.length) { current = 0; }
		setSong(shuffledTracks[current++]);
	}

	
	return pub;
}());

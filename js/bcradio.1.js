// 	bcradio: Play your bandcamp collection
// 	Ralph Gonzalez 2021

var bcradio = (function() {

	var tracks = [];
	var current = null;
	var albumArtElt;
	var currentSongElt;

	///////////////////////////////// public methods /////////////////////////////////////
	var pub = {};
	
	pub.init = function() {
		albumArtElt = $('#album-art');
		currentSongElt = $('#current-song');

	};
	pub.start = function() {
		nextSong('https://bandcamp.com/stream_redirect?enc=mp3-128&track_id=2226458006&ts=1614466472&t=dfae9a285b11d17ee133d9c7534fc051fe412a77');
	};
	pub.stop = function() {
	};

	///////////////////////////////// private /////////////////////////////////////

	/////////////////// Class: Track
	function Track(songUrl, artUrl) {
		this.songUrl = songUrl;
		this.artUrl = artUrl;
		this.played = false;
		this.previous = null;
		this.next = null;
	}
	
	// Doubles as entry point for manually-clicked song, without affecting sequence
	var setSong = function(track) {
		track.played = true;
		albumArtElt.attr('src', track.artUrl);
		currentSongElt.attr('src', track.songUrl);
		currentSongElt.trigger('load');
		currentSongElt.trigger('play');
		currentSongElt.on('ended', function() { 
			playNext();
		 });
	}

	var nextUnplayed = function() {
		return 0;
	}

	var playNext = function() {
		if (current === null) {
			current = nextUnplayed();
		} else {
			current = current.next;
		}
		current.next = nextUnplayed();
		current.next.previous = current;
		setSong(current);
	}

	
	return pub;
}());

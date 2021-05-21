# bcradio

_Tiny web app to shuffle-play your Bandcamp collection or to check out your friends' collections._ 

[On the air live.](http://bcradio.muskratworks.com)

## Usage

Fill in your info:
* Bandcamp username (this can be found in Settings > Fan > Username, and is also visible in your fan URL)
* Number of additional (beyond the first 20) recent purchases to load
* Optional: copy your "identity" cookie by visiting the bandcamp website in another tab and using your browser's developer tools. This allows loading all purchased tracks in your albums rather than the one representative track, and also provides mp3-V0 quality instead of the default mp3-128.
   * Unfortunately this doesn't seem to work with some mobile devices
* Press `Enter` and wait for your library to load.
* If you're using a desktop computer, open the player tab as a new window to explore the different layouts available. Try making the window full-screen (F11 in Windows) and tapping the album art to showcase it.

![](images/responsive-demo.jpg)

## Controls

* Press icons to Pause, Play, and go to Previous or Next tracks.
* The 'X' icon will mark an album to be skipped permanently on this browser. (This does not remove the album from your Bandcamp collection.)
   * You can un-skip the album by selecting a track in the playlist and clicking 'X' again.
* Click a track in the playlist to skip to that track.
* The playlist may be sorted randomly (Shuffle) or alphabetically.
* Click the track name to open its Bandcamp page in a new tab.
* Click the album art to toggle stretching it to fill the window...
   * But clicking on the lower third of the album art image replicates Previous/Pause/Next controls.

## Limitations

* This app is not affiliated with Bandcamp in any way
* The code does not use a published API and may break in the future

-------------
## Development

Install Ruby packages
```
gem install http
````

Start local server on default port 5678
```
ruby bcradio.rb
```

Navigate to `http://localhost:5678`. 

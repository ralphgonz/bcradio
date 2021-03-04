# bcradio

_Tiny web app to shuffle-play your Bandcamp collection._ [On the air here.](http://bcradio.muskratworks.com)

## Usage

Fill in your info:
* Bandcamp username (this can be found in Settings > Fan > Username, and is also visible in your fan URL)
* Number of additional (beyond the first 20) recent purchases to load
* Optional: copy your "identity" cookie by visiting the bandcamp website in another tab and using your browser's developer tools. This allows loading all purchased tracks in your albums rather than the one representative track, and also provides mp3-V0 quality instead of the default mp3-128.
* Press `Enter`. Rock on.

## Limitations

* Bandcamp does not publish an api to get fan tracks, so this app has some limitations and may break in the future
* You must be logged into Bandcamp in your browser to authorize repeated play requests
* If you are using this tool to audition another user's collection, playback may fail on unpurchased tracks that have exhausted their play counts

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

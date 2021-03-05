# bcradio

_Tiny web app to shuffle-play your Bandcamp collection or to check out your friends' collections._ 

[On the air live.](http://bcradio.muskratworks.com)

## Usage

Fill in your info:
* Bandcamp username (this can be found in Settings > Fan > Username, and is also visible in your fan URL)
* Number of additional (beyond the first 20) recent purchases to load
* Optional: copy your "identity" cookie by visiting the bandcamp website in another tab and using your browser's developer tools. This allows loading all purchased tracks in your albums rather than the one representative track, and also provides mp3-V0 quality instead of the default mp3-128.
* Press `Enter`. Party on, Garth.

## Limitations

* This app is not affiliated with Bandcamp in any way
* The code does not use a published API and may break in the future
* A little work is still required to make the app responsive and mobile-friendly

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

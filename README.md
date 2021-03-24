
# bcradio

_Tiny web app to shuffle-play your Bandcamp collection or to check out your friends' collections._ 

[On the air live.](http://bcradio.muskratworks.com)

[Original version using jQuery and a simple Ruby webserver instead of Rails and Knockout.js](https://github.com/ralphgonz/bcradio/releases/tag/v1.0)

## Usage

Fill in your info:
* Bandcamp username (this can be found in Settings > Fan > Username, and is also visible in your fan URL)
* Number of additional (beyond the first 20) recent purchases to load
* Optional: copy your "identity" cookie by visiting the bandcamp website in another tab and using your browser's developer tools. This allows loading all purchased tracks in your albums rather than the one representative track, and also provides mp3-V0 quality instead of the default mp3-128.
* Press `Enter` and wait for your library to load.
* If you're using a desktop computer, open the player tab as a new window to explore the responsiveness to various window sizes and shapes. Try making the window full-screen (F11 in Windows) to showcase the album art.

![](images/responsive-demo.jpg)

## Limitations

* This app is not affiliated with Bandcamp in any way
* The code does not use a published API and may break in the future

-------------
## Development

Ruby v3.0.0
Rails v6.1.3

_BCRadio is a web app to shuffle-play your Bandcamp collection and share playlists._ 

* [Check it out here](https://bcradio.muskratworks.com)

## Usage

To shuffle-play your Bandcamp collection fill in your info:
* Bandcamp username (this can be found in Settings > Fan > Username, and is also visible in your fan URL)
* Number of additional (beyond the first 20) recent purchases to load
* Optional: copy/paste your [identity cookie](#understanding-identity-cookies) 
* Press `Enter` and wait for your library to load.

...Or just click/tap one of the playlists created by other BCRadio users.

Tip: If you're using a desktop computer, click the Album Art or Mini Player layouts and resize it to your liking. Try making the window full-screen (F11 in Windows) and tapping the album art to showcase it.

![](images/responsive-demo.jpg)

### Controls

* Press icons to Pause, Play, and go to Previous or Next tracks
* The 'X' icon will mark an album to be skipped permanently on this browser. (This does not remove the album from your Bandcamp collection.)
   * You can un-skip the album by selecting a track in the track list and clicking 'X' again
* The up-arrow icon will mark an album to be added to a [Playlist](#playlists)
* Click a track in the track list to skip directly to that track
* The track list may be sorted randomly (Shuffle) or alphabetically
* Click the track name to open its Bandcamp page in a new tab
* Click/tap the album art to toggle stretching it to fill the window...
   * But clicking/tapping on the lower third of the album art image replicates Previous/Pause/Next controls

### Playlists

You can create and share playlists made up of albums in your collection:

* Start a BCRadio session. Use the [identity cookie](#understanding-identity-cookies) feature if you plan on pulishing the playlist.
* Click the green up-arrow icon to add the current album to the playlist.
   * A second click will remove the album from the playlist.
* Repeat with as many albums as you like.
* Click the external-link icon at the top of the collection list to open the playlist in a new BCRadio session in another tab.
* In the new tab click the cloud icon next to the playlist name to publish your playlist to the [BCRadio website](https://bcradio.muskratworks.com).
   * The cloud icon will not appear if you have not provided your [identity cookie](#understanding-identity-cookies). In this case you can still save/share the playlist by copying the URL from the address bar.
   * You are limited to 8 published playlists.
   * To unpublish an existing playlist, click its cloud icon again.

People can listen to published playlists when they arrive at the [BCRadio website](https://bcradio.muskratworks.com):

* Only a single "featured track" of each album will be available to other people listening to your playlist
* Playlists do not retain their sequencing and are presented in Shuffled or Alphabetic order

This feature is intended to help raise awareness of the great music available on Bandcamp. Please encourage
your friends to get Bandcamp accounts and help support musicians!

## Understanding Identity Cookies

BCRadio cannot sign into your Bandcamp account directly. By default it only loads the publicly-available "featured" track for 
each album, and is limited to mp3-128k streaming resolution. By providing your Bandcamp identity cookie to BCRadio, you enable 
loading all your purchased tracks rather than just the "featured" tracks, and also enable mp3-V0 sound quality.

You can find your identity cookie by logging into the Bandcamp website in another tab, enabling your browser's developer 
tools, and copying the value from `(Application >) Storage > Cookies > bandcamp.com > identity`. It's a long URL-encoded
string like:
```
7%09S%3Bk9rNU0kEm%2Fi3afa%2BTCB1%2BvkxHm5Jl9ULJrK7JjrMc%3D%09%7B%22id%22%3A1185531561%2A%22ex%22%3B0%6D
```

_Unfortunately many mobile devices do not support this feature_

## Security

BCRadio does not ask for your Bandcamp password and never stores
your username or identity cookie. All communications are encrypted (https connection).

The service currently runs on the 
San Francisco-based Heroku cloud platform, which is itself
hosted securely on Amazon's EC2 cloud-computing platform. 

## Limitations

* This app is not affiliated with Bandcamp in any way
* The code does not use a published API and may break in the future

-------------
## Development

Install Postgres and create `bcradio` db
```
createdb bcradio
psql bcradio
create table playlists(
username varchar(80),
playlist_name varchar(80),
history integer,
url text,
unique (username, playlist_name)
);
```

Edit the conf file to make sure the table gets `trust` authentication. Also set the environment variable `DATABASE_URL` to 
point to your local db.

Install Ruby packages
```
bundle install
````

Start local server on default port 5678
```
ruby bcradio.rb
```

Navigate to `http://localhost:5678`. 

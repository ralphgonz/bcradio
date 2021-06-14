_BCRadio is a web app to shuffle-play your Bandcamp collection and share playlists._ 

* [Check it out here](https://bcradio.muskratworks.com)
* [Listen to my "Soulful Beats" playlist](https://bcradio.muskratworks.com/?username=ralphgonz&history=500&identity=&plname=Soulful%20Beats&pl=3186317936,1236688466,2453847217,1354053149,669970039,1841385970,2777566998,2072370931,1381099484,3291886963,2486988848,653782977,670723018,8639420,3569642862,564910056,2853506943,39186851,1412922694,2765102043,1222800673,343951807,1780691561,3753052335,2590923883,360252837,2185341875,4097895041,49116025,1301931763,3879439350,899445237,2799285505,1695394720,2450436440,276276087,1367774883,2609352599,828310159,52003609,772049815,1507906476)

## Usage

Fill in your info:
* Bandcamp username (this can be found in Settings > Fan > Username, and is also visible in your fan URL)
* Number of additional (beyond the first 20) recent purchases to load
* Optional: copy/paste your [identity cookie](#understanding-identity-cookies) 
* Press `Enter` and wait for your library to load.
* If you're using a desktop computer, open the player tab as a new window to explore the different layouts available. Try making the window full-screen (F11 in Windows) and tapping the album art to showcase it.

![](images/responsive-demo.jpg)

### Controls

* Press icons to Pause, Play, and go to Previous or Next tracks
* The 'X' icon will mark an album to be skipped permanently on this browser. (This does not remove the album from your Bandcamp collection.)
   * You can un-skip the album by selecting a track in the track list and clicking 'X' again
* The up-arrow icon will mark an album to be added to a [Playlist](#playlists)
* Click a track in the track list to skip directly to that track
* The track list may be sorted randomly (Shuffle) or alphabetically
* Click the track name to open its Bandcamp page in a new tab
* Click the album art to toggle stretching it to fill the window...
   * But clicking on the lower third of the album art image replicates Previous/Pause/Next controls

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
tools, and copying the value from (Application >) Storage > Cookies > bandcamp.com > identity.

* _Unfortunately many mobile devices do not support this feature_

## Security

BC Radio does not ask for your Bandcamp password and never stores
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

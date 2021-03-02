# bcradio

_Tiny web app to shuffle-play your Bandcamp collection_

## Getting started

Install Ruby packages
```
gem install http
````

Start server on default port 5678
```
ruby bcradio.rb
```

Navigate to `http://localhost:5678`. Enter your bandcamp username and press `Enter`. Rock on.

## Limitations

Bandcamp does not publish an api to get fan tracks, so this app has some limitations and may break in the future.
* You may get all tracks on album purchases or only one representative track per album
* You may get mp3 V0 quality or 128k quality
* You must be logged into Bandcamp in your browser to authorize repeated play requests from this app



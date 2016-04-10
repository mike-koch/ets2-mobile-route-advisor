# Map Packs

Here you can download various map packs for the `ets2-mobile-route-advisor`.  For instructions on how to create a map, visit [Creating a Map Pack](https://github.com/mike-koch/ets2-mobile-route-advisor/wiki/Creating-a-Map-Pack) at the repository wiki.

## Installing a Map Pack
Download the map pack via http://www.mikekoch.me/ets2-mobile-route-advisor. Once you have the zip downloaded, extract the folder inside the .zip into your /maps folder. You should have a directory listing similar to the one below:

```
  - ets2-mobile-route-advisor
      - /maps
          - /ats
              - config.json
              - /js
              - /tiles
          - /ets2
              - config.json
              - /js
              - /tiles
          - <the map pack you just extracted>
              - config.json
              - (any other files included with the map pack)
```

Next, open up your `config.json` at the root of the skin directory, and find the `mapPack` property beneath `ats` or `est2`.  Change this value to the name of your new map pack (depending on which game it is for).  Once finished, save your `config.json` and refresh the skin.

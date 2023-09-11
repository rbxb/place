# place

This project was inspired by r/Place. It is an online shared canvas where you can draw individual pixels.

The project is online at [pl.g7kk.com](https://pl.g7kk.com).

## How to host a Place

1. You need to compile [place.go](https://github.com/rbxb/place/tree/master/cmd/place) using the [Go compiler](https://go.dev/).  
    Run `go build`:

    ```shell
    cd ./place
    go build cmd/place/place.go
    ```
    alternatively, use `go install`:
    ```shell
    cd ./place
    go install cmd/place/place.go
    ```
    

2. Run place and set the **-root** argument to the location of the [web/root](https://github.com/rbxb/place/tree/master/web/root) directory. You can also configure other settings when you run it (see below).

    ```shell
    place -root web/root -port :8080
    ```

### Other configuration options:
  
  **-root** string  
        The directory with the web files. (default "./root")
  
  **-count** int  
        The maximum number of connections. (default 64)
        
  **-width** int  
        The width to create the canvas. (default 1024)
    
  **-height** int  
        The height to create the canvas. (default 1024)
        
  **-load** string  
        A png to load as the canvas. (If not set it creates a blank canvas)
        
  **-save** string  
        The name to save the canvas. (default "./place.png")
        
  **-log** string  
        The log file to write to. (If not set it will log to the command line)
        
  **-port** string  
        The port the server listens at. (default ":8080")
        
  **-sinterval** int  
        Save interval in seconds. (default 180)

  **-wl** (no value)
        Enables the whitelist

  **-whitelist** string
        Path to the whitelist. (default "whitelist.csv")

  **-loadRecord** string
        Path of the record image to load. (Creates a blank record if not set)

  **-saveRecord** string
        Path to save the record image to. (default "record.png")

## Whitelist

You can optionally add a whitelist. When the whitelist is enabled, only users with a key will be able to draw on the canvas. The server will also keep a record of who placed each pixel.

To use a whitelist, first create a csv document. Each user will have a personal key and an ID that will identify them in the record. The key should be a long string and the ID should be an integer in the range of [1,65535].

I recomend using uuids for the keys. For example:
```
2237701c-7558-4424-95e1-beee4f6a406a,1
f9e41cf2-0e5d-43f2-bffd-5e2f1aab0a3b,2
4917ba68-41be-4956-93a7-0563257ff182,3
79df0674-f6d5-4556-baad-992e81f72bb2,65535
```

The pixel colors in the record image correspond to the ID in the whitelist.

When you enable the whitelist using the -wl argument, it will look for a file named "whitelist.csv" in the working directory. But you can set your own path as well:
```shell
place -wl -whitelist my_white_list.csv
```

You can also load an existing record image using -loadRecord, which is similar to -load for loading the canvas
```shell
place -load place.png -wl -loadRecord record.csv
```

If you do not include the -wl argument, the whitelist and record will be ignored.
        
        
## Maintenance

I recomend setting up some scripts to easily restart the server or rollback the canvas.

#### Restart the server

This script kills the server and restarts it with the old canvas. This **does not** reset the canvas.  
On my server I have this script set up as a cron job to run nightly to remove any lingering websocket connections.

```shell
cd ~/go/src/place/web
pkill place
~/go/bin/place -port :80 -load place.png &>place.log &
```

#### Rollback the canvas

This script rolls back the canvas to a previously saved image.  

```shell
cd ~/go/src/place/web
pkill place
cp place_rollback.png place.png
~/go/bin/place -port :80 -load place.png &>place.log &
```

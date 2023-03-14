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

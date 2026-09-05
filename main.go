package main

import (
	"embed"
	"log/slog"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	slog.SetDefault(slog.New(newColorHandler(os.Stderr, slog.LevelDebug)))

	slog.Info("starting SafeWheel")

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:         "SafeWheel",
		Width:         1280,
		Height:        720,
		DisableResize: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 250, G: 250, B: 250, A: 1},
		Linux: &linux.Options{
			WebviewGpuPolicy: linux.WebviewGpuPolicyAlways,
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		slog.Error("wails run failed", "error", err)
	}
}

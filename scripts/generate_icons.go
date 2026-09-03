package main

import (
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"math"
	"os"
)

func createIcon(width, height int, bgCol, fgCol color.RGBA, text string) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Fill background
	draw.Draw(img, img.Bounds(), &image.Uniform{bgCol}, image.Point{}, draw.Src)

	// Draw rounded / circular emblem in center
	centerX, centerY := width/2, height/2
	radius := int(float64(width) * 0.35)

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := float64(x - centerX)
			dy := float64(y - centerY)
			dist := math.Sqrt(dx*dx + dy*dy)
			if dist <= float64(radius) {
				img.Set(x, y, fgCol)
			}
		}
	}

	// Inner ring
	innerRadius := int(float64(radius) * 0.8)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := float64(x - centerX)
			dy := float64(y - centerY)
			dist := math.Sqrt(dx*dx + dy*dy)
			if dist <= float64(innerRadius) {
				img.Set(x, y, bgCol)
			}
		}
	}

	// Center dot
	coreRadius := int(float64(radius) * 0.3)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := float64(x - centerX)
			dy := float64(y - centerY)
			dist := math.Sqrt(dx*dx + dy*dy)
			if dist <= float64(coreRadius) {
				img.Set(x, y, fgCol)
			}
		}
	}

	return img
}

func main() {
	if err := os.MkdirAll("mobile/assets", 0755); err != nil {
		log.Fatalf("Failed to create mobile/assets: %v", err)
	}

	terracota := color.RGBA{R: 200, G: 90, B: 50, A: 255}   // #C85A32
	cream := color.RGBA{R: 249, G: 246, B: 240, A: 255}      // #F9F6F0

	// 1. icon.png (1024x1024)
	icon := createIcon(1024, 1024, terracota, cream, "FELAG")
	f1, _ := os.Create("mobile/assets/icon.png")
	png.Encode(f1, icon)
	f1.Close()

	// 2. adaptive-icon.png (1024x1024 foreground)
	adaptive := createIcon(1024, 1024, color.RGBA{0, 0, 0, 0}, terracota, "FELAG")
	f2, _ := os.Create("mobile/assets/adaptive-icon.png")
	png.Encode(f2, adaptive)
	f2.Close()

	// 3. splash.png (2048x2048)
	splash := createIcon(2048, 2048, cream, terracota, "FELAG")
	f3, _ := os.Create("mobile/assets/splash.png")
	png.Encode(f3, splash)
	f3.Close()

	// 4. favicon.png (48x48)
	favicon := createIcon(48, 48, terracota, cream, "F")
	f4, _ := os.Create("mobile/assets/favicon.png")
	png.Encode(f4, favicon)
	f4.Close()

	log.Println("Generated mobile assets: icon.png, adaptive-icon.png, splash.png, favicon.png")
}

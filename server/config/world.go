package config

import (
	"encoding/json"
	"os"
)

type Spawn struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Size struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

type WorldConfig struct {
	Key              string  `json:"key"`
	Size             Size    `json:"size"`
	Spawn            Spawn   `json:"spawn"`
	PlayerVisibility float64 `json:"playerVisibility"`
}

var FarmWorld WorldConfig

func LoadWorldConfig() {
	file, err := os.ReadFile("../shared/worlds/farm.json")
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(file, &FarmWorld)
	if err != nil {
		panic(err)
	}
}

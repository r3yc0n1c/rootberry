const assets = {}

function loadImage(key, path) {
  console.log(`loadImage called with key: "${key}", path: "${path}"`)
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      assets[key] = img
      resolve()
    }
    
    img.onerror = () => {
      console.error(`Failed to load image: ${path}`)
      resolve() // Still resolve to avoid blocking game startup
    }

    img.src = path
  })
}

async function loadAssets() {
  console.log("Starting to load assets...")
  // Load grass tile
  await loadImage("grass", "assets/tiles/Autotile_Grass_and_Dirt_Path_Tileset.png")
  // Load crops
  await loadImage("crops", "assets/crops/Crops_Tileset.png")
  // Load bunny animations
  await loadImage("bunny_idle", "assets/bunny/IDLE/Bunny_Idle.png")
  await loadImage("bunny_run", "assets/bunny/RUN/Bunny_Run.png")
  await loadImage("bunny_hoe", "assets/bunny/HOE/Bunny_Hoe.png")
  await loadImage("bunny_water", "assets/bunny/WATERING CAN/Bunny_WateringCan.png")
  console.log("Assets loaded:", Object.keys(assets))
}

import sharp from "sharp"
await sharp("public/map/sprites/source.svg").png().toFile("public/map/sprites/atlas.png")

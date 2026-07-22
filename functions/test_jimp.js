import { Jimp } from 'jimp';

async function run() {
  const img = new Jimp({ width: 100, height: 100, color: 0xFF0000FF });
  console.log("img.opacity function:", img.opacity);
}

run().catch(console.error);

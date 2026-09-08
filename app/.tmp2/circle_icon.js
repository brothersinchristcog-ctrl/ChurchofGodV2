const Jimp = require('jimp');

async function makeCircularLogo() {
  try {
    console.log("Loading original logo...");
    const image = await Jimp.read('../assets/logo.png');
    
    // Make sure the image is square
    const size = Math.min(image.bitmap.width, image.bitmap.height);
    image.crop(
      (image.bitmap.width - size) / 2,
      (image.bitmap.height - size) / 2,
      size,
      size
    );
    
    // Apply circular mask
    image.circle();
    
    // Save the result
    await image.writeAsync('../assets/splash-logo.png');
    console.log("Successfully created splash-logo.png with a circular mask!");
  } catch (error) {
    console.error("Error creating circular logo:", error);
  }
}

makeCircularLogo();

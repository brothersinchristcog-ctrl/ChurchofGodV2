const Jimp = require('jimp');

async function createAdaptiveIcon() {
  try {
    console.log("Loading original logo...");
    const originalLogo = await Jimp.read('../assets/logo.png');
    
    // Adaptive icon total size is 1080x1080
    // The safe zone is 720x720
    // We'll scale the logo to fit within 720x720 to ensure it's not cropped
    originalLogo.scaleToFit(720, 720);

    // Create a new 1080x1080 transparent image
    const paddedIcon = new Jimp(1080, 1080, 0x00000000); // 0x00000000 is transparent

    // Calculate center position
    const x = (1080 - originalLogo.bitmap.width) / 2;
    const y = (1080 - originalLogo.bitmap.height) / 2;

    // Composite the logo onto the transparent background
    paddedIcon.composite(originalLogo, x, y);

    // Save as adaptive-icon.png
    await paddedIcon.writeAsync('../assets/adaptive-icon.png');
    console.log("Successfully created adaptive-icon.png with proper padding!");
  } catch (error) {
    console.error("Error creating adaptive icon:", error);
  }
}

createAdaptiveIcon();

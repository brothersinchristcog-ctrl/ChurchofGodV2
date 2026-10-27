const Jimp = require('jimp');
const path = require('path');

async function padIcon() {
  try {
    const inputPath = path.join(__dirname, 'assets', 'logo.png');
    const outputPath = path.join(__dirname, 'assets', 'adaptive-icon.png');
    
    // Read the original logo
    const image = await Jimp.read(inputPath);
    
    // Resize the logo to fit comfortably within the safe zone (Android safe zone is 720px diameter)
    image.resize(650, 650);
    
    // Create a new 1080x1080 transparent image (Standard adaptive icon size)
    const padded = new Jimp(1080, 1080, 0x00000000);
    
    // Composite the resized logo into the center
    padded.composite(image, (1080 - 650) / 2, (1080 - 650) / 2);
    
    // Save the new padded icon
    await padded.writeAsync(outputPath);
    console.log('Successfully created adaptive-icon.png with proper padding');
  } catch (error) {
    console.error('Error creating padded icon:', error);
  }
}

padIcon();

const Jimp = require('jimp');
const path = require('path');

async function padIcon() {
  try {
    const inputPath = path.join(__dirname, 'assets', 'logo.png');
    const outputPath = path.join(__dirname, 'assets', 'adaptive-icon.png');
    
    // Read the original logo
    const image = await Jimp.read(inputPath);
    
    // Resize the logo to fit within the safe zone (600x600)
    image.resize(600, 600);
    
    // Create a new 1024x1024 transparent image
    const padded = new Jimp(1024, 1024, 0x00000000);
    
    // Composite the resized logo into the center
    padded.composite(image, (1024 - 600) / 2, (1024 - 600) / 2);
    
    // Save the new padded icon
    await padded.writeAsync(outputPath);
    console.log('Successfully created adaptive-icon.png');
  } catch (error) {
    console.error('Error creating padded icon:', error);
  }
}

padIcon();

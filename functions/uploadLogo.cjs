const { initializeApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

initializeApp();

async function uploadLogo() {
  try {
    const bucket = getStorage().bucket('church-mobile-app-b7e27.appspot.com');
    console.log('Uploading logo.png to Firebase Storage...');
    
    const [file] = await bucket.upload('../app/assets/logo.png', {
      destination: 'public/logo.png',
      metadata: {
        contentType: 'image/png'
      }
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/public/logo.png`;
    console.log('--- SUCCESS ---');
    console.log('PUBLIC URL:', publicUrl);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

uploadLogo();

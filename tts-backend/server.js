const express = require('express');
const cors = require('cors');
const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());

app.get('/api/tts', async (req, res) => {
  const text = req.query.text;
  if (!text) {
    return res.status(400).send('Missing text parameter');
  }

  try {
    const tts = new EdgeTTS({
      voice: 'en-US-JennyNeural',
      lang: 'en-US',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    });

    const tempFile = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
    await tts.ttsPromise(text, tempFile);
    
    res.set({
      'Content-Type': 'audio/mpeg',
    });
    
    const readStream = fs.createReadStream(tempFile);
    readStream.pipe(res);
    
    readStream.on('close', () => {
      fs.unlink(tempFile, (err) => {
        if(err) console.error("Error deleting temp file:", err);
      });
    });

  } catch (error) {
    console.error('Error generating TTS:', error);
    res.status(500).send('Error generating TTS');
  }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TTS Backend running on port ${PORT}`);
});

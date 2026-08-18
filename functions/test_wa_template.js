
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
const token = process.env.WHATSAPP_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_ID;

async function run() {
  try {
    const res = await axios.get(\https://graph.facebook.com/v19.0/\\, {
      headers: { Authorization: \Bearer \\ }
    });
    console.log('Phone Data:', res.data);
    
    // We can try to send a message and force a webhook error, or try to get templates if we know the WABA ID
    // Let's send a generic text message to see if it arrives!
    const msg = {
      messaging_product: 'whatsapp',
      to: '919398501975',
      type: 'text',
      text: { body: 'Hello from Church of God!' }
    };
    
    const sendRes = await axios.post(\https://graph.facebook.com/v19.0/\/messages\, msg, {
      headers: { Authorization: \Bearer \\, 'Content-Type': 'application/json' }
    });
    console.log('Text Message Sent:', sendRes.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
run();


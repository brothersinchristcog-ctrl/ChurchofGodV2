
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
const token = process.env.WHATSAPP_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_ID;
console.log('Token:', token ? 'Exists' : 'Missing', 'PhoneID:', phoneId ? 'Exists' : 'Missing');

if(!token || !phoneId) process.exit();

const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64, 'base64');
const blob = new Blob([buffer], { type: 'image/jpeg' });
const formData = new FormData();
formData.append('messaging_product', 'whatsapp');
formData.append('file', blob, 'image.jpg');

const uploadUrl = 'https://graph.facebook.com/v19.0/' + phoneId + '/media';
axios.post(uploadUrl, formData, {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => {
  console.log('Upload success:', res.data);
  const mediaId = res.data.id;
  const url = 'https://graph.facebook.com/v19.0/' + phoneId + '/messages';
  const msg = {
      messaging_product: 'whatsapp',
      to: '919398501975', 
      type: 'template',
      template: {
        name: 'cod_card',
        language: { code: 'en' },
        components: [
          { type: 'header', parameters: [{ type: 'image', image: { id: mediaId } }] },
          { type: 'body', parameters: [{ type: 'text', text: 'Test' }, { type: 'text', text: 'Test verse' }] }
        ]
      }
  };
  return axios.post(url, msg, { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }});
}).then(res2 => {
  console.log('Message success:', res2.data);
}).catch(err => {
  console.error('Error:', err.response?.data || err.message);
});


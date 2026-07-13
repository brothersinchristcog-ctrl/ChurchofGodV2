import { onCall, HttpsError } from 'firebase-functions/v2/https';
import axios from 'axios';

export const sendWhatsAppWish = onCall({ invoker: 'public' }, async (request) => {
  try {
    const { phoneNumber, messageBody, verse } = request.data || {};

    if (!phoneNumber || !messageBody) {
      throw new HttpsError('invalid-argument', 'Phone number and message body are required.');
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      throw new HttpsError('internal', 'WhatsApp credentials are not configured on the server.');
    }

    let fullText = messageBody;
    if (verse) {
      fullText += `\n\n"${verse.text}"\n- ${verse.ref}`;
    }

    const imageBase64 = request.data?.imageBase64;
    let messagePayload: any = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
    };

    if (imageBase64) {
      // Convert base64 to Blob/Buffer
      const buffer = Buffer.from(imageBase64, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', blob, 'image.jpg');

      // Upload Media
      const uploadUrl = `https://graph.facebook.com/v19.0/${phoneId}/media`;
      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const mediaId = uploadResponse.data.id;
      
      messagePayload.type = 'template';
      messagePayload.template = {
        name: 'cod_card',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  id: mediaId
                }
              }
            ]
          }
        ]
      };
    } else {
      messagePayload.type = 'text';
      messagePayload.text = { body: fullText };
    }

    // Send Message
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await axios.post(url, messagePayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return { success: true, messageId: response.data?.messages?.[0]?.id };
  } catch (error: any) {
    console.error('sendWhatsAppWish Error:', error.response?.data || error.message);
    throw new HttpsError('internal', error.response?.data?.error?.message || error.message);
  }
});

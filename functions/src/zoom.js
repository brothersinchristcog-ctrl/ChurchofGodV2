import { onCall, HttpsError } from 'firebase-functions/v2/https';
import axios from 'axios';
// To use this, add the following to your functions/.env file:
// ZOOM_ACCOUNT_ID=your_account_id
// ZOOM_CLIENT_ID=your_client_id
// ZOOM_CLIENT_SECRET=your_client_secret
// ZOOM_USER_EMAIL=your_zoom_host_email@example.com
async function getZoomAccessToken() {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!accountId || !clientId || !clientSecret) {
        throw new Error('Zoom API credentials are not configured in the environment.');
    }
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(tokenUrl, {}, {
        headers: {
            'Authorization': `Basic ${authHeader}`
        }
    });
    return response.data.access_token;
}
export const generateZoomMeetingLink = onCall({ invoker: 'public' }, async (request) => {
    // Ensure the user is authenticated (Optional but recommended for admin actions)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to create a Zoom meeting.');
    }
    const { topic, startTime, duration } = request.data;
    const userEmail = process.env.ZOOM_USER_EMAIL;
    if (!userEmail) {
        throw new HttpsError('failed-precondition', 'Zoom host email is not configured in the environment.');
    }
    try {
        // 1. Get OAuth Token
        const accessToken = await getZoomAccessToken();
        // 2. Create the Meeting on Zoom
        const createMeetingUrl = `https://api.zoom.us/v2/users/${encodeURIComponent(userEmail)}/meetings`;
        const meetingPayload = {
            topic: topic || 'Church of God Online Meeting',
            type: 2, // 2 = Scheduled meeting
            start_time: startTime, // ISO format string
            duration: duration || 60, // Duration in minutes
            timezone: 'UTC', // Ensure frontend sends UTC time, or pass timezone string
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: true,
                jbh_time: 5,
                mute_upon_entry: true,
                waiting_room: false,
            }
        };
        const meetingResponse = await axios.post(createMeetingUrl, meetingPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const data = meetingResponse.data;
        // Return the required Zoom details to the frontend
        return {
            success: true,
            meetingUri: data.join_url,
            meetingId: data.id,
            password: data.password,
            startUrl: data.start_url // The host needs this to start the meeting natively
        };
    }
    catch (error) {
        console.error('Zoom API Error:', error.response?.data || error.message);
        throw new HttpsError('internal', 'Failed to generate Zoom meeting: ' + (error.response?.data?.message || error.message));
    }
});
//# sourceMappingURL=zoom.js.map
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GoogleMeetService {
  private static authClient: any;

  private static async getAuthClient() {
    if (this.authClient) return this.authClient;

    const keyFilePath = path.join(__dirname, '..', 'meetServiceAccount.json');
    const credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
    
    const subject = process.env.WORKSPACE_ADMIN_EMAIL;
    
    if (!subject) {
      throw new Error("WORKSPACE_ADMIN_EMAIL environment variable is not set. Domain-Wide Delegation requires an impersonated user.");
    }

    this.authClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/meetings.space.create'],
      subject: subject,
    });

    return this.authClient;
  }

  static async createMeetSpace() {
    try {
      const authClient = await this.getAuthClient();
      const meet = google.meet({ version: 'v2', auth: authClient });

      const response = await meet.spaces.create({
        requestBody: {
          config: {
            accessType: 'OPEN',
          }
        },
      });

      return {
        meetingUri: response.data.meetingUri,
        meetingCode: response.data.meetingCode,
        name: response.data.name,
      };
    } catch (error) {
      console.error('Error creating Google Meet space:', error);
      throw error;
    }
  }
}

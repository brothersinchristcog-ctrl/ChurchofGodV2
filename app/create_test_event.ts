import SalesforceService from './src/services/SalesforceService';

async function createTestEvent() {
  try {
    const today = new Date();
    // Salesforce expects Date__c as YYYY-MM-DD
    const dateStr = today.toISOString().split('T')[0];

    const payload = {
      titleEn: 'Sunday Morning Worship',
      titleTe: 'ఆదివారం ఉదయం ఆరాధన',
      date: dateStr,
      startTime: '10:00:00.000Z',
      endTime: '12:30:00.000Z',
      descEn: 'Join us for Sunday worship.',
      descTe: 'ఆదివారం ఆరాధనలో చేరండి.',
      venueEn: 'Main Sanctuary',
      venueTe: 'ప్రధాన ఆలయం',
      address: 'Church of God, Ameerpet, Hyderabad',
      eventType: 'Sunday Service · ఆదివారం సేవ',
      mode: 'In-person',
      rsvpEnabled: true,
      rsvpPublic: true,
      audience: 'All members,',
      publishStatus: 'Publish now — visible to all members',
      bannerColor: '#c0392b',
      bannerUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80',
      recurring: 'One-time',
      notifyOnPublish: false,
      reminder1Day: false,
      reminder1Hour: false,
      rsvpCap: 0
    };

    console.log('Creating test event for today:', dateStr);
    await SalesforceService.createEvent(payload);
    console.log('Successfully created test event!');
  } catch (error) {
    console.error('Failed to create test event:', error);
  }
}

createTestEvent();

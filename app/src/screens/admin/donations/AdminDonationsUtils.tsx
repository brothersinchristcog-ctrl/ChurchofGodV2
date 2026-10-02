import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export const COLORS = {
  indigo: '#1B1F3B',
  indigoDeep: '#12152B',
  indigoSoft: '#2A2F55',
  gold: '#C9A227',
  goldLight: '#E4C766',
  parchment: '#F6F1E4',
  paper: '#FFFDF8',
  ink: '#241F16',
  inkSoft: '#6b6455',
  line: '#E8E0CC',
  good: '#3F7D5C',
  warn: '#B5542B',
};

export const formatCurrency = (n: number | string) => {
  return "₹" + Number(n).toLocaleString("en-IN");
};

export const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const getInitials = (name: string) => {
  if (!name || name === "Anonymous" || name.toLowerCase() === "anonymous") return "🙏";
  const parts = name.trim().split(/\s+/);
  return ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase();
};

export const DEFAULT_CATEGORIES = ["Tithe", "Offering", "Thanksgiving", "Missions", "Building Fund", "Charity", "Youth Ministry", "Sunday School", "Special Offering", "Other"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Online", "Other"];

export const RECEIPT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
  
  * { box-sizing: border-box; }
  
  body { 
    font-family: 'Inter', sans-serif; 
    padding: 20px; 
    color: #1F2937; 
    background: #fff;
    line-height: 1.5;
  }
  .receipt-container {
    max-width: 800px;
    margin: 0 auto;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    padding: 40px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  }
  .watermark {
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 85px;
    color: rgba(27, 31, 59, 0.06); /* app indigo */
    z-index: 0;
    font-weight: 800;
    white-space: nowrap;
    pointer-events: none;
  }
  .header { 
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #C9A227; 
    padding-bottom: 20px; 
    margin-bottom: 30px; 
  }
  .header-left h1 { 
    font-family: 'Playfair Display', serif;
    font-size: 32px; 
    font-weight: 700; 
    color: #12152B; 
    margin: 0 0 5px 0; 
  }
  .header-left p { 
    font-size: 16px; 
    color: #6B7280; 
    margin: 0; 
  }
  .header-right {
    text-align: right;
  }
  .receipt-badge { 
    display: inline-block;
    background: #1B1F3B;
    color: #fff;
    padding: 8px 18px;
    border-radius: 6px;
    font-size: 18px; 
    font-weight: 600; 
    letter-spacing: 2px;
    margin-bottom: 12px;
  }
  .receipt-meta {
    font-size: 16px;
    color: #6B7280;
    margin-top: 4px;
  }
  .receipt-meta strong {
    color: #374151;
  }
  
  .acknowledgement-paragraph {
    font-size: 20px;
    line-height: 1.8;
    color: #374151;
    margin-bottom: 40px;
    background: #F9FAFB;
    padding: 30px 40px;
    border-radius: 12px;
    border: 1px solid #E5E7EB;
    text-align: center;
  }
  .highlight-text {
    color: #C9A227;
    font-size: 26px;
    font-weight: 700;
    font-family: 'Playfair Display', serif;
  }
  .highlight-name {
    color: #111827;
    font-size: 24px;
    font-weight: 700;
  }
  
  .details-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 40px;
  }
  .details-table th {
    text-align: left;
    padding: 14px 15px;
    background: #F3F4F6;
    color: #4B5563;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 6px 0 0 6px;
  }
  .details-table th:last-child {
    border-radius: 0 6px 6px 0;
  }
  .details-table td {
    padding: 18px 15px;
    border-bottom: 1px solid #E5E7EB;
    color: #1F2937;
    font-size: 18px;
  }
  
  .signatures {
    display: flex;
    justify-content: flex-end;
    margin-top: 60px;
  }
  .signature-block {
    text-align: center;
    min-width: 200px;
    width: max-content;
  }
  .signature-name {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    color: #1B1F3B;
    font-style: italic;
    white-space: nowrap;
    border-bottom: 1px solid #9CA3AF;
    padding-bottom: 5px;
    margin-bottom: 8px;
    min-height: 40px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .signature-text {
    font-size: 17px;
    color: #6B7280;
  }
  
  .footer { 
    margin-top: 50px; 
    text-align: center; 
    font-size: 18px; 
    color: #1B1F3B; 
    border-top: 1px dashed #E5E7EB; 
    padding-top: 30px; 
    font-weight: 600;
    background: rgba(201, 162, 39, 0.08);
    padding-bottom: 30px;
    border-radius: 12px;
  }
  .footer p {
    margin: 5px 0;
  }
  .footer-heart {
    color: #EF4444;
  }
`;

export const getDonationReceiptHTML = (donation: any, authorizerName: string) => {
  return `
      <html>
        <head>
          <style>${RECEIPT_CSS}</style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="watermark">CHURCH OF GOD</div>
            
            <div class="header">
              <div class="header-left">
                <h1>Church of God</h1>
                <p>brothersinchrist@gmail.com</p>
              </div>
              <div class="header-right">
                <div class="receipt-badge">RECEIPT</div>
                <div class="receipt-meta">Receipt No: <strong>${(donation.id || '').replace('DON-', 'COG-')}</strong></div>
                <div class="receipt-meta">Date: <strong>${formatDate(donation.date)}</strong></div>
              </div>
            </div>
            
            <div class="acknowledgement-paragraph">
              We gratefully acknowledge the receipt of <span class="highlight-text">${formatCurrency(donation.amount)}</span> 
              from <span class="highlight-name">${(donation.userName || donation.name) === 'Anonymous' || !(donation.userName || donation.name) ? 'Unknown Donor' : (donation.userName || donation.name)}</span> 
              as a generous contribution towards <strong>${donation.category || donation.type || 'Donation'}</strong>.
            </div>
            
            <table class="details-table">
              <thead>
                <tr>
                  <th>Donation Type</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${donation.category || donation.type || 'Donation'}</strong></td>
                  <td>${donation.method || donation.paymentMethod || 'Online'} ${donation.ref && donation.ref !== '—' ? '<br/><span style="font-size:14px;color:#6B7280;">Ref: ' + donation.ref + '</span>' : ''}</td>
                  <td><strong>${formatCurrency(donation.amount)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            ${donation.purpose ? `
            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h3 style="font-size: 13px; color: #6B7280; margin: 0 0 5px 0; text-transform: uppercase;">Purpose / Notes</h3>
              <p style="margin: 0; color: #374151;">${donation.purpose}</p>
            </div>
            ` : ''}
            
            <div class="signatures">
              <div class="signature-block">
                <div class="signature-name">${authorizerName}</div>
                <div class="signature-text">Authorized Administrator</div>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your generous donation to the Church of God.</p>
              <p>Your faithful giving helps us continue our mission and serve the community. <span class="footer-heart">♥</span></p>
            </div>
          </div>
        </body>
      </html>
    `;
};

export const generateDonationReceipt = async (donation: any, share: boolean = false, authorizerName: string = 'Authorized Signature') => {
  try {
    const html = getDonationReceiptHTML(donation, authorizerName);
    const { uri } = await Print.printToFileAsync({ html });
    
    const safeName = (donation.name === 'Anonymous' ? 'UnknownDonor' : donation.name || '').replace(/[^a-zA-Z0-9]/g, '');
    const safeType = (donation.type || '').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `COG-${safeName}-${safeType}.pdf`;
    const newUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri
    });

    if (share) {
      // Share the PDF via system share sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Donation Receipt',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } else {
      // Download — save to device Downloads folder
      if (Platform.OS === 'android') {
        try {
          // Request media library permission first
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            // Fallback to share sheet if permission denied
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Save Donation Receipt' });
            }
            return;
          }

          // Use StorageAccessFramework to save PDF to Downloads
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
            'content://com.android.externalstorage.documents/document/primary%3ADownload'
          );

          if (permissions.granted) {
            // Write directly to the user-chosen directory
            const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/pdf'
            );
            const base64 = await FileSystem.readAsStringAsync(newUri, { encoding: FileSystem.EncodingType.Base64 });
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Downloaded! ✅', `Receipt saved as "${fileName}" to your Downloads folder.`);
          } else {
            // User cancelled directory picker — fallback to share
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Save Donation Receipt' });
            }
          }
        } catch (androidErr) {
          console.warn('SAF save failed, falling back to share:', androidErr);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Save Donation Receipt' });
          }
        }
      } else {
        // iOS — use share sheet to save to Files
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Donation Receipt',
            UTI: 'com.adobe.pdf'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error generating receipt:', error);
    Alert.alert('Error', 'Failed to generate receipt PDF.');
  }
};

export const getBulkDonationReceiptHTML = (donations: any[], type: string, authorizerName: string) => {
  const totalAmount = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  
  const date = new Date().toISOString();

  const tableRows = donations.map((d: any) => {
    const donorName = d.userName || d.name;
    const displayName = (donorName === 'Anonymous' || !donorName) ? 'Unknown Donor' : donorName;
    const displayMethod = d.method || d.paymentMethod || 'Online';
    return `
    <tr>
      <td><strong>${displayName}</strong></td>
      <td>${displayMethod} ${d.ref && d.ref !== '—' ? '<br/><span style="font-size:14px;color:#6B7280;">Ref: ' + d.ref + '</span>' : ''}</td>
      <td><strong>${formatCurrency(d.amount)}</strong></td>
    </tr>
  `}).join('');

  return `
      <html>
        <head>
          <style>${RECEIPT_CSS}</style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="watermark">CHURCH OF GOD</div>
            
            <div class="header">
              <div class="header-left">
                <h1>Church of God</h1>
                <p>brothersinchrist@gmail.com</p>
              </div>
              <div class="header-right">
                <div class="receipt-badge" style="background: #C9A227;">${type.toUpperCase()} RECEIPT</div>
                <div class="receipt-meta">Type: <strong>${type}</strong></div>
                <div class="receipt-meta">Date: <strong>${formatDate(date)}</strong></div>
              </div>
            </div>
            
            <div class="acknowledgement-paragraph">
              We gratefully acknowledge the collective receipt of <span class="highlight-text">${formatCurrency(totalAmount)}</span> 
              from our <span class="highlight-name">beloved congregation</span> 
              as a generous contribution towards <strong>${type}</strong>.
            </div>
            
            <table class="details-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                <tr style="background-color: #F9FAFB;">
                  <td colspan="2" style="text-align: right; padding-right: 20px;"><strong>Total Amount</strong></td>
                  <td><strong style="color: #C9A227; font-size: 20px;">${formatCurrency(totalAmount)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <div class="signatures">
              <div class="signature-block">
                <div class="signature-name">${authorizerName}</div>
                <div class="signature-text">Authorized Administrator</div>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your generous donations to the Church of God.</p>
              <p>Your faithful giving helps us continue our mission and serve the community. <span class="footer-heart">♥</span></p>
            </div>
          </div>
        </body>
      </html>
    `;
};

export const generateBulkDonationReceipt = async (donations: any[], type: string, share: boolean = false, authorizerName: string = 'Authorized Signature') => {
  try {
    const html = getBulkDonationReceiptHTML(donations, type, authorizerName);
    const { uri } = await Print.printToFileAsync({ html });
    
    const safeType = (type || '').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `COG-Bulk-${safeType}.pdf`;
    const newUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri
    });

    if (share) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Bulk Donation Receipt',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } else {
      if (Platform.OS === 'ios') {
          await Sharing.shareAsync(newUri);
      } else {
          await Print.printAsync({ uri: newUri });
      }
    }
  } catch (error) {
    console.error('Error generating bulk receipt:', error);
    Alert.alert('Error', 'Failed to generate bulk receipt PDF.');
  }
};


/**
 * Utility to parse raw backend, API, and platform errors into user-friendly, professional messages.
 */
export function getFriendlyErrorMessage(error: any): { title: string; message: string } {
  if (!error) {
    return {
      title: 'Unexpected Error',
      message: 'An unknown error occurred. Please try again later.'
    };
  }

  // Extract raw message string
  const rawMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.code || JSON.stringify(error));

  // If the error is a plain, human-readable validation message (no slashes, no colons, no braces)
  // show it directly rather than falling through to a generic message.
  if (typeof error === 'string' && !error.includes('/') && !error.includes('{') && error.length < 200) {
    return { title: 'Please Check', message: error };
  }

  const lowerMsg = rawMessage.toLowerCase();

  // 1. Firebase Authentication Errors
  if (lowerMsg.includes('auth/user-not-found') || lowerMsg.includes('auth/wrong-password') || lowerMsg.includes('invalid-credential')) {
    return {
      title: 'Authentication Failed',
      message: 'Invalid email address or password. Please check your credentials and try again.'
    };
  }
  if (lowerMsg.includes('auth/email-already-in-use')) {
    return {
      title: 'Account Exists',
      message: 'An account has already been registered with this email address.'
    };
  }
  if (lowerMsg.includes('auth/network-request-failed') || lowerMsg.includes('network request failed')) {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to the server. Please verify your internet connection and try again.'
    };
  }
  if (lowerMsg.includes('auth/too-many-requests')) {
    return {
      title: 'Account Temporarily Locked',
      message: 'Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.'
    };
  }
  if (lowerMsg.includes('auth/invalid-email')) {
    return {
      title: 'Invalid Email',
      message: 'Please enter a properly formatted email address (e.g., pastor@church.com).'
    };
  }
  if (lowerMsg.includes('auth/weak-password')) {
    return {
      title: 'Weak Password',
      message: 'For security, your password must be at least 6 characters long.'
    };
  }

  // 2. Groq / Gemini AI API Errors
  if (lowerMsg.includes('groq') || lowerMsg.includes('gemini') || lowerMsg.includes('extraction failed')) {
    if (lowerMsg.includes('429') || lowerMsg.includes('quota') || lowerMsg.includes('rate-limit') || lowerMsg.includes('limit exceeded')) {
      return {
        title: 'Assistant Busy',
        message: 'The AI Assistant is currently receiving high volume. Please wait a moment and try speaking again.'
      };
    }
    if (lowerMsg.includes('404') || lowerMsg.includes('not found') || lowerMsg.includes('500') || lowerMsg.includes('503')) {
      return {
        title: 'AI Service Offline',
        message: 'Our AI servers are undergoing routine maintenance. Please try again in a few minutes.'
      };
    }
    return {
      title: 'Assistant Connection Error',
      message: 'We experienced an interruption speaking with the AI service. Please try again.'
    };
  }

  // 3. Salesforce API & Sync Errors
  if (lowerMsg.includes('duplicates_detected') || lowerMsg.includes('use one of these records')) {
    return {
      title: 'Duplicate Found',
      message: 'A member with this name or phone number already exists in our records.'
    };
  }

  if (lowerMsg.includes('salesforce') || lowerMsg.includes('contactexists') || lowerMsg.includes('donation')) {
    return {
      title: 'Database Synchronization',
      message: 'We are currently updating our member database. Your request has been queued and will refresh shortly.'
    };
  }

  // 4. General Network and Timeout Errors
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out') || lowerMsg.includes('network error')) {
    return {
      title: 'Network Timeout',
      message: 'The request took too long to complete. Please ensure you have a stable network connection and try again.'
    };
  }

  // Default professional fallback
  return {
    title: 'Action Incomplete',
    message: 'An unexpected issue occurred. We have logged this event and are investigating. Please try again.'
  };
}

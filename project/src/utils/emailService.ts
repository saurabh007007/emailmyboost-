interface SendEmailParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: File[];
  senderEmail?: string;
  appPassword?: string;
}

interface EmailStats {
  sent: number;
  total: number;
  failed: number;
  opened: number;
}

let emailStats: EmailStats = {
  sent: 0,
  total: 0,
  failed: 0,
  opened: 0
};

export const getEmailStats = () => emailStats;

export const updateEmailStats = (stats: Partial<EmailStats>) => {
  emailStats = { ...emailStats, ...stats };
};

export async function sendEmail({ to, cc, bcc, subject, html, attachments = [], senderEmail, appPassword }: SendEmailParams) {
  try {
    emailStats.total++;
    
    const formData = new FormData();
    formData.append('to', to);
    if (cc && cc.trim()) formData.append('cc', cc.trim());
    if (bcc && bcc.trim()) formData.append('bcc', bcc.trim());
    formData.append('subject', subject);
    formData.append('html', html);
    if (senderEmail) formData.append('senderEmail', senderEmail);
    if (appPassword) formData.append('appPassword', appPassword);
    
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });

    console.log('Sending email request to server...');

    const response = await fetch('/api/send-email', {
      method: 'POST',
      body: formData,
    });

    console.log('Server response status:', response.status);
    console.log('Server response headers:', response.headers);

    // Check if response is ok first
    if (!response.ok) {
      console.error('Server returned error status:', response.status);
      
      // Try to get error message from response
      let errorMessage = `Server error: ${response.status}`;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          // If not JSON, try to get text
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        // Use default error message
      }
      
      emailStats.failed++;
      throw new Error(errorMessage);
    }

    // Check if response has content
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      console.error('Server returned empty response');
      emailStats.failed++;
      throw new Error('Server returned empty response');
    }

    // Try to parse JSON response
    let result;
    try {
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server');
      }
      
      result = JSON.parse(responseText);
      console.log('Parsed response:', result);
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      emailStats.failed++;
      throw new Error('Invalid response format from server');
    }

    // Check if the result indicates success
    if (!result.success) {
      emailStats.failed++;
      throw new Error(result.error || 'Email sending failed');
    }

    emailStats.sent++;
    updateEmailStats({ sent: emailStats.sent });
    console.log('Email sent successfully:', result);
    
    return { 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    };
    
  } catch (error) {
    emailStats.failed++;
    updateEmailStats({ failed: emailStats.failed });
    console.error('Error in sendEmail function:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function sendBulkEmails(recipients: Array<{ [key: string]: string }>, subject: string, html: string, attachments: File[] = [], senderEmail?: string, appPassword?: string, cc?: string, bcc?: string) {
  emailStats = { sent: 0, total: recipients.length, failed: 0, opened: 0 };
  updateEmailStats(emailStats);
  
  const results = await Promise.all(
    recipients.map(async (recipient) => {
      try {
        const result = await sendEmail({
          to: recipient.email,
          cc,
          bcc,
          subject: subject,
          html: html,
          attachments,
          senderEmail,
          appPassword
        });
        return result;
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })
  );

  const summary = {
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    total: results.length
  };

  updateEmailStats({
    sent: summary.success,
    failed: summary.failed,
    total: summary.total
  });

  return summary;
}
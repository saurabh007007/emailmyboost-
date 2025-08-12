import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Loader, User, CheckCircle, AlertCircle, Copy, Users } from 'lucide-react';
import { replacePlaceholders } from '../utils/fileProcessing';
import { sendEmail } from '../utils/emailService';
import FeedbackForm from './FeedbackForm';

interface EmailPreviewProps {
  subject: string;
  content: string;
  recipient: { [key: string]: string };
  attachments: File[];
  onClose: () => void;
  recipients: Array<{ [key: string]: string }>;
  senderEmail: string;
  appPassword?: string;
  ccEmails?: string;
  bccEmails?: string;
}

export function EmailPreview({
  subject,
  content,
  recipient,
  attachments,
  onClose,
  recipients,
  senderEmail,
  appPassword,
  ccEmails = '',
  bccEmails = ''
}: EmailPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{sent: number, total: number, current: string}>({
    sent: 0,
    total: 0,
    current: ''
  });

  const currentRecipient = recipients[currentIndex];
  const processedContent = replacePlaceholders(content, currentRecipient);
  
  // const processedSubject = subject ? replacePlaceholders(subject, currentRecipient) : 'Message from MyEmailBoost';


  const processedCc = ccEmails ? replacePlaceholders(ccEmails, currentRecipient) : '';
  const processedBcc = bccEmails ? replacePlaceholders(bccEmails, currentRecipient) : '';

  // Clean subject from image tags and symbols for display
  const cleanSubjectForDisplay = (subjectText: string) => {
    if (!subjectText) return '';
    
    // Remove HTML img tags and any image-related content
    let cleaned = subjectText.replace(/<img[^>]*>/gi, '');
    
    // Remove any remaining HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Remove common image symbols and emojis
    cleaned = cleaned.replace(/[📷📸🖼️🎨🖌️🎭]/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };



   const getRecipientName = (recipient: { [key: string]: string }) => {
    const nameFields = ['name', 'Name', 'NAME', 'first_name', 'firstName', 'First Name', 'FIRST_NAME'];
    for (const field of nameFields) {
      if (recipient[field] && recipient[field].trim()) {
        return recipient[field].trim();
      }
    }
    const email = recipient.email || recipient.Email || recipient.EMAIL || '';
    return email ? email.split('@')[0] : 'Unknown';
  };

  const recipientDetails = Object.entries(currentRecipient).filter(([key]) =>
    key !== 'email' &&
    key !== 'Email' &&
    key !== 'EMAIL' &&
    !key.toLowerCase().includes('image') &&
    !key.toLowerCase().includes('ss') &&
    !key.toLowerCase().includes('photo')
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


    const clientName = getRecipientName(currentRecipient);

const clientTraffic =
  recipientDetails.find(([key]) =>
    key.toLowerCase().includes("client traffic")
  )?.[1] || "N/A";

const competitorName =
  recipientDetails.find(([key]) =>
    key.toLowerCase().includes("competitor website")
  )?.[1] || "N/A";

const competitorTraffic =
  recipientDetails.find(([key]) =>
    key.toLowerCase().includes("competitor traffic")
  )?.[1] || "N/A";

  //  const processedSubject = `${clientName}: ${clientTraffic} organic visitors || ${competitorName}: ${competitorTraffic} organic visitors`; 


const csvFiles = attachments?.filter(file =>
  file.name.trim().toLowerCase().endsWith('.csv') ||
  file.name.trim().toLowerCase().endsWith('.xlsx')
) || [];

const templateFiles = attachments?.filter(file =>
  file.name.trim().toLowerCase().endsWith('.docx') ||
  file.name.trim().toLowerCase().endsWith('.txt') ||
  file.name.trim().toLowerCase().endsWith('.csv')
) || [];

const hasRecipientCSV = csvFiles.length > 0;
const hasTemplate = templateFiles.length > 0 || csvFiles.length > 1;

const isTemplateUpload = hasRecipientCSV && hasTemplate;


// 2. Construct dynamic subject for uploaded template
const dynamicSubjectFromCSV = `${clientName}: ${clientTraffic} organic visitors || ${competitorName}: ${competitorTraffic} organic visitors`;


// 3. Final subject logic:
let processedSubject = isTemplateUpload
  ? dynamicSubjectFromCSV  // Upload Template → use CSV-based subject
  : subject || 'Message from MyEmailBoost'; // Manual Template → use input subject


  if(attachments.length < 2) {
  processedSubject = subject || 'Message from MyEmailBoost';
}

  const displaySubject = cleanSubjectForDisplay(processedSubject);


  const handleSendAll = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    setSendingProgress({ sent: 0, total: recipients.length, current: '' });

    console.log('🚀 Starting bulk email send with credentials:');
    console.log('- Sender Email:', senderEmail);
    console.log('- App Password provided:', !!appPassword);
    console.log('- App Password length:', appPassword?.length || 0);
    console.log('- Recipients count:', recipients.length);
    console.log('- Template subject:', subject);

    try {
      let successCount = 0;
      let failureCount = 0;
      const failures: string[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const recipientEmail = recipient.email || recipient.Email || recipient.EMAIL || '';
        
        setSendingProgress({ 
          sent: i, 
          total: recipients.length, 
          current: recipientEmail 
        });

        try {
          const finalContent = replacePlaceholders(content, recipient);
          //const finalSubject = subject ? replacePlaceholders(subject, recipient) : 'Message from MyEmailBoost';
          const finalSubject = processedSubject;
          const finalCc = ccEmails ? replacePlaceholders(ccEmails, recipient) : '';
          const finalBcc = bccEmails ? replacePlaceholders(bccEmails, recipient) : '';
          
          console.log(`📧 Sending bulk email ${i + 1}/${recipients.length}:`);
          console.log('- To:', recipientEmail);
          console.log('- From:', senderEmail);
          console.log('- Subject:', finalSubject);
          console.log('- Using App Password:', !!appPassword);
          
          const result = await sendEmail({
            to: recipientEmail,
            cc: finalCc,
            bcc: finalBcc,
            subject: finalSubject,
            html: finalContent,
            attachments:[],
            senderEmail: senderEmail,
            appPassword: appPassword
          });

          if (result.success) {
            successCount++;
            console.log(`✅ Email ${i + 1} sent successfully to ${recipientEmail}`);
          } else {
            failureCount++;
            failures.push(`${recipientEmail}: ${result.error}`);
            console.error(`❌ Email ${i + 1} failed to ${recipientEmail}:`, result.error);
          }
        } catch (err: any) {
          failureCount++;
          failures.push(`${recipientEmail}: ${err.message}`);
          console.error(`❌ Error sending email ${i + 1} to ${recipientEmail}:`, err);
        }

        // Small delay between emails to avoid rate limiting
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setSendingProgress({ sent: recipients.length, total: recipients.length, current: '' });

      if (successCount > 0) {
        setSuccess(`Successfully sent ${successCount} out of ${recipients.length} emails from your Gmail account: ${senderEmail}!`);
        if (successCount === recipients.length) {
          setShowFeedback(true);
        }
      }

      if (failureCount > 0) {
        setError(`${failureCount} emails failed to send. ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '...' : ''}`);
      }

    } catch (err: any) {
      setError('Failed to send emails: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setError(null);
    setSuccess(null);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < recipients.length - 1 ? prev + 1 : prev));
    setError(null);
    setSuccess(null);
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      
      const recipientEmail = currentRecipient.email || currentRecipient.Email || currentRecipient.EMAIL || '';
      
      // Process the subject and content with placeholders for this specific recipient
      // const finalSubject = subject ? replacePlaceholders(subject, currentRecipient) : 'Message from MyEmailBoost';
      const finalSubject = processedSubject;
      const finalContent = replacePlaceholders(content, currentRecipient);
      const finalCc = ccEmails ? replacePlaceholders(ccEmails, currentRecipient) : '';
      const finalBcc = bccEmails ? replacePlaceholders(bccEmails, currentRecipient) : '';
      
      console.log('📧 Sending single email with credentials:');
      console.log('- To:', recipientEmail);
      console.log('- From:', senderEmail);
      console.log('- Subject being sent:', finalSubject);
      console.log('- Content length:', finalContent.length);
      console.log('- Using App Password:', !!appPassword);
      console.log('- App Password length:', appPassword?.length || 0);
      
      const result = await sendEmail({
        to: recipientEmail,
        cc: finalCc,
        bcc: finalBcc,
        subject: finalSubject,
        html: finalContent,
        attachments:[],
        senderEmail: senderEmail,
        appPassword: appPassword
      });
      
      if (result.success) {
        setSuccess(`Email sent successfully to ${recipientEmail} from your Gmail account: ${senderEmail}`);
        setShowFeedback(true);
        console.log('✅ Single email sent successfully');
      } else {
        setError(result.error || 'Failed to send email');
        console.error('❌ Single email failed:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
      console.error('❌ Single email error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    try {
      // Send feedback to the specified Gmail address using the hardcoded credentials
      await sendEmail({
        to: 'reyaanmazhar@gmail.com',
        subject: 'User Feedback - MyEmailBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                📧 New Feedback Received - MyEmailBoost
              </h2>
              
              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 10px;">⭐ Rating</h3>
                <div style="font-size: 24px; color: #fbbf24;">
                  ${'★'.repeat(rating)}${'☆'.repeat(5-rating)} (${rating}/5 stars)
                </div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 10px;">💬 User Comment</h3>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                  <p style="margin: 0; line-height: 1.6; color: #4b5563;">${comment || 'No comment provided'}</p>
                </div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 10px;">👤 User Information</h3>
                <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0 0 8px 0; color: #065f46;"><strong>Email:</strong> ${senderEmail}</p>
                  <p style="margin: 0; color: #065f46;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This feedback was automatically sent from MyEmailBoost application
                </p>
              </div>
            </div>
          </div>
        `,
        senderEmail: 'reyaanmazhar@gmail.com',
        appPassword: 'nzycdobyeifxirw' // Using the provided app password
      });
      
      setShowFeedback(false);
      setSuccess('Thank you for your feedback! Your response has been sent successfully.');
    } catch (error) {
      console.error('Failed to send feedback:', error);
      setError('Failed to send feedback. Please try again later.');
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Email Preview {recipients.length > 1 && `(${currentIndex + 1}/${recipients.length})`}</span>
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(95vh-8rem)]">
          {/* Status Messages */}
          {(error || success) && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 ${
              error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {error ? <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              <div className="flex-1">
                <p className="font-medium">{error ? 'Error' : 'Success'}</p>
                <p className="text-sm mt-1">{error || success}</p>
              </div>
            </div>
          )}

          {/* Sending Progress */}
          {sending && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Sending emails from {senderEmail}... {sendingProgress.sent}/{sendingProgress.total}
                  </p>
                  {sendingProgress.current && (
                    <p className="text-xs text-blue-600 mt-1">
                      Current: {sendingProgress.current}
                    </p>
                  )}
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(sendingProgress.sent / sendingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showFeedback && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <FeedbackForm onSubmit={handleFeedbackSubmit} />
            </div>
          )}

          {/* Sender Authentication Info */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="bg-green-500 rounded-full p-2">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-green-800">✅ Authenticated Gmail Sender</h4>
                <p className="text-sm text-green-700">
                  All emails will be sent from your Gmail account: <span className="font-medium">{senderEmail}</span>
                  {appPassword && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">App Password Verified ✓</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Email Headers */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3 border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">From:</span>
                <span className="text-sm text-gray-900 font-medium">{senderEmail}</span>
                <button 
                  onClick={() => copyToClipboard(senderEmail)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">To:</span>
                <span className="text-sm text-gray-900 font-medium">{currentRecipient.email}</span>
                <button 
                  onClick={() => copyToClipboard(currentRecipient.email)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* CC and BCC Fields */}
            {(processedCc || processedBcc) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                {processedCc && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">CC:</span>
                    <span className="text-sm text-gray-900">{processedCc}</span>
                    <button 
                      onClick={() => copyToClipboard(processedCc)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {processedBcc && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">BCC:</span>
                    <span className="text-sm text-gray-900">{processedBcc}</span>
                    <button 
                      onClick={() => copyToClipboard(processedBcc)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2 border-t">
              <span className="text-sm font-medium text-gray-500">Name:</span>
              <span className="text-sm text-gray-900 font-medium">{getRecipientName(currentRecipient)}</span>
            </div>
            

      {/* Subject Preview at Top */}
<div className="pt-2">
  <span className="text-sm font-medium text-gray-500">Subject Preview:</span>
  <div className="text-sm text-gray-900 font-semibold mt-1">
    {clientName}: {clientTraffic} organic visitors || {competitorName}: {competitorTraffic} organic visitors
  </div>
</div>


            {recipientDetails.length > 0 && (
              <div className="pt-3 border-t">
                <span className="text-sm font-medium text-gray-500 mb-3 block">Recipient Details:</span>
                <div className="grid grid-cols-3 gap-3">
                  {recipientDetails.map(([key, value]) => (
                    <div key={key} className="text-sm bg-white p-3 rounded border">
                      <span className="font-medium text-gray-500 capitalize">{key.replace(/[_-]/g, ' ')}: </span>
                      <span className="text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Content */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="p-4">
                <div className="text-sm font-semibold text-blue-800 mb-3 uppercase tracking-wide">Email Content</div>
                {displaySubject && (
                  <div className="text-lg font-bold text-gray-900 leading-relaxed bg-white p-3 rounded border shadow-sm mb-4">
                    <span className="text-sm text-gray-500 block mb-1">Subject:</span>
                    {displaySubject}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 p-6 rounded border">
                <div
                  className="prose prose-lg max-w-none email-content"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    lineHeight: '1.6',
                    color: '#374151'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Attachments */}
          {false&&attachments.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Attachments ({attachments.length})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded border">
                    <span className="text-blue-600 text-lg">📎</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              {recipients.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0 || sending}
                    className="flex items-center gap-2 text-gray-600 disabled:opacity-50 px-3 py-2 rounded hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === recipients.length - 1 || sending}
                    className="flex items-center gap-2 text-gray-600 disabled:opacity-50 px-3 py-2 rounded hover:bg-gray-200 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex space-x-4">
              {recipients.length > 1 && (
                <button
                  onClick={handleSendAll}
                  disabled={sending}
                  className="flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending All from {senderEmail}...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send All ({recipients.length}) from Gmail
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {sending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending from Gmail...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send from Gmail
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
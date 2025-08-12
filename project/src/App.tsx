import React, { useState, useEffect, useRef } from 'react';
import { Mail, AlertTriangle, CheckCircle, FileSpreadsheet, LogOut, User, X, Plus, Minus } from 'lucide-react';
import { processTemplate, processRecipients } from './utils/fileProcessing';
import { EmailPreview } from './components/EmailPreview';
import { GoogleAuth } from './components/GoogleAuth';
import { Footer } from './components/Footer';
import { getEmailStats } from './utils/emailService';
import img from "./Logo.jpg";
import FeedbackForm from "./components/FeedbackForm"

interface UserProfile {
  email: string;
  name: string;
  picture: string;
  appPassword?: string;
}

function App() {
  const [templateType, setTemplateType] = useState('manual');
  const [editorContent, setEditorContent] = useState('');
  const [recipients, setRecipients] = useState<Array<{ [key: string]: string }>>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ [key: string]: string } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [emailStats, setEmailStats] = useState(getEmailStats());
  
  const editorRef = useRef<HTMLDivElement>(null);

   const [csvFile, setCsvFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  // ... other useStates

  // ✅ Auto-update attachments based on template type and uploaded files
  useEffect(() => {
    if (templateType === 'manual' && csvFile) {
      setAttachments([csvFile]);
    } else if (templateType === 'upload' && csvFile && templateFile) {
      setAttachments([csvFile, templateFile]);
    } else {
      setAttachments([]);
    }
  }, [templateType, csvFile, templateFile]);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }

    // Update email stats every second
    const interval = setInterval(() => {
      setEmailStats(getEmailStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const placeholders = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'company', label: 'Company' },
    { value: 'position', label: 'Position' },
    { value: 'phone', label: 'Phone' },
    { value: 'image', label: 'Image' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'country', label: 'Country' },
    { value: 'Client business name', label: 'Client Business Name' },
    { value: 'Client traffic', label: 'Client Traffic' },
    { value: 'Competitor business name', label: 'Competitor Business Name' },
    { value: 'Competitor traffic', label: 'Competitor Traffic' },
    { value: 'custom', label: 'Custom Field' }
  ];

  const handleLogin = (userProfile: UserProfile) => {
    setUser(userProfile);
    setIsAuthenticated(true);
    setShowSignup(false);
    localStorage.setItem('user', JSON.stringify(userProfile));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  const handlePlaceholderInsert = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      const placeholder = `{{${value}}}`;
      
      // Check if subject input is focused (only for manual template)
      const subjectInput = document.getElementById('email-subject') as HTMLInputElement;
      const ccInput = document.getElementById('cc-emails') as HTMLInputElement;
      const bccInput = document.getElementById('bcc-emails') as HTMLInputElement;
      
      if (templateType === 'manual' && document.activeElement === subjectInput) {
        const start = subjectInput.selectionStart || subjectInput.value.length;
        const end = subjectInput.selectionEnd || subjectInput.value.length;
        const newValue = subjectInput.value.substring(0, start) + placeholder + subjectInput.value.substring(end);
        setEmailSubject(newValue);
        
        // Set cursor position after inserted placeholder
        setTimeout(() => {
          subjectInput.focus();
          const newPosition = start + placeholder.length;
          subjectInput.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else if (document.activeElement === ccInput) {
        const start = ccInput.selectionStart || ccInput.value.length;
        const end = ccInput.selectionEnd || ccInput.value.length;
        const newValue = ccInput.value.substring(0, start) + placeholder + ccInput.value.substring(end);
        setCcEmails(newValue);
        
        setTimeout(() => {
          ccInput.focus();
          const newPosition = start + placeholder.length;
          ccInput.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else if (document.activeElement === bccInput) {
        const start = bccInput.selectionStart || bccInput.value.length;
        const end = bccInput.selectionEnd || bccInput.value.length;
        const newValue = bccInput.value.substring(0, start) + placeholder + bccInput.value.substring(end);
        setBccEmails(newValue);
        
        setTimeout(() => {
          bccInput.focus();
          const newPosition = start + placeholder.length;
          bccInput.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else {
        // Insert into content editor (only for manual template)
        if (templateType === 'manual' && editorRef.current) {
          // Focus the editor first to ensure it's active
          editorRef.current.focus();
          
          // Try to get current selection
          const selection = window.getSelection();
          
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Check if the selection is within our editor
            if (editorRef.current.contains(range.commonAncestorContainer)) {
              // Insert at cursor position
              const textNode = document.createTextNode(placeholder);
              range.deleteContents();
              range.insertNode(textNode);
              
              // Move cursor after the inserted text
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // Selection is not in editor, append to end
              editorRef.current.textContent += placeholder;
              
              // Move cursor to end
              const newRange = document.createRange();
              newRange.selectNodeContents(editorRef.current);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            // No selection, append to end and set cursor there
            editorRef.current.textContent += placeholder;
            
            // Create selection at the end
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current);
            newRange.collapse(false);
            const newSelection = window.getSelection();
            newSelection?.removeAllRanges();
            newSelection?.addRange(newRange);
          }
          
          // Update state with current content
          setEditorContent(editorRef.current.textContent || '');
          
          // Trigger input event to ensure React state is updated
          const inputEvent = new Event('input', { bubbles: true });
          editorRef.current.dispatchEvent(inputEvent);
        }
      }
    }
    e.target.value = '';
  };



 const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const template = files.find(file =>
    file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.txt')
  );

  if (template) {
    try {
      setError(null);
      const { subject, content } = await processTemplate(template);
      setEmailSubject(subject);
      setEmailContent(content);

      // ✅ Store template file
      setTemplateFile(template);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error processing template');
      console.error('Error processing template:', error);
    }
  }
};








const handleRecipientsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const file = files[0]; // Assume only one CSV file is uploaded
  try {
    setError(null);
    
    const data = await processRecipients(file);
    setRecipients(data);
    setSelectedRecipients([]);

    // ✅ Store CSV file
    setCsvFile(file);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Error processing recipients');
    console.error('Error processing recipients:', error);
  }
};


  const toggleAllRecipients = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipients.map(r => getRecipientEmail(r)));
    }
  };

  const toggleRecipient = (email: string) => {
    setSelectedRecipients(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handlePreview = (recipient: { [key: string]: string }) => {
    setSelectedRecipient(recipient);
    setShowPreview(true);
  };

  const handlePreviewAll = () => {
    setSelectedRecipient(null);
    setShowPreview(true);
  };

  const getRecipientName = (recipient: { [key: string]: string }) => {
    // Check multiple possible name fields
    const nameFields = ['name', 'Name', 'NAME', 'first_name', 'firstName', 'First Name', 'FIRST_NAME'];
    
    for (const field of nameFields) {
      if (recipient[field] && recipient[field].trim()) {
        return recipient[field].trim();
      }
    }
    
    // If no name found, return email prefix
    const email = getRecipientEmail(recipient);
    return email ? email.split('@')[0] : 'Unknown';
  };

  const getRecipientEmail = (recipient: { [key: string]: string }) => {
    return recipient.email || recipient.Email || recipient.EMAIL || '';
  };

  const handleContentInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    setEditorContent(content);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setShowSignup(true);
      return;
    }

    if (selectedRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    if (templateType === 'manual' && !editorContent.trim()) {
      setError('Please enter message content');
      return;
    }

    if (templateType === 'upload' && !emailContent.trim()) {
      setError('Please upload a template');
      return;
    }

    // Open preview with selected recipients
    const recipientsToSend = recipients.filter(r => selectedRecipients.includes(getRecipientEmail(r)));
    if (recipientsToSend.length > 0) {
      setSelectedRecipient(null);
      setShowPreview(true);
    }
  };

  // Check if user has app password for sending emails
  const canSendEmails = isAuthenticated && user?.appPassword && user.appPassword.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img src={img} alt="EmailMyBoost" className="h-14" />
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex space-x-6">
                <div className="flex items-center text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span className="ml-1 hidden md:inline">Mail Sent</span>
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {emailStats.sent}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="ml-1 hidden md:inline">Failed</span>
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {emailStats.failed}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="ml-1 hidden md:inline">Total</span>
                  <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {emailStats.total}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="ml-1 hidden md:inline">Recipients</span>
                  <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {recipients.length}
                  </span>
                </div>
              </div>
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <img 
                    src={user?.picture} 
                    alt={user?.name} 
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-700">{user?.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSignup(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Signup Modal */}
      {showSignup && !isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
            <button
              onClick={() => setShowSignup(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 z-20 p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8 pt-12">
              <GoogleAuth onLogin={handleLogin} />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center p-4">
        <form onSubmit={handleFormSubmit} className="bg-white shadow-md rounded-lg p-6 w-full max-w-3xl">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {/* Show warning if user is authenticated but doesn't have app password */}
            {isAuthenticated && !canSendEmails && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <div>
                    <strong>Gmail App Password Required</strong>
                    <p className="text-sm mt-1">
                      To send emails, you need to set up a Gmail App Password. Please sign out and sign in again with your App Password.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Template Creation Method</label>
              <select 
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={templateType}
                onChange={(e) => {
                  setTemplateType(e.target.value);
                  setEmailContent('');
                  setEmailSubject('');
                  setEditorContent('');
                }}
              >
                <option value="manual">Create Template Manually</option>
                <option value="upload">Upload Template</option>
              </select>
            </div>

            {templateType === 'upload' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Template</label>
                <div className="mt-1 flex items-center space-x-2">
                  <select 
                    className="block w-1/3 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => {
                      const input = document.getElementById('template-file') as HTMLInputElement;
                      if (input) {
                        input.accept = e.target.value;
                      }
                    }}
                  >
                    <option value=".docx,.txt,.csv">All Formats</option>
                    <option value=".docx">Word Document (.docx)</option>
                    <option value=".txt">Text File (.txt)</option>
                    <option value=".csv">CSV File (.csv)</option>
                  </select>
                  <input
                    id="template-file"
                    type="file"
                    onChange={handleTemplateUpload}
                    accept=".docx,.txt,.csv"
                    className="block w-2/3 text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Recipients</label>
              <div className="mt-1 flex items-center space-x-2">
                <select 
                  className="block w-1/3 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => {
                    const input = document.getElementById('recipients-file') as HTMLInputElement;
                    if (input) {
                      input.accept = e.target.value;
                    }
                  }}
                >
                  <option value=".csv,.xlsx">All Formats</option>
                  <option value=".csv">CSV File (.csv)</option>
                  <option value=".xlsx">Excel File (.xlsx)</option>
                </select>
                <input
                  id="recipients-file"
                  type="file"
                  onChange={handleRecipientsUpload}
                  accept=".csv,.xlsx"
                  className="block w-2/3 text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
            </div>

            {recipients.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Recipients ({recipients.length})</h3>
                  <div className="space-x-4">
                    <button
                      type="button"
                      onClick={toggleAllRecipients}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      {selectedRecipients.length === recipients.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedRecipients.length > 0 && (
                      <button
                        type="button"
                        onClick={handlePreviewAll}
                        className="text-sm text-green-500 hover:text-green-700"
                      >
                        Preview Selected ({selectedRecipients.length})
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipients.map((recipient, index) => {
                    const recipientEmail = getRecipientEmail(recipient);
                    const recipientName = getRecipientName(recipient);
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(recipientEmail)}
                            onChange={() => toggleRecipient(recipientEmail)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {recipientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{recipientName}</div>
                              <div className="text-sm text-gray-500">{recipientEmail}</div>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePreview(recipient)}
                          className="text-sm text-blue-500 hover:text-blue-700 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                        >
                          Preview
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show placeholders section only for manual template */}
            {templateType === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Available Placeholders</label>
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={handlePlaceholderInsert}
                  defaultValue=""
                >
                  <option value="" disabled>Select a placeholder to insert</option>
                  {placeholders.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Click on subject, CC, BCC, or content field first, then select a placeholder to insert it at the cursor position
                </p>
              </div>
            )}

            {/* Subject field - only shown for manual template */}
            {templateType === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  id="email-subject"
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
            )}

            {/* CC/BCC Toggle Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showCcBcc ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showCcBcc ? 'Hide' : 'Add'} CC/BCC</span>
              </button>
            </div>

            {/* CC and BCC Fields - shown when toggled */}
            {showCcBcc && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                  <label className="block text-sm font-medium text-gray-700">CC (Carbon Copy)</label>
                  <input
                    id="cc-emails"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate multiple emails with commas. Recipients can see CC addresses.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">BCC (Blind Carbon Copy)</label>
                  <input
                    id="bcc-emails"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={bccEmails}
                    onChange={(e) => setBccEmails(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate multiple emails with commas. Recipients cannot see BCC addresses.
                  </p>
                </div>
              </div>
            )}

            {/* Show content field only for manual template */}
            {templateType === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Message Content</label>
                <div className="mt-1 border rounded-md shadow-sm">
                  <div className="border-b px-3 py-2 flex space-x-2">
                    <button type="button" className="p-1 hover:bg-gray-100 rounded">
                      <strong>B</strong>
                    </button>
                    <button type="button" className="p-1 hover:bg-gray-100 rounded">
                      <em>I</em>
                    </button>
                    <button type="button" className="p-1 hover:bg-gray-100 rounded">
                      <u>U</u>
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="p-3 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    onInput={handleContentInput}
                    data-placeholder="Type your message here..."
                    style={{
                      direction: 'ltr',
                      textAlign: 'left',
                      unicodeBidi: 'plaintext'
                    }}
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Click in the content area above, then select a placeholder to insert it at your cursor position
                </p>
              </div>
            )}

            {/* Show uploaded template content for upload type */}
            {templateType === 'upload' && (emailContent || emailSubject) && (
              <div className="bg-gray-50 rounded-lg overflow-hidden border">
                <div className="bg-gray-100 px-4 py-3 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Uploaded Template Content</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Subject and content extracted from your template. Placeholders will be replaced with actual recipient data.
                  </p>
                </div>
                <div className="p-6">
                  {emailSubject && (
                    <div className="mb-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Subject Line</h4>
                        </div>
                        <div className="p-4">
                          <div className="text-gray-800 font-medium">{emailSubject}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {emailContent && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-green-50 px-4 py-3 border-b border-green-200">
                        <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Email Content</h4>
                        <p className="text-xs text-green-600 mt-1">Placeholders like {`{Client business name}`} will be replaced with real data</p>
                      </div>
                      <div className="p-4">
                        <div 
                          className="prose max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed email-content"
                          dangerouslySetInnerHTML={{ __html: emailContent }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {recipients.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-green-800 mb-2">✅ Ready to Preview</h4>
                      <p className="text-sm text-green-700">
                        Your template is loaded and recipients are ready. Click "Preview" on any recipient to see how the placeholders will be replaced with their actual data.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSendEmails || selectedRecipients.length === 0}
            >
              {!isAuthenticated 
                ? 'Please Sign In to Send Emails' 
                : !canSendEmails
                  ? 'Gmail App Password Required - Please Sign In Again'
                  : selectedRecipients.length === 0 
                    ? 'Select Recipients to Send Emails'
                    : `Send Email${selectedRecipients.length > 0 ? ` (${selectedRecipients.length})` : ''}`
              }
            </button>
          </div>
        </form>
      </div>

      {showPreview && (
        <EmailPreview
          subject={emailSubject}
          content={templateType === 'manual' ? editorContent : emailContent}
          recipient={selectedRecipient || recipients[0]}
          attachments={attachments}
          onClose={() => setShowPreview(false)}
          recipients={selectedRecipient ? [selectedRecipient] : recipients.filter(r => selectedRecipients.includes(getRecipientEmail(r)))}
          senderEmail={user?.email || ''}
          appPassword={user?.appPassword || ''}
          ccEmails={ccEmails}
          bccEmails={bccEmails}
        />
      )}
      
      <div className="max-w-md mx-auto p-4">
        <FeedbackForm onSubmit={async (rating: number, comment: string) => {
          // This will be handled by the feedback form component
          console.log('Feedback submitted:', { rating, comment });
        }} />
      </div>
      <Footer />
    </div>
  );
}

export default App;
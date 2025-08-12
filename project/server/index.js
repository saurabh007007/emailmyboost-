import express from 'express';
import { createTransport } from 'nodemailer';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint called - Server is working!');
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    greeting: 'Hello from MyEmailBoost server!' 
  });
});

// Google OAuth callback endpoint
app.post('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'No authorization code provided' 
      });
    }

    console.log('Processing OAuth callback with code:', code);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: '473322219481-tts4tm93ir1f9ql208i7052g1oq6c5v1.apps.googleusercontent.com',
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${req.get('origin') || 'http://localhost:5173'}/`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to exchange authorization code for tokens' 
      });
    }

    const tokens = await tokenResponse.json();
    
    // Get user info using the access token
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info');
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to get user information' 
      });
    }

    const userInfo = await userResponse.json();
    
    // Verify the email is verified
    if (!userInfo.verified_email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email not verified with Google' 
      });
    }

    const userProfile = {
      email: userInfo.email,
      name: userInfo.name || userInfo.given_name || userInfo.email.split('@')[0],
      picture: userInfo.picture || `https://ui-avatars.com/api/?name=${userInfo.name || userInfo.email.split('@')[0]}&background=4285f4&color=fff`,
      email_verified: userInfo.verified_email,
      id: userInfo.id
    };

    console.log('✅ Google OAuth callback successful:', userProfile.email);
    
    res.json({ 
      success: true, 
      user: userProfile 
    });

  } catch (error) {
    console.error('❌ Google OAuth callback failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process OAuth callback' 
    });
  }
});

// Google OAuth verification endpoint (for JWT tokens)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ 
        success: false, 
        error: 'No credential provided' 
      });
    }

    // Decode the JWT token to get user info
    const payload = JSON.parse(atob(credential.split('.')[1]));
    
    // Verify the token is valid (basic validation)
    if (!payload.email || !payload.email_verified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or unverified email' 
      });
    }

    const userProfile = {
      email: payload.email,
      name: payload.name || payload.given_name || payload.email.split('@')[0],
      picture: payload.picture || `https://ui-avatars.com/api/?name=${payload.name || payload.email.split('@')[0]}&background=4285f4&color=fff`,
      email_verified: payload.email_verified,
      sub: payload.sub
    };

    console.log('✅ Google OAuth verification successful:', userProfile.email);
    
    res.json({ 
      success: true, 
      user: userProfile 
    });

  } catch (error) {
    console.error('❌ Google OAuth verification failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify Google credential' 
    });
  }
});

// Helper function to create SMTP transporter with multiple configuration attempts
async function createSMTPTransporter(senderEmail, appPassword) {
  const cleanAppPassword = appPassword.replace(/[\s-]/g, '');
  const fromEmail = senderEmail.trim().toLowerCase();

  // Configuration options to try in order
  const configurations = [
    // Primary: Gmail service with secure connection
    {
      name: 'Gmail Service (Secure)',
      config: {
        service: 'gmail',
        auth: {
          user: fromEmail,
          pass: cleanAppPassword
        },
        secure: true,
        port: 465,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    },
    // Fallback 1: Gmail SMTP with STARTTLS
    {
      name: 'Gmail SMTP (STARTTLS)',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: fromEmail,
          pass: cleanAppPassword
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    },
    // Fallback 2: Gmail service with extended timeouts
    {
      name: 'Gmail Service (Extended Timeout)',
      config: {
        service: 'gmail',
        auth: {
          user: fromEmail,
          pass: cleanAppPassword
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        pool: false,
        tls: {
          rejectUnauthorized: false
        }
      }
    }
  ];

  let lastError = null;

  for (const { name, config } of configurations) {
    try {
      console.log(`🔍 Attempting SMTP connection with: ${name}`);
      const transporter = createTransport(config);
      
      // Test the connection with a timeout
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection verification timeout')), 15000)
        )
      ]);
      
      console.log(`✅ SMTP connection successful with: ${name}`);
      return transporter;
      
    } catch (error) {
      console.log(`❌ ${name} failed:`, error.message);
      lastError = error;
      continue;
    }
  }

  // If all configurations failed, throw the last error
  throw lastError || new Error('All SMTP configurations failed');
}

app.post('/api/send-email', upload.array('attachments'), async (req, res) => {
  try {
    const { to, cc, bcc, subject, html, senderEmail, appPassword } = req.body;
    
    console.log('=== EMAIL SEND REQUEST ===');
    console.log('To:', to);
    console.log('CC:', cc);
    console.log('BCC:', bcc);
    console.log('Subject:', subject);
    console.log('Sender Email:', senderEmail);
    console.log('Has App Password:', !!appPassword);
    console.log('App Password Length:', appPassword ? appPassword.length : 0);
    console.log('Attachments:', req.files?.length || 0);
    console.log('HTML Content Length:', html ? html.length : 0);
    console.log('========================');

    // Validate required fields
    if (!to) {
      console.error('❌ Missing recipient email');
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient email address is required' 
      });
    }

    if (!html && !subject) {
      console.error('❌ Missing content');
      return res.status(400).json({ 
        success: false, 
        error: 'Either subject or content is required' 
      });
    }

    // ALWAYS require user's Gmail credentials - NO FALLBACK
    if (!senderEmail || !appPassword) {
      console.log('❌ No user Gmail credentials provided');
      return res.status(400).json({ 
        success: false, 
        error: 'Please sign in with your Gmail account to send emails. User authentication is required.' 
      });
    }

    // Clean and validate app password - remove all spaces and special characters
    const cleanAppPassword = appPassword.replace(/[\s-]/g, '');
    
    console.log('🔍 Using user Gmail credentials:');
    console.log('- Sender email:', senderEmail);
    console.log('- Clean app password length:', cleanAppPassword.length);
    
    // Validate Gmail address
    if (!senderEmail.toLowerCase().includes('@gmail.com')) {
      console.error('❌ Non-Gmail address provided');
      return res.status(400).json({ 
        success: false, 
        error: 'Only Gmail addresses are supported for app password authentication. Please use a @gmail.com email address.' 
      });
    }

    // Validate app password format
    if (cleanAppPassword.length !== 16) {
      console.error('❌ Invalid app password length:', cleanAppPassword.length);
      return res.status(400).json({ 
        success: false, 
        error: `Invalid Gmail App Password length. Expected 16 characters, got ${cleanAppPassword.length}. Please generate a new App Password from your Google Account settings.` 
      });
    }

    if (!/^[a-zA-Z0-9]{16}$/.test(cleanAppPassword)) {
      console.error('❌ Invalid app password format - contains invalid characters');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Gmail App Password format. Must contain only letters and numbers (16 characters total). Please generate a new App Password.' 
      });
    }

    const fromEmail = senderEmail.trim().toLowerCase();

    // Create transporter with multiple fallback configurations
    let transporter;
    try {
      transporter = await createSMTPTransporter(senderEmail, appPassword);
    } catch (verifyError) {
      console.error('❌ All SMTP configurations failed:', verifyError);
      
      let errorMessage = 'Unable to connect to Gmail servers. ';
      
      if (verifyError.code === 'EAUTH' || verifyError.responseCode === 535) {
        errorMessage = `Gmail authentication failed for ${fromEmail}. Please check:

1. Is your App Password correct? (16 characters, no spaces)
2. Is 2-Factor Authentication enabled on your Gmail account?
3. Did you generate the App Password recently?

To fix this:
• Go to Google Account Settings → Security
• Ensure 2-Factor Authentication is enabled
• Generate a NEW App Password for MyEmailBoost
• Copy the 16-character password exactly as shown
• Try signing in again

Technical error: ${verifyError.message}`;
      } else if (verifyError.code === 'ECONNECTION' || verifyError.code === 'ETIMEDOUT') {
        errorMessage = `Connection to Gmail servers failed. This may be due to:

1. Network connectivity issues
2. Firewall blocking outbound connections
3. Gmail servers temporarily unavailable

Please try again in a few moments. If the problem persists, check your internet connection.

Technical error: ${verifyError.message}`;
      } else if (verifyError.message.includes('timeout')) {
        errorMessage = `Connection timeout while connecting to Gmail. This usually indicates:

1. Network connectivity issues
2. Firewall restrictions
3. Server overload

Please try again in a few moments.

Technical error: ${verifyError.message}`;
      } else {
        errorMessage += `Connection error: ${verifyError.message}`;
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: verifyError.message,
        code: verifyError.code,
        responseCode: verifyError.responseCode
      });
    }

    // Enhanced subject and content handling
    const finalSubject = subject || 'Message from MyEmailBoost';
    const finalHtml = html || '<p>This email was sent via MyEmailBoost.</p>';

    // Prepare email options - ALWAYS use logged-in user's email
    const mailOptions = {
      from: `"${fromEmail.split('@')[0]}" <${fromEmail}>`,
      to: to.trim(),
      cc: cc && cc.trim() ? cc.trim() : undefined,
      bcc: bcc && bcc.trim() ? bcc.trim() : undefined,
      subject: finalSubject,
      html: finalHtml,
      attachments: req.files?.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })) || [],
      headers: {
        'X-Mailer': 'MyEmailBoost v1.0',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal'
      }
    };

    console.log('=== SENDING EMAIL FROM USER ACCOUNT ===');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('CC:', mailOptions.cc);
    console.log('BCC:', mailOptions.bcc);
    console.log('Subject:', mailOptions.subject);
    console.log('HTML Length:', mailOptions.html.length);
    console.log('Attachments:', mailOptions.attachments.length);
    console.log('==========================================');

    // Send the email with timeout protection
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
      )
    ]);

    console.log('✅ Email sent successfully from user account!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Sent from:', fromEmail);
    
    // Enhanced success response - ALWAYS return JSON
    const successResponse = { 
      success: true, 
      messageId: info.messageId,
      response: info.response,
      from: fromEmail,
      to: to,
      cc: cc || null,
      bcc: bcc || null,
      subject: finalSubject,
      greeting: `Email sent successfully from your Gmail account: ${fromEmail}!`
    };

    console.log('📤 Sending success response:', successResponse);
    res.json(successResponse);

  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Enhanced error handling with specific Gmail error codes
    let userFriendlyMessage = 'Failed to send email. ';

    if (error.code === 'EAUTH' || error.responseCode === 535) {
      userFriendlyMessage = `Gmail authentication failed. This usually means:

1. You're using your regular Gmail password instead of an App Password
2. Your App Password is incorrect, expired, or has spaces/dashes
3. 2-Factor Authentication is not properly enabled

To fix this:
• Sign out and sign in again with your Gmail account
• Ensure you're using the 16-character App Password (not your regular password)
• Generate a new App Password if needed
• Make sure 2-Factor Authentication is enabled

Error: ${error.message}`;
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      userFriendlyMessage = `Connection to Gmail servers failed. This may be due to:

1. Network connectivity issues
2. Temporary server unavailability
3. Firewall restrictions

Please try again in a few moments. If the problem persists, check your internet connection.

Error: ${error.message}`;
    } else if (error.message.includes('timeout')) {
      userFriendlyMessage = `Email sending timed out. This can happen due to:

1. Large attachments taking too long to upload
2. Network connectivity issues
3. Server overload

Please try again with smaller attachments or check your connection.

Error: ${error.message}`;
    } else if (error.responseCode === 550) {
      userFriendlyMessage = 'Email rejected by recipient server. Please check the recipient email address.';
    } else if (error.code === 'EMESSAGE') {
      userFriendlyMessage = 'Invalid email content. Please check your message format.';
    } else if (error.responseCode === 554) {
      userFriendlyMessage = 'Email rejected as spam. Please check your content and try again.';
    } else {
      userFriendlyMessage += error.message;
    }

    const errorResponse = { 
      success: false, 
      error: userFriendlyMessage,
      details: error.message,
      code: error.code,
      responseCode: error.responseCode
    };

    console.log('📤 Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check called');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    greeting: 'MyEmailBoost server is healthy and ready!'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service ready - Uses user-provided Gmail credentials only`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👋 Greeting: Server started successfully!`);
  console.log(`🌐 Test the server at: http://localhost:${PORT}/api/test`);
  console.log(`🏥 Health check at: http://localhost:${PORT}/api/health`);
});
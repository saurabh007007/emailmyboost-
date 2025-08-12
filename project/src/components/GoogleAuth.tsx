import React, { useEffect, useState } from 'react';
import { Mail, Eye, EyeOff, AlertCircle, ExternalLink, Shield, Key, CheckCircle, Loader } from 'lucide-react';

interface UserProfile {
  email: string;
  name: string;
  picture: string;
  appPassword?: string;
}

interface GoogleAuthProps {
  onLogin: (user: UserProfile) => void;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export function GoogleAuth({ onLogin }: GoogleAuthProps) {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [showAppPasswordForm, setShowAppPasswordForm] = useState(false);

  useEffect(() => {
    loadGoogleScript();
  }, []);

  const loadGoogleScript = () => {
    // Check if Google script is already loaded
    if (window.google) {
      setGoogleLoading(false);
      setTimeout(() => {
        initializeGoogleSignIn();
      }, 100);
      return;
    }

    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google script loaded successfully');
      setGoogleLoading(false);
      setTimeout(() => {
        initializeGoogleSignIn();
      }, 100);
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Sign-in script:', error);
      setGoogleError('Failed to load Google Sign-in. Please use Gmail login below.');
      setGoogleLoading(false);
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (googleLoading) {
        console.warn('Google Sign-in loading timeout');
        setGoogleError('Google Sign-in is taking too long to load. Please use Gmail login below.');
        setGoogleLoading(false);
      }
    }, 10000);
  };

  const initializeGoogleSignIn = () => {
    if (!window.google) {
      console.error('Google API not available');
      setGoogleError('Google Sign-in API not available. Please use Gmail login below.');
      return;
    }

    try {
      console.log('Initializing Google Sign-in...');
      
      // Initialize Google Sign-In with credential callback
      window.google.accounts.id.initialize({
        client_id: '473322219481-tts4tm93ir1f9ql208i7052g1oq6c5v1.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        ux_mode: 'popup',
      });

      // Render the Google Sign-in button
      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer) {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
        
        console.log('Google Sign-in button rendered successfully');
        setGoogleError(null);
      } else {
        console.error('Google Sign-in button container not found');
        // Retry after a short delay
        setTimeout(() => initializeGoogleSignIn(), 100);
      }
    } catch (error) {
      console.error('Google Sign-in initialization failed:', error);
      setGoogleError('Failed to initialize Google Sign-in. Please use Gmail login below.');
    }
  };

  const handleCredentialResponse = (response: any) => {
    try {
      console.log('Google Sign-in response received');
      
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      const userInfo = {
        email: payload.email,
        name: payload.name || payload.given_name || payload.email.split('@')[0],
        picture: payload.picture || `https://ui-avatars.com/api/?name=${payload.name || payload.email.split('@')[0]}&background=4285f4&color=fff`,
        email_verified: payload.email_verified
      };

      console.log('Google Sign-in successful:', userInfo);
      
      // Check if it's a Gmail account
      if (!userInfo.email.includes('@gmail.com')) {
        alert('Please use a Gmail account to send emails through MyEmailBoost.');
        return;
      }

      // Store Google user info and show app password form
      setGoogleUser(userInfo);
      setEmail(userInfo.email);
      setShowAppPasswordForm(true);
      setGoogleError(null);

    } catch (error) {
      console.error('Error processing Google sign-in:', error);
      setGoogleError('Failed to process Google sign-in. Please try again or use Gmail login below.');
    }
  };

  const handleGoogleAppPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!appPassword) {
        alert('Please enter your Gmail App Password');
        return;
      }

      // Clean the app password (remove spaces)
      const cleanAppPassword = appPassword.replace(/\s/g, '');
      
      if (!validateAppPassword(cleanAppPassword)) {
        alert('App password must be exactly 16 characters long and contain only letters and numbers.');
        return;
      }

      const userProfile: UserProfile = {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        appPassword: cleanAppPassword
      };

      console.log('Google + App Password login successful:', userProfile);
      onLogin(userProfile);
    } catch (error) {
      console.error('Google + App Password login error:', error);
      alert('Failed to complete login. Please check your app password.');
    } finally {
      setLoading(false);
    }
  };

  const validateAppPassword = (password: string) => {
    // Remove spaces and check if it's 16 characters
    const cleanPassword = password.replace(/\s/g, '');
    return cleanPassword.length === 16 && /^[a-zA-Z0-9]+$/.test(cleanPassword);
  };

  const handleGmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email || !appPassword) {
        alert('Please enter both email and app password');
        return;
      }

      if (!email.includes('@gmail.com')) {
        alert('Please enter a valid Gmail address');
        return;
      }

      // Clean the app password (remove spaces)
      const cleanAppPassword = appPassword.replace(/\s/g, '');
      
      if (!validateAppPassword(cleanAppPassword)) {
        alert('App password must be exactly 16 characters long and contain only letters and numbers. Please check your app password.');
        return;
      }

      const userProfile: UserProfile = {
        email: email,
        name: email.split('@')[0],
        picture: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=4285f4&color=fff`,
        appPassword: cleanAppPassword
      };

      console.log('Gmail login successful:', userProfile);
      onLogin(userProfile);
    } catch (error) {
      console.error('Gmail login error:', error);
      alert('Failed to login with Gmail. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // If Google user is authenticated but needs app password
  if (showAppPasswordForm && googleUser) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-full p-3 shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className="mb-4">
          <img 
            src={googleUser.picture} 
            alt={googleUser.name}
            className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-green-200"
          />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome, {googleUser.name}!</h2>
          <p className="text-sm text-gray-600">{googleUser.email}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm text-blue-800 font-medium mb-1">
                Gmail App Password Required
              </p>
              <p className="text-xs text-blue-700 mb-2">
                Enter your Gmail App Password to send emails securely.
              </p>
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center"
              >
                {showInstructions ? 'Hide' : 'Show'} setup guide
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact Setup Instructions */}
        {showInstructions && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
              <Key className="w-3 h-3 mr-1" />
              Quick Setup:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-700 text-left">
              <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Security</a></li>
              <li>Enable 2-Step Verification</li>
              <li>Create App Password for "MyEmailBoost"</li>
              <li>Copy the 16-character code</li>
            </ol>
          </div>
        )}

        <form onSubmit={handleGoogleAppPasswordSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gmail App Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="16-character password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {appPassword && (
              <div className="mt-1">
                {validateAppPassword(appPassword.replace(/\s/g, '')) ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    <span className="text-xs">Valid format</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    <span className="text-xs">Must be 16 characters</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowAppPasswordForm(false);
                setGoogleUser(null);
                setAppPassword('');
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !validateAppPassword(appPassword.replace(/\s/g, ''))}
              className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center space-x-1 text-sm"
            >
              <Mail className="w-4 h-4" />
              <span>{loading ? 'Setting up...' : 'Complete'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-3 shadow-lg">
          <Mail className="w-8 h-8 text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">EmailMyBoost</h1>
      <p className="text-gray-600 mb-6">Sign in with Gmail to send emails</p>

      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Loader className="w-4 h-4 text-blue-600 animate-spin mr-2" />
            <span className="text-sm text-blue-700">Processing...</span>
          </div>
        )}

        {/* Google Sign-in Section */}
        <div className="space-y-3">
          {googleLoading && (
            <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Loader className="w-4 h-4 text-blue-600 animate-spin mr-2" />
              <span className="text-sm text-blue-700">Loading Google Sign-in...</span>
            </div>
          )}
          
          {googleError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Google Sign-in Issue</p>
                  <p className="text-xs text-amber-700 mt-1">{googleError}</p>
                </div>
              </div>
            </div>
          )}

          {!googleLoading && !googleError && (
            <>
              <div id="google-signin-button" className="w-full min-h-[44px] flex items-center justify-center"></div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-xs text-blue-800">
                  <strong>Recommended:</strong> Sign in with Google + App Password
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or enter manually</span>
          </div>
        </div>

        {/* Gmail Manual Login */}
        <div className="space-y-3 text-left">
          {/* Compact Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-800 font-medium mb-1">
                  App Password Required
                </p>
                <p className="text-xs text-green-700 mb-2">
                  Gmail requires a 16-character App Password for security.
                </p>
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-xs text-green-600 hover:text-green-800 underline flex items-center"
                >
                  {showInstructions ? 'Hide' : 'Show'} setup guide
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Compact Setup Instructions */}
          {showInstructions && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <Key className="w-3 h-3 mr-1" />
                Quick Setup:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Security</a></li>
                <li>Enable 2-Step Verification</li>
                <li>Create App Password for "EmailMyBoost"</li>
                <li>Copy the 16-character code</li>
              </ol>
            </div>
          )}

          <form onSubmit={handleGmailLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gmail Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gmail App Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="16-character password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {appPassword && (
                <div className="mt-1">
                  {validateAppPassword(appPassword.replace(/\s/g, '')) ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span className="text-xs">Valid format</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      <span className="text-xs">Must be 16 characters</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !validateAppPassword(appPassword.replace(/\s/g, ''))}
              className="w-full bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              <span>{loading ? 'Signing in...' : 'Sign in with Gmail'}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          By signing in, you agree to our{' '}
          <a href="#" className="text-blue-600 hover:underline">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
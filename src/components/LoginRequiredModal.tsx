import React from 'react';
import { Lock, LogIn, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export type LoginRequiredAction = 'add_pothole' | 'remove_pothole' | 'report_hazard' | 'confirm_hazard' | 'profile_feature' | 'general';

interface LoginRequiredModalProps {
  isOpen: boolean;
  actionType: LoginRequiredAction;
  customMessage?: string;
  onLogin: () => void;
  onCancel: () => void;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  isOpen,
  actionType,
  customMessage,
  onLogin,
  onCancel
}) => {
  if (!isOpen) return null;

  // Determine user-friendly message based on the attempted action
  const getMessage = () => {
    if (customMessage) return customMessage;
    switch (actionType) {
      case 'remove_pothole':
        return 'Please log in to remove or manage reported road hazards.';
      case 'add_pothole':
      case 'report_hazard':
      default:
        return 'You need to log in to report a pothole and contribute safety data.';
    }
  };

  const getActionSubtitle = () => {
    switch (actionType) {
      case 'remove_pothole':
        return 'Hazard Management Restricted';
      case 'add_pothole':
      case 'report_hazard':
        return 'Pothole Reporting Restricted';
      case 'confirm_hazard':
        return 'Hazard Confirmation Restricted';
      default:
        return 'Authentication Required';
    }
  };

  return (
    <div
      id="login-required-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        id="login-required-modal"
        role="dialog"
        aria-labelledby="login-required-title"
        aria-describedby="login-required-desc"
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Header with Icon */}
        <div className="bg-gradient-to-br from-amber-500/15 via-blue-500/10 to-transparent p-6 text-center relative border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            id="btn-login-required-close-x"
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400 mb-3 ring-8 ring-amber-500/10 shadow-xs">
            <Lock className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
            {getActionSubtitle()}
          </div>

          <h2
            id="login-required-title"
            className="text-xl font-black text-slate-900 dark:text-white"
          >
            Login Required
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <blockquote
            id="login-required-desc"
            className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-l-4 border-blue-500 text-slate-700 dark:text-slate-200 text-sm font-medium leading-relaxed"
          >
            "{getMessage()}"
          </blockquote>

          {/* Value Props */}
          <div className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Logging in gives you access to:
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Report new potholes with GPS & AI vision verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Confirm or mark road hazards as repaired</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Earn contributor badges and community safety points</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              id="btn-login-required-proceed"
              onClick={onLogin}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Sign Up</span>
            </button>

            <button
              type="button"
              id="btn-login-required-cancel"
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

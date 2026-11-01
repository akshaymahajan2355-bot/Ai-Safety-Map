import React from 'react';
import { NotificationItem } from '../types';
import { Bell } from 'lucide-react';

interface NotificationPanelProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onSelectNotification
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => n.unread).length;

  const renderIcon = (item: NotificationItem) => {
    switch (item.severity) {
      case 'CRITICAL':
        return <span className="text-base">🔴</span>;
      case 'HIGH':
        return <span className="text-base">🟠</span>;
      case 'MODERATE':
        return <span className="text-base">🟡</span>;
      case 'LOW':
        return <span className="text-base">🟢</span>;
      default:
        return <span className="text-base">🛡️</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mt-12 sm:mt-8 max-h-[82vh] flex flex-col animate-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                Safety Notifications
              </h3>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread warnings` : 'All alerts up to date'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-read"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
              >
                Mark Read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent road notifications
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNotification && onSelectNotification(item)}
                className={`pt-2.5 first:pt-0 cursor-pointer transition rounded-xl p-2.5 ${
                  item.unread
                    ? 'bg-blue-50/60 dark:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">{renderIcon(item)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-center">
          <span className="text-[10px] text-slate-500 font-medium">
            AI Road Safety notifications synchronized with real-time route geometry
          </span>
        </div>
      </div>
    </div>
  );
};

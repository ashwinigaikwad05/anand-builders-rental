import React from 'react';
import { Bell, Check, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { AdminNotification } from '../../../data/adminMockData';

interface NotificationsTabProps {
  notifications: AdminNotification[];
  onMarkRead: (notificationId: string) => void;
  onClearNotification: (notificationId: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  onMarkRead,
  onClearNotification,
  onMarkAllRead,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 text-left">
      
      {/* Header Info */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-charcoal">Yard Alerts & Notifications</h3>
            <p className="text-xs text-slate-500 font-light mt-0.5">
              You have {unreadCount} unread system notifications
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden divide-y divide-slate-100">
        {notifications.map((not) => {
          
          let alertIcon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
          if (not.type === 'payment') {
            alertIcon = <ShieldAlert className="w-5 h-5 text-rose-500" />;
          } else if (not.type === 'stock') {
            alertIcon = <ShieldAlert className="w-5 h-5 text-amber-500" />;
          }

          return (
            <div
              key={not.id}
              className={`p-5 flex items-start gap-4 transition-colors ${
                not.isRead ? 'bg-white opacity-70' : 'bg-slate-50/75'
              }`}
            >
              <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm mt-0.5">
                {alertIcon}
              </div>
              
              <div className="flex-grow space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">{not.title}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{not.date}</span>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm font-light leading-relaxed">
                  {not.message}
                </p>
              </div>

              <div className="flex items-center gap-2 self-center pl-4 border-l border-slate-100">
                {!not.isRead && (
                  <button
                    onClick={() => onMarkRead(not.id)}
                    className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded transition"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onClearNotification(not.id)}
                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Clear Notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="p-12 text-center text-slate-400 font-light italic">
            You have no notifications or alerts to review.
          </div>
        )}
      </div>

    </div>
  );
};

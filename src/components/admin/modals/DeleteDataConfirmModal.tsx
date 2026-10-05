import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  ShieldAlert,
  ClipboardList,
  DollarSign,
  Users,
  Bell,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { Party, Rental, RentalCycle, Payment, ReturnLog } from '../../../data/adminMockData';

export type DeleteDataCategory =
  | 'all_rentals'
  | 'all_payments'
  | 'inactive_customers'
  | 'all_customers'
  | 'all_notifications'
  | 'factory_reset';

interface DeleteDataConfirmModalProps {
  isOpen: boolean;
  category: DeleteDataCategory | null;
  onClose: () => void;
  onConfirmDelete: (category: DeleteDataCategory) => Promise<void>;
  rentals?: Rental[];
  parties?: Party[];
  rentalCycles?: RentalCycle[];
  payments?: Payment[];
  returns?: ReturnLog[];
  isMarathi?: boolean;
}

export const DeleteDataConfirmModal: React.FC<DeleteDataConfirmModalProps> = ({
  isOpen,
  category,
  onClose,
  onConfirmDelete,
  rentals = [],
  parties = [],
  rentalCycles = [],
  payments = [],
  returns = [],
  isMarathi = true,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !category) return null;

  // Inactive parties count: 0 plates on site and 0 pending dues
  const inactiveParties = parties.filter(
    (p) => (p.platesWithParty || 0) === 0 && (p.pending || 0) === 0
  );

  const getCategoryDetails = () => {
    switch (category) {
      case 'all_rentals':
        return {
          title: isMarathi
            ? 'सर्व भाडे वाटप व सायकल्स हटवा'
            : 'Delete All Rental Dispatches & Cycles',
          subtitle: isMarathi
            ? 'सर्व चालू व जुन्या भाडे नोंदी कायमच्या हटवल्या जातील'
            : 'All active and historical rental dispatches will be permanently deleted',
          icon: ClipboardList,
          colorClass: 'text-amber-600 bg-amber-100',
          borderClass: 'border-amber-200',
          stats: [
            { label: isMarathi ? 'भाडे वाटप नोंदी' : 'Rental Agreements', count: rentals.length },
            { label: isMarathi ? 'सायकल हिशोब' : 'Rental Cycles', count: rentalCycles.length },
            { label: isMarathi ? 'साहित्य जमा नोंदी' : 'Return Records', count: returns.length },
          ],
          whatWillHappen: isMarathi
            ? 'सर्व भाडे करार, सायकल कालावधी हिशोब, आणि साहित्य जमा नोंदी डेटाबेसमधून कायमच्या हटवल्या जातील. सर्व ग्राहकांकडील साहित्य स्थिती शून्य (0) केली जाईल.'
            : 'All rental dispatches, cycle schedules, and plate return records will be permanently removed. Site plate counts will reset to 0.',
          whatWillBeSafe: isMarathi
            ? 'ग्राहक प्रोफाइल्स, मोबाइल नंबर, पत्ते आणि प्लेट दर सुरक्षित राहतील.'
            : 'Customer profiles, mobile numbers, site addresses, and plate stock rates will remain safe.',
          requiresTypeIn: false,
        };

      case 'all_payments':
        return {
          title: isMarathi
            ? 'सर्व पेमेंट इतिहास व पावत्या हटवा'
            : 'Delete All Payment History & Receipts',
          subtitle: isMarathi
            ? 'सर्व जमा पेमेंट्स व व्यवहार नोंदी हटवल्या जातील'
            : 'All recorded payments and receipt transactions will be deleted',
          icon: DollarSign,
          colorClass: 'text-blue-600 bg-blue-100',
          borderClass: 'border-blue-200',
          stats: [
            { label: isMarathi ? 'पेमेंट नोंदी' : 'Payment Entries', count: payments.length },
          ],
          whatWillHappen: isMarathi
            ? 'ग्राहकांकडून जमा झालेले सर्व पेमेंट ट्रॅन्झॅक्शन्स कायमचे हटवले जातील.'
            : 'All logged payment transactions and receipts will be permanently removed.',
          whatWillBeSafe: isMarathi
            ? 'भाडे करार आणि ग्राहक माहिती सुरक्षित राहील.'
            : 'Rental agreements and customer records will remain safe.',
          requiresTypeIn: false,
        };

      case 'inactive_customers':
        return {
          title: isMarathi
            ? 'शून्य बाकी असलेले निष्क्रिय ग्राहक हटवा'
            : 'Delete Inactive / Settled Customers',
          subtitle: isMarathi
            ? 'ज्यांच्याकडे ० प्लेट्स व ₹० बाकी आहे असेच ग्राहक हटवले जातील'
            : 'Only customers holding 0 plates and ₹0 dues will be removed',
          icon: Users,
          colorClass: 'text-indigo-600 bg-indigo-100',
          borderClass: 'border-indigo-200',
          stats: [
            {
              label: isMarathi ? 'पात्र निष्क्रिय ग्राहक' : 'Eligible Inactive Customers',
              count: inactiveParties.length,
            },
            {
              label: isMarathi ? 'सुरक्षित सक्रिय ग्राहक' : 'Protected Active Customers',
              count: parties.length - inactiveParties.length,
            },
          ],
          whatWillHappen: isMarathi
            ? `${inactiveParties.length} निष्क्रिय ग्राहक (ज्यांच्याकडे एकही प्लेट नाही आणि बाकी शून्य आहे) डेटाबेसमधून हटवले जातील.`
            : `${inactiveParties.length} settled customers with 0 plates on site and 0 dues will be removed.`,
          whatWillBeSafe: isMarathi
            ? 'चालू भाडे किंवा थकबाकी असलेले कोणतेही सक्रिय ग्राहक हटवले जाणार नाहीत.'
            : 'Active customers with outstanding plates or pending dues will NOT be touched.',
          requiresTypeIn: false,
        };

      case 'all_customers':
        return {
          title: isMarathi ? 'सर्व ग्राहक प्रोफाइल्स हटवा' : 'Delete All Customer Profiles',
          subtitle: isMarathi
            ? 'सर्व ग्राहकांची माहिती डेटाबेसमधून हटवली जाईल'
            : 'All customer accounts and directories will be deleted',
          icon: Users,
          colorClass: 'text-rose-600 bg-rose-100',
          borderClass: 'border-rose-200',
          stats: [
            { label: isMarathi ? 'एकूण ग्राहक' : 'Total Customers', count: parties.length },
          ],
          whatWillHappen: isMarathi
            ? 'सर्व ग्राहकांची नावे, फोन नंबर, फोटो, आधार व पत्ते कायमचे हटवले जातील.'
            : 'All customer profiles, names, contact numbers, and delivery addresses will be permanently removed.',
          whatWillBeSafe: isMarathi
            ? 'प्लेट दर व बिल सेटिंग्ज सुरक्षित राहतील.'
            : 'Plate inventory rates and invoice templates will remain safe.',
          requiresTypeIn: true,
        };

      case 'all_notifications':
        return {
          title: isMarathi ? 'सर्व सूचना व अलर्ट्स साफ करा' : 'Clear All Notifications & Alerts',
          subtitle: isMarathi
            ? 'सर्व सूचना नोंदी हटवल्या जातील'
            : 'All alerts and system notifications will be cleared',
          icon: Bell,
          colorClass: 'text-slate-600 bg-slate-100',
          borderClass: 'border-slate-200',
          stats: [],
          whatWillHappen: isMarathi
            ? 'सर्व वाचलेल्या व न वाचलेल्या सूचनांचा इतिहास साफ केला जाईल.'
            : 'All notification history will be wiped.',
          whatWillBeSafe: isMarathi
            ? 'कोणत्याही व्यावसायिक किंवा आर्थिक डेटावर परिणाम होणार नाही.'
            : 'No business, financial, or customer data will be affected.',
          requiresTypeIn: false,
        };

      case 'factory_reset':
      default:
        return {
          title: isMarathi
            ? 'सर्व डेटा पूर्णपणे पुसून टाका'
            : 'Complete Factory Reset',
          subtitle: isMarathi
            ? 'धोकादायक: संपूर्ण डेटाबेस स्वच्छ करून सुरुवातीच्या स्थितीत आणला जाईल'
            : 'DANGER: Complete database wipe back to fresh clean state',
          icon: ShieldAlert,
          colorClass: 'text-rose-600 bg-rose-100',
          borderClass: 'border-rose-300',
          stats: [
            { label: isMarathi ? 'भाडे वाटप' : 'Rentals', count: rentals.length },
            { label: isMarathi ? 'सायकल हिशोब' : 'Cycles', count: rentalCycles.length },
            { label: isMarathi ? 'जमा नोंदी' : 'Returns', count: returns.length },
            { label: isMarathi ? 'पेमेंट्स' : 'Payments', count: payments.length },
            { label: isMarathi ? 'ग्राहक' : 'Customers', count: parties.length },
          ],
          whatWillHappen: isMarathi
            ? 'संपूर्ण डेटाबेस स्वच्छ केला जाईल - सर्व भाडे वाटप, सायकल्स, जमा नोंदी, पेमेंट्स, आणि ग्राहक नोंदी कायमच्या नष्ट केल्या जातील! ही कृती पूर्ववत करता येणार नाही.'
            : 'All rentals, cycles, return logs, payments, ledger entries, notifications, and customers will be wiped permanently. This action cannot be reversed.',
          whatWillBeSafe: isMarathi
            ? 'केवळ कंपनीचे नाव व मूलभूत बिल सेटिंग्ज शिल्लक राहतील.'
            : 'Only fundamental business branding and basic rate configurations will be retained.',
          requiresTypeIn: true,
        };
    }
  };

  const details = getCategoryDetails();
  const IconComponent = details.icon;

  const isTypeInConfirmed =
    details.requiresTypeIn
      ? confirmationInput.trim().toUpperCase() === 'DELETE' ||
        confirmationInput.trim() === 'हटवा'
      : confirmedCheckbox;

  const handleExecuteDelete = async () => {
    setErrorMessage('');
    if (!isTypeInConfirmed) {
      setErrorMessage(
        details.requiresTypeIn
          ? isMarathi
            ? 'कृपया खात्री करण्यासाठी "हटवा" टाईप करा.'
            : 'Please type "DELETE" to confirm.'
          : isMarathi
          ? 'कृपया खात्री करण्यासाठी चेकबॉक्सवर क्लिक करा.'
          : 'Please check the confirmation box.'
      );
      return;
    }

    try {
      setIsDeleting(true);
      await onConfirmDelete(category);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete selected data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
        {/* Header */}
        <div className={`px-6 py-5 border-b flex justify-between items-center ${details.borderClass} ${category === 'factory_reset' ? 'bg-rose-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${details.colorClass} shadow-2xs`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 leading-tight">
                {details.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {details.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Danger Warning Banner */}
          <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <span className="font-bold block text-rose-950 mb-0.5">
                {isMarathi ? 'इशारा: ही कृती कायमस्वरूपी आहे!' : 'Caution: This action is permanent!'}
              </span>
              <span>{details.whatWillHappen}</span>
            </div>
          </div>

          {/* Counts to be deleted */}
          {details.stats.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isMarathi ? 'हटवल्या जाणाऱ्या नोंदींची संख्या' : 'Affected Record Counts'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {details.stats.map((s, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center"
                  >
                    <span className="text-lg font-black text-slate-900 block font-mono">
                      {s.count}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block truncate">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What remains safe */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">
                {isMarathi ? 'काय सुरक्षित राहील?' : 'What will remain safe?'}
              </span>
              <span className="text-emerald-800 text-[11px] leading-relaxed">
                {details.whatWillBeSafe}
              </span>
            </div>
          </div>

          {/* Confirmation Step */}
          {details.requiresTypeIn ? (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  {isMarathi
                    ? 'खात्री करण्यासाठी खाली "हटवा" टाईप करा:'
                    : 'Type "DELETE" below to confirm deletion:'}
                </span>
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => {
                  setConfirmationInput(e.target.value);
                  setErrorMessage('');
                }}
                placeholder={isMarathi ? 'येथे "हटवा" टाईप करा' : 'Type DELETE here'}
                className="w-full bg-slate-50 border border-rose-300 focus:border-rose-500 focus:bg-white focus:outline-none px-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 tracking-wider uppercase"
                autoFocus
              />
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedCheckbox}
                  onChange={(e) => {
                    setConfirmedCheckbox(e.target.checked);
                    setErrorMessage('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  {isMarathi
                    ? 'होय, मी खात्री करतो/करते की हा डेटा कायमचा हटवायचा आहे.'
                    : 'Yes, I understand and confirm I want to permanently delete this data.'}
                </span>
              </label>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-100 border border-rose-300 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            {isMarathi ? 'रद्द करा' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={!isTypeInConfirmed || isDeleting}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isTypeInConfirmed && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isMarathi ? 'डेटा हटवत आहे...' : 'Deleting...'}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{isMarathi ? 'डेटा कायमचा हटवा' : 'Confirm Delete'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

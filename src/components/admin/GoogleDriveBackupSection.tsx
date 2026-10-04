import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Info,
  ShieldCheck,
  FileText,
  X,
  UserCheck,
  Loader2,
} from 'lucide-react';
import {
  googleDriveBackupService,
  type DriveBackupFile,
  type DriveBackupSettings,
} from '../../lib/googleDriveBackupService';

interface GoogleDriveBackupSectionProps {
  getCurrentData: () => any;
  onRestoreBackup?: (backupData: any) => Promise<void>;
  isMarathi?: boolean;
}

export const GoogleDriveBackupSection: React.FC<GoogleDriveBackupSectionProps> = ({
  getCurrentData,
  onRestoreBackup,
  isMarathi = true,
}) => {
  const [settings, setSettings] = useState<DriveBackupSettings>(() =>
    googleDriveBackupService.getSettings()
  );
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<
    'connect' | 'backup' | 'test' | 'list' | 'restore' | 'disconnect' | 'change' | null
  >(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | '';
    text: string;
  }>({ type: '', text: '' });

  // Modals
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [availableBackups, setAvailableBackups] = useState<DriveBackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<DriveBackupFile | null>(
    null
  );
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [isFoundBackupsModalOpen, setIsFoundBackupsModalOpen] = useState(false);

  const refreshSettings = useCallback(() => {
    setSettings(googleDriveBackupService.getSettings());
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((prev) => (prev.text === text ? { type: '', text: '' } : prev));
    }, 6000);
  };

  // 1. Connect Google Drive
  const handleConnect = async () => {
    try {
      setLoading(true);
      setBusyAction('connect');
      setNotification({ type: '', text: '' });
      const result = await googleDriveBackupService.connectGoogleDrive(getCurrentData);
      refreshSettings();

      if (result.existingBackups && result.existingBackups.length > 0) {
        setAvailableBackups(result.existingBackups);
        setIsFoundBackupsModalOpen(true);
        showToast(
          'info',
          isMarathi
            ? 'Google Drive जोडले गेले. ड्राइव्हवर पूर्वीचे बॅकअप सापडले आहेत.'
            : 'Google Drive connected. Previous backups found on Drive.'
        );
      } else {
        showToast(
          'success',
          isMarathi
            ? 'Google Drive जोडले गेले आणि पहिला बॅकअप यशस्वीरीत्या तयार झाला!'
            : 'Google Drive connected and initial backup created!'
        );
      }
    } catch (err: any) {
      console.error('Google Drive Connect Error:', err);
      showToast(
        'error',
        err?.message ||
          (isMarathi ? 'Google Drive जोडण्यात त्रुटी आली.' : 'Failed to connect Google Drive.')
      );
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };

  // 2. Disconnect Google Drive
  const handleDisconnect = async () => {
    const confirmMsg = isMarathi
      ? 'Google Drive खाते डिस्कनेक्ट करायचे आहे का?'
      : 'Do you want to disconnect Google Drive?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setBusyAction('disconnect');
      await googleDriveBackupService.disconnectGoogleDrive();
      refreshSettings();
      showToast(
        'info',
        isMarathi ? 'Google Drive खाते डिस्कनेक्ट झाले.' : 'Google Drive disconnected.'
      );
    } catch (err: any) {
      showToast(
        'error',
        err?.message || (isMarathi ? 'डिस्कनेक्ट अयशस्वी.' : 'Failed to disconnect.')
      );
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };

  // 3. Switch Google Account
  const handleChangeAccount = async () => {
    try {
      setLoading(true);
      setBusyAction('change');
      const result = await googleDriveBackupService.changeGoogleAccount(getCurrentData);
      refreshSettings();

      if (result.existingBackups && result.existingBackups.length > 0) {
        setAvailableBackups(result.existingBackups);
        setIsFoundBackupsModalOpen(true);
        showToast(
          'info',
          isMarathi
            ? 'नवीन खाते जोडले गेले. उपलब्ध बॅकअप सापडले.'
            : 'New account connected. Available backups found.'
        );
      } else {
        showToast(
          'success',
          isMarathi ? 'नवीन Google खाते जोडले गेले.' : 'New Google account connected.'
        );
      }
    } catch (err: any) {
      showToast(
        'error',
        err?.message || (isMarathi ? 'खाते बदलण्यात अयशस्वी.' : 'Failed to change account.')
      );
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };

  // 4. Test Drive Connection
  const handleTestDrive = async () => {
    try {
      setLoading(true);
      setBusyAction('test');
      const statusMsg = await googleDriveBackupService.testDrive();
      refreshSettings();
      showToast(
        'success',
        isMarathi ? `Drive चाचणी यशस्वी: ${statusMsg}` : `Drive test successful: ${statusMsg}`
      );
    } catch (err: any) {
      refreshSettings();
      showToast(
        'error',
        err?.message || (isMarathi ? 'Drive चाचणी अयशस्वी.' : 'Drive test failed.')
      );
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };

  // 5. Manual Backup Now
  const handleBackupNow = async () => {
    try {
      setLoading(true);
      setBusyAction('backup');
      const result = await googleDriveBackupService.backupNow(getCurrentData, { force: true });
      refreshSettings();
      if (result.uploaded) {
        showToast(
          'success',
          isMarathi
            ? `बॅकअप पूर्ण झाला: ${result.filename}`
            : `Backup completed: ${result.filename}`
        );
      } else {
        showToast('info', result.message || 'Backup skipped');
      }
    } catch (err: any) {
      showToast(
        'error',
        err?.message || (isMarathi ? 'बॅकअप घेण्यात अयशस्वी.' : 'Failed to create backup.')
      );
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };

  // 6. View Available Backups
  const handleOpenPicker = async () => {
    setIsPickerOpen(true);
    await fetchBackupsList();
  };

  const fetchBackupsList = async () => {
    try {
      setLoadingBackups(true);
      const list = await googleDriveBackupService.listDriveBackups();
      setAvailableBackups(list);
    } catch (err: any) {
      showToast(
        'error',
        err?.message ||
          (isMarathi ? 'बॅकअप सूची लोड करता आली नाही.' : 'Failed to load backups list.')
      );
    } finally {
      setLoadingBackups(false);
    }
  };

  // 7. Trigger Restore Flow
  const handleSelectForRestore = (backupFile: DriveBackupFile) => {
    setSelectedBackupForRestore(backupFile);
    setIsConfirmRestoreOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    try {
      setLoading(true);
      setBusyAction('restore');

      const restoreFn = async (parsedData: any) => {
        if (onRestoreBackup) {
          await onRestoreBackup(parsedData);
          return { success: true, message: 'Restore completed' };
        }
        return { success: true, message: 'Restore completed' };
      };

      const res = await googleDriveBackupService.restoreSelectedBackup(
        selectedBackupForRestore,
        restoreFn,
        getCurrentData
      );

      refreshSettings();
      setIsConfirmRestoreOpen(false);
      setIsPickerOpen(false);
      setIsFoundBackupsModalOpen(false);

      showToast(
        'success',
        isMarathi
          ? `बॅकअप यशस्वीरीत्या रिस्टोअर झाला! (${res.filename})`
          : `Backup restored successfully! (${res.filename})`
      );
    } catch (err: any) {
      console.error('Restore Error:', err);
      showToast(
        'error',
        `${isMarathi ? 'रिस्टोअर अयशस्वी' : 'Restore failed'}: ${err?.message || err}`
      );
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };

  // 8. Keep current data when existing backups found
  const handleKeepCurrentData = async () => {
    await googleDriveBackupService.keepCurrentDataAndEnableBackups();
    refreshSettings();
    setIsFoundBackupsModalOpen(false);
    showToast(
      'success',
      isMarathi
        ? 'सध्याचा डेटा कायम ठेवला आणि स्वयंचलित बॅकअप सुरू केला.'
        : 'Current data retained and automatic backup enabled.'
    );
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    return (bytes / k).toFixed(1) + ' KB';
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 lg:p-7 shadow-xs space-y-4 sm:space-y-6 relative overflow-hidden">
      {/* Header with Title and Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs flex-shrink-0">
            <Cloud className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight leading-snug">
                {isMarathi
                  ? 'Google Drive बॅकअप (Backup & Restore)'
                  : 'Google Drive Backup & Restore'}
              </h4>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 uppercase tracking-wider">
                Cloud Sync
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5">
              {isMarathi
                ? 'स्वयंचलित क्लाउड बॅकअप व मोबाइल ॲपसह पूर्ण सुसंगतता'
                : 'Automatic cloud backup with 100% mobile app compatibility'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black tracking-wide border shadow-xs self-start sm:self-auto ${
            settings.isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          <span
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
              settings.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>
            {settings.isConnected
              ? isMarathi
                ? 'सक्रिय (ACTIVE)'
                : 'ACTIVE'
              : isMarathi
              ? 'अक्रिय (INACTIVE)'
              : 'INACTIVE'}
          </span>
        </div>
      </div>

      {/* Notification Banner */}
      {notification.text && (
        <div
          className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-sky-50 text-sky-900 border-sky-200'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />}
          <span className="flex-1 text-[11px] sm:text-xs leading-normal">{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-700 ml-auto cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Connection Details Summary Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">
              {isMarathi ? 'Google Drive स्थिती' : 'Drive Status'}
            </span>
            <span
              className={`font-black text-xs sm:text-sm block ${
                settings.isConnected ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {settings.isConnected
                ? isMarathi
                  ? 'जोडले आहे'
                  : 'Connected'
                : isMarathi
                ? 'जोडलेले नाही'
                : 'Not Connected'}
            </span>
          </div>

          <div className="space-y-0.5 min-w-0">
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">
              {isMarathi ? 'जोडलेला ईमेल' : 'Connected Email'}
            </span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm block truncate" title={settings.connectedEmail || ''}>
              {settings.connectedEmail || '-'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">
              {isMarathi ? 'शेवटचा बॅकअप' : 'Last Backup'}
            </span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm block truncate">
              {formatDateDisplay(settings.lastBackupAt)}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 text-[10px] sm:text-xs font-medium block">
              {isMarathi ? 'स्वयंचलित बॅकअप' : 'Automatic Backup'}
            </span>
            <span
              className={`font-bold text-xs sm:text-sm block ${
                settings.automaticBackupEnabled ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              {settings.automaticBackupEnabled
                ? isMarathi
                  ? 'चालू (दर २ दिवसांनी)'
                  : 'ON (Every 2 days)'
                : isMarathi
                ? 'बंद (OFF)'
                : 'OFF'}
            </span>
          </div>
        </div>

        {settings.isConnected && settings.lastTestStatus && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1">
            <span className="font-medium text-[10px] sm:text-xs text-slate-500">
              {isMarathi ? 'Drive चाचणी स्थिती (Test Status):' : 'Drive Test Status:'}
            </span>
            <span className="font-mono font-semibold text-slate-800 text-[11px] sm:text-xs truncate">
              {settings.lastTestStatus}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!settings.isConnected ? (
        <div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && busyAction === 'connect' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isMarathi ? 'Drive शी जोडत आहे...' : 'Connecting Drive...'}</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                <span>
                  {isMarathi ? 'Google Drive खाते जोडा (Connect)' : 'Connect Google Drive'}
                </span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {/* Main Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleBackupNow}
              disabled={loading}
              className="py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading && busyAction === 'backup' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isMarathi ? 'बॅकअप घेत आहे...' : 'Backing up...'}</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>{isMarathi ? 'आता बॅकअप घ्या (Back Up Now)' : 'Back Up Now'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenPicker}
              disabled={loading}
              className="py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/90 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
            >
              <CloudDownload className="w-4 h-4 text-sky-600" />
              <span>
                {isMarathi ? 'उपलब्ध बॅकअप पहा / रिस्टोअर' : 'View Backups / Restore'}
              </span>
            </button>
          </div>

          {/* Secondary Action Toolbar: Grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestDrive}
              disabled={loading}
              className="w-full sm:w-auto py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 min-h-[40px]"
              title="Test Google Drive Connection"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loading && busyAction === 'test' ? 'animate-spin text-sky-600' : ''
                }`}
              />
              <span>{isMarathi ? 'कनेक्शन तपासा (Test)' : 'Test Drive'}</span>
            </button>

            <button
              type="button"
              onClick={handleChangeAccount}
              disabled={loading}
              className="w-full sm:w-auto py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 min-h-[40px]"
              title="Switch to another Google Account"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'खाते बदला (Change)' : 'Change Account'}</span>
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="col-span-2 sm:col-span-1 w-full sm:w-auto py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center sm:justify-end gap-1.5 transition-colors cursor-pointer disabled:opacity-60 min-h-[40px]"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'डिस्कनेक्ट (Disconnect)' : 'Disconnect'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Informational Tip matching Mobile */}
      <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-sky-50/70 border border-sky-200/70 flex items-start gap-2 sm:gap-2.5">
        <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <span className="text-[11px] sm:text-xs text-sky-900 leading-relaxed font-normal">
          {isMarathi
            ? 'दर २ दिवसांनी दिनांकानुसार JSON बॅकअप Google Drive च्या "Anand Plates Backups" फोल्डरमध्ये सुरक्षितपणे जतन केला जातो. Mobile ॲप आणि Web ॲप दोन्हीचे बॅकअप परस्पर वापरता येतात.'
            : 'Automated 2-day cadence JSON backups are stored securely inside Google Drive\'s "Anand Plates Backups" folder. Fully interchangeable between Mobile and Web.'}
        </span>
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: AVAILABLE BACKUPS LIST / PICKER                            */}
      {/* =================================================================== */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-3 sm:space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <CloudDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {isMarathi ? 'बॅकअप तारीख निवडा' : 'Select Backup Date'}
                  </h3>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    {availableBackups.length > 0
                      ? `${isMarathi ? 'उपलब्ध फाइल्स' : 'Available files'}: ${availableBackups.length}`
                      : isMarathi
                      ? 'कोणतीही फाइल नाही'
                      : 'No backup files found'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] sm:text-xs">{isMarathi ? 'ड्राइव्हवरील बॅकअप सूची' : 'Drive Backups'}</span>
              <button
                type="button"
                onClick={fetchBackupsList}
                disabled={loadingBackups}
                className="inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-800 cursor-pointer disabled:opacity-50 text-[11px] sm:text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loadingBackups ? 'animate-spin' : ''}`} />
                <span>{isMarathi ? 'रिफ्रेश करा' : 'Refresh'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loadingBackups ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">
                    {isMarathi
                      ? 'Drive वरून उपलब्ध बॅकअप शोधत आहे...'
                      : 'Querying backups from Google Drive...'}
                  </p>
                </div>
              ) : availableBackups.length === 0 ? (
                <div className="py-8 sm:py-12 text-center bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 p-4 sm:p-6 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    {isMarathi
                      ? 'Drive च्या "Anand Plates Backups" फोल्डरमध्ये बॅकअप उपलब्ध नाही.'
                      : 'No backups found in Google Drive.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isMarathi
                      ? 'प्रथम "आता बॅकअप घ्या" बटण दाबून नवीन बॅकअप तयार करा.'
                      : 'Create a new backup first using the "Back Up Now" button.'}
                  </p>
                </div>
              ) : (
                availableBackups.map((file) => {
                  const displayDate = file.backupDate || file.modifiedTime;
                  return (
                    <div
                      key={file.id}
                      className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 hover:border-sky-300 bg-white hover:bg-sky-50/40 flex items-center justify-between gap-2.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 block truncate">
                            {formatDateDisplay(displayDate)}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono block truncate">
                            {file.name} • {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectForRestore(file)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg sm:rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[36px]"
                      >
                        {isMarathi ? 'रिस्टोअर' : 'Restore'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                {isMarathi ? 'बंद करा' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CONFIRM RESTORE DIALOG                                     */}
      {/* =================================================================== */}
      {isConfirmRestoreOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {isMarathi ? 'बॅकअप रिस्टोअर करायचा?' : 'Restore Backup?'}
                </h3>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                  {isMarathi ? 'कृपया पुष्टी करा' : 'Please confirm your action'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 text-[11px] sm:text-xs text-rose-900 leading-relaxed font-semibold">
              <strong>{isMarathi ? 'सावधान:' : 'Warning:'}</strong>{' '}
              {isMarathi
                ? 'हा बॅकअप घेतल्यास सध्याचा स्थानिक डेटा बदलेल आणि निवडलेल्या बॅकअपमधील डेटा लागू होईल. (सुरक्षेसाठी चालू डेटाचा सेव्ह स्थानिक स्तरावर जतन केला जाईल).'
                : 'Restoring this backup will replace current records with the data from the chosen backup file.'}
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px] sm:text-xs">{isMarathi ? 'तारीख:' : 'Date:'}</span>
                <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                  {formatDateDisplay(
                    selectedBackupForRestore.backupDate || selectedBackupForRestore.modifiedTime
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 text-[11px] sm:text-xs">{isMarathi ? 'फाइल:' : 'File:'}</span>
                <span className="font-mono text-[10px] sm:text-[11px] text-slate-700 truncate max-w-[180px] sm:max-w-[220px]">
                  {selectedBackupForRestore.name}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmRestoreOpen(false)}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
              >
                {isMarathi ? 'रद्द करा' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading && busyAction === 'restore' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isMarathi ? 'रिस्टोअर होत आहे...' : 'Restoring...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {isMarathi ? 'होय, रिस्टोअर करा' : 'Yes, Restore Backup'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: OLD BACKUP DETECTION PROMPT                                */}
      {/* =================================================================== */}
      {isFoundBackupsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {isMarathi ? 'Google Drive बॅकअप सापडले' : 'Backups Found on Google Drive'}
                </h3>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                  {isMarathi
                    ? `${availableBackups.length} पूर्वीचे बॅकअप उपलब्ध`
                    : `${availableBackups.length} backups found`}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isMarathi
                ? `या Google Drive खात्यावर पूर्वी तयार केलेले ${availableBackups.length} बॅकअप उपलब्ध आहेत. आपण सध्याचा स्थानिक डेटा कायम ठेवू इच्छिता की Drive वरील जुना बॅकअप रिस्टोअर करू इच्छिता?`
                : `We found ${availableBackups.length} existing backups on your Google Drive. Would you like to keep current data or restore from an existing backup?`}
            </p>

            <div className="space-y-2 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={handleKeepCurrentData}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs text-center"
              >
                {isMarathi ? 'सध्याचा डेटा ठेवा (Keep current data)' : 'Keep current data'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFoundBackupsModalOpen(false);
                  setIsPickerOpen(true);
                }}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-extrabold text-xs transition-colors cursor-pointer text-center"
              >
                {isMarathi
                  ? 'बॅकअप निवडा व रिस्टोअर करा (Choose backup)'
                  : 'Choose backup to restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveBackupSection;

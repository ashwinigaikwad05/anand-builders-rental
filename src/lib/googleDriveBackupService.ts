/**
 * Google Drive Backup & Restore Service for Anand Plates (Anand Builders & Developers)
 *
 * Requirements:
 * - Scope: https://www.googleapis.com/auth/drive.file
 * - Dedicated Folder: 'Anand Plates Backups'
 * - File naming: Anand-Plates-Backup-YYYYMMDD.json
 * - Two-day automatic backup cadence with missed-backup catch-up
 * - Full JSON backup matching application schema
 * - Preserves Marathi/Devanagari Unicode text
 */

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_FOLDER_NAME = 'Anand Plates Backups';
export const DATE_PREFIX = 'Anand-Plates-Backup-';
export const DATE_SUFFIX = '.json';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Web Client ID from existing Google Cloud Project
export const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_DRIVE_CLIENT_ID ||
  '215206829034-sqtfc0hh0jilfgq8onclu8k0a4jcao8l.apps.googleusercontent.com';

const KEY_EMAIL = 'anand_drive_backup_email';
const KEY_FOLDER_ID = 'anand_drive_backup_folder_id';
const KEY_LAST_BACKUP_AT = 'anand_drive_backup_last_backup_at';
const KEY_LAST_RESTORE_AT = 'anand_drive_backup_last_restore_at';
const KEY_AUTO_ENABLED = 'anand_drive_backup_auto_enabled';
const KEY_LAST_TEST_STATUS = 'anand_drive_backup_last_test_status';
const KEY_SAFETY_BACKUP = 'anand_safety_backup_before_restore';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenClientInstance: any = null;
let isBusy = false;

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: Date;
  backupDate: Date | null;
  size: number;
}

export interface DriveBackupSettings {
  connectedEmail: string | null;
  folderId: string | null;
  lastBackupAt: Date | null;
  lastRestoreAt: Date | null;
  automaticBackupEnabled: boolean;
  lastTestStatus: string | null;
  isConnected: boolean;
}

/**
 * Dynamically load Google Identity Services SDK script if not already present
 */
export function loadGsiScript(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).google?.accounts?.oauth2) return resolve(true);

    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK.'));
    document.head.appendChild(script);
  });
}

/**
 * Request OAuth 2.0 access token using Google Identity Services (GIS)
 */
export async function requestAccessToken({ prompt = '' }: { prompt?: string } = {}): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  await loadGsiScript();

  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is unavailable.');
  }

  return new Promise((resolve, reject) => {
    try {
      tokenClientInstance = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_FILE_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
              reject(new Error('Google sign-in was cancelled or access was denied.'));
            } else {
              reject(new Error(`Google authentication failed: ${response.error}`));
            }
            return;
          }
          if (!response.access_token) {
            reject(new Error('No access token received from Google.'));
            return;
          }

          cachedToken = response.access_token;
          const expiresInSec = Number(response.expires_in) || 3600;
          tokenExpiresAt = Date.now() + expiresInSec * 1000;
          resolve(cachedToken as string);
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Failed to initialize Google OAuth dialog.'));
        },
      });

      tokenClientInstance.requestAccessToken({ prompt });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fetch connected Google account profile from Drive API
 */
export async function fetchDriveUser(token: string): Promise<{ email: string | null; displayName: string | null }> {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to query Google Drive profile (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return {
    email: data.user?.emailAddress || null,
    displayName: data.user?.displayName || null,
  };
}

/**
 * Find or create dedicated application backup folder in Google Drive
 */
export async function findOrCreateBackupFolder(token: string, savedFolderId: string | null = null): Promise<string> {
  if (savedFolderId) {
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${savedFolderId}?fields=id,trashed,mimeType`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (checkRes.ok) {
        const file = await checkRes.json();
        if (!file.trashed && file.mimeType === 'application/vnd.google-apps.folder') {
          return savedFolderId;
        }
      }
    } catch (_) {
      // Fallback
    }
  }

  // Search existing active folder
  const queryParam = `mimeType='application/vnd.google-apps.folder' and name='${BACKUP_FOLDER_NAME}' and trashed=false`;
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryParam)}&spaces=drive&fields=files(id,name)&pageSize=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (listRes.ok) {
    const listData = await listRes.json();
    if (listData.files && listData.files.length > 0) {
      return listData.files[0].id;
    }
  }

  // Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    throw new Error(`Failed to create Google Drive backup folder: ${errText}`);
  }

  const created = await createRes.json();
  return created.id;
}

/**
 * List all backup files in the dedicated folder
 */
export async function listDriveBackups(token: string, folderId: string): Promise<DriveBackupFile[]> {
  const queryParam = `'${folderId}' in parents and trashed=false and (name contains '${DATE_PREFIX}' or name contains '.json')`;
  let pageToken: string | null = null;
  const backups: DriveBackupFile[] = [];

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', queryParam);
    url.searchParams.set('spaces', 'drive');
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('fields', 'nextPageToken,files(id,name,modifiedTime,size)');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to list Google Drive backups: ${errText}`);
    }

    const data = await res.json();
    const files = data.files || [];

    for (const file of files) {
      if (!file.id || !file.name) continue;
      const backupDate = backupDateFromFilename(file.name);
      backups.push({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(0),
        backupDate,
        size: Number(file.size) || 0,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  backups.sort(newestFirst);
  return backups;
}

/**
 * Upload UTF-8 JSON backup file to Google Drive using multipart upload
 */
export async function uploadBackupJson({
  token,
  folderId,
  filename,
  utf8Json,
  existingFileId = null,
}: {
  token: string;
  folderId: string;
  filename: string;
  utf8Json: string;
  existingFileId?: string | null;
}): Promise<string> {
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    ...(existingFileId ? {} : { parents: [folderId] }),
  };

  const boundary = '-------AnandPlatesBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    utf8Json +
    closeDelimiter;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to upload backup to Google Drive: ${errText}`);
  }

  const result = await res.json();
  return result.id;
}

/**
 * Download raw JSON text of a backup file from Google Drive
 */
export async function downloadBackupJson(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to download backup file from Google Drive: ${errText}`);
  }
  return await res.text();
}

/**
 * Test Google Drive connection by querying 1 file
 */
export async function testConnection(token: string, folderId: string): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&spaces=drive&pageSize=1&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Drive test failed with status: ${res.status}`);
  }
  return true;
}

// -----------------------------------------------------------------------------
// HELPER METHODS: Filenames, Dates, and Cadence
// -----------------------------------------------------------------------------

export function backupFilenameForDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${DATE_PREFIX}${y}${m}${d}${DATE_SUFFIX}`;
}

export function backupDateFromFilename(filename: string): Date | null {
  if (!filename) return null;
  // Match YYYYMMDD in filename
  const match = filename.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  return new Date(year, month - 1, day);
}

export function newestFirst(a: DriveBackupFile, b: DriveBackupFile): number {
  const ad = a.backupDate ? a.backupDate.getTime() : a.modifiedTime ? a.modifiedTime.getTime() : 0;
  const bd = b.backupDate ? b.backupDate.getTime() : b.modifiedTime ? b.modifiedTime.getTime() : 0;
  return bd - ad;
}

export function isBackupDue(lastBackupAt: Date | string | null, now: Date = new Date()): boolean {
  if (!lastBackupAt) return true;
  const last = typeof lastBackupAt === 'string' ? new Date(lastBackupAt) : lastBackupAt;
  if (isNaN(last.getTime())) return true;

  const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = currentDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 2;
}

// -----------------------------------------------------------------------------
// MAIN GOOGLE DRIVE BACKUP SERVICE
// -----------------------------------------------------------------------------

export const googleDriveBackupService = {
  getSettings: (): DriveBackupSettings => {
    const connectedEmail = localStorage.getItem(KEY_EMAIL) || null;
    const folderId = localStorage.getItem(KEY_FOLDER_ID) || null;
    const lastBackupRaw = localStorage.getItem(KEY_LAST_BACKUP_AT);
    const lastRestoreRaw = localStorage.getItem(KEY_LAST_RESTORE_AT);
    const autoEnabled = localStorage.getItem(KEY_AUTO_ENABLED) === 'true';
    const lastTestStatus = localStorage.getItem(KEY_LAST_TEST_STATUS) || null;

    return {
      connectedEmail,
      folderId,
      lastBackupAt: lastBackupRaw ? new Date(lastBackupRaw) : null,
      lastRestoreAt: lastRestoreRaw ? new Date(lastRestoreRaw) : null,
      automaticBackupEnabled: autoEnabled,
      lastTestStatus,
      isConnected: Boolean(connectedEmail),
    };
  },

  isBusy: () => isBusy,

  /**
   * Connect Google Drive account
   */
  connectGoogleDrive: async (getCurrentData: () => any) => {
    if (isBusy) throw new Error('A backup or restore operation is already in progress.');
    isBusy = true;
    try {
      const token = await requestAccessToken({ prompt: 'consent' });
      const user = await fetchDriveUser(token);
      if (!user.email) {
        throw new Error('Could not identify connected Google account email.');
      }

      const folderId = await findOrCreateBackupFolder(token, localStorage.getItem(KEY_FOLDER_ID));

      localStorage.setItem(KEY_EMAIL, user.email);
      localStorage.setItem(KEY_FOLDER_ID, folderId);

      // Check existing backups
      const existingBackups = await listDriveBackups(token, folderId);

      if (existingBackups.length === 0) {
        localStorage.setItem(KEY_AUTO_ENABLED, 'true');
        await googleDriveBackupService.backupNow(getCurrentData, { force: true });
        return {
          settings: googleDriveBackupService.getSettings(),
          existingBackups: [],
          firstBackupCreated: true,
        };
      }

      localStorage.setItem(KEY_AUTO_ENABLED, 'false');
      return {
        settings: googleDriveBackupService.getSettings(),
        existingBackups,
        firstBackupCreated: false,
      };
    } finally {
      isBusy = false;
    }
  },

  /**
   * Keep current data and enable 2-day auto backup
   */
  keepCurrentDataAndEnableBackups: async () => {
    localStorage.setItem(KEY_AUTO_ENABLED, 'true');
    return googleDriveBackupService.getSettings();
  },

  /**
   * Disconnect Google Drive account
   */
  disconnectGoogleDrive: async () => {
    if (isBusy) throw new Error('A backup or restore operation is already in progress.');
    isBusy = true;
    try {
      if (cachedToken && (window as any).google?.accounts?.oauth2?.revoke) {
        try {
          (window as any).google.accounts.oauth2.revoke(cachedToken, () => {});
        } catch (_) {}
      }
      cachedToken = null;
      tokenExpiresAt = 0;
      localStorage.removeItem(KEY_EMAIL);
      localStorage.removeItem(KEY_FOLDER_ID);
      localStorage.removeItem(KEY_LAST_TEST_STATUS);
      localStorage.setItem(KEY_AUTO_ENABLED, 'false');
      return true;
    } finally {
      isBusy = false;
    }
  },

  /**
   * Switch to a different Google account
   */
  changeGoogleAccount: async (getCurrentData: () => any) => {
    await googleDriveBackupService.disconnectGoogleDrive();
    return await googleDriveBackupService.connectGoogleDrive(getCurrentData);
  },

  /**
   * Test Drive connection
   */
  testDrive: async () => {
    if (isBusy) throw new Error('A backup or restore operation is already in progress.');
    isBusy = true;
    try {
      const settings = googleDriveBackupService.getSettings();
      if (!settings.isConnected) {
        throw new Error('Google Drive is not connected.');
      }
      const token = await requestAccessToken();
      const folderId = await findOrCreateBackupFolder(token, settings.folderId);
      await testConnection(token, folderId);
      const message = 'Drive connection successful';
      localStorage.setItem(KEY_LAST_TEST_STATUS, message);
      return message;
    } catch (err: any) {
      const message = `Drive test failed: ${err?.message || err}`;
      localStorage.setItem(KEY_LAST_TEST_STATUS, message);
      throw new Error(message);
    } finally {
      isBusy = false;
    }
  },

  /**
   * List available backups
   */
  listDriveBackups: async (): Promise<DriveBackupFile[]> => {
    const settings = googleDriveBackupService.getSettings();
    if (!settings.isConnected) {
      throw new Error('Google Drive is not connected.');
    }
    const token = await requestAccessToken();
    const folderId = await findOrCreateBackupFolder(token, settings.folderId);
    return await listDriveBackups(token, folderId);
  },

  /**
   * Backup Now
   */
  backupNow: async (getCurrentData: () => any, { force = false } = {}) => {
    if (isBusy) throw new Error('A backup or restore operation is already in progress.');
    isBusy = true;
    try {
      const settings = googleDriveBackupService.getSettings();
      if (!settings.isConnected) {
        return {
          uploaded: false,
          skipped: true,
          message: 'Google Drive is not connected.',
        };
      }

      if (!force && (!settings.automaticBackupEnabled || !isBackupDue(settings.lastBackupAt, new Date()))) {
        return {
          uploaded: false,
          skipped: true,
          message: 'Backup is not due yet.',
        };
      }

      const token = await requestAccessToken();
      const folderId = await findOrCreateBackupFolder(token, settings.folderId);
      const now = new Date();
      const filename = backupFilenameForDate(now);

      const existing = (await listDriveBackups(token, folderId)).filter((f) => f.name === filename);
      const existingFileId = existing.length > 0 ? existing[0].id : null;

      const rawData = getCurrentData();
      const payload = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        app: 'Anand Plates App',
        exportedAt: now.toISOString(),
        exportDateFormatted: now.toLocaleString('en-IN'),
        ...rawData,
      };
      const utf8Json = JSON.stringify(payload, null, 2);

      const fileId = await uploadBackupJson({
        token,
        folderId,
        filename,
        utf8Json,
        existingFileId,
      });

      localStorage.setItem(KEY_LAST_BACKUP_AT, now.toISOString());
      localStorage.setItem(KEY_AUTO_ENABLED, 'true');

      return {
        uploaded: true,
        skipped: false,
        fileId,
        filename,
        backupAt: now,
        message: `Backup completed: ${filename}`,
      };
    } finally {
      isBusy = false;
    }
  },

  /**
   * Background automatic backup check
   */
  maybeAutoBackup: async (getCurrentData: () => any) => {
    if (isBusy) return;
    try {
      const settings = googleDriveBackupService.getSettings();
      if (!settings.isConnected || !settings.automaticBackupEnabled) return;
      if (!isBackupDue(settings.lastBackupAt, new Date())) return;

      console.log('[ANAND DRIVE] Automatic backup is due. Running in background...');
      await googleDriveBackupService.backupNow(getCurrentData, { force: false });
      console.log('[ANAND DRIVE] Automatic backup finished successfully.');
    } catch (err: any) {
      console.warn('[ANAND DRIVE] Automatic backup failed:', err?.message);
    }
  },

  /**
   * Restore selected backup file
   */
  restoreSelectedBackup: async (
    selectedFile: DriveBackupFile,
    restoreDataFn: (data: any) => Promise<{ success: boolean; message: string }>,
    getCurrentDataFn: () => any
  ) => {
    if (isBusy) throw new Error('A backup or restore operation is already in progress.');
    isBusy = true;
    try {
      if (!selectedFile || !selectedFile.id) {
        throw new Error('No backup file selected.');
      }

      // Safety snapshot
      try {
        const currentData = getCurrentDataFn();
        localStorage.setItem(KEY_SAFETY_BACKUP, JSON.stringify(currentData));
      } catch (e) {
        console.warn('Could not save local safety backup:', e);
      }

      const token = await requestAccessToken();
      const rawJson = await downloadBackupJson(token, selectedFile.id);
      let parsedData: any;
      try {
        parsedData = JSON.parse(rawJson);
      } catch (_) {
        throw new Error('Invalid backup JSON format.');
      }

      const res = await restoreDataFn(parsedData);

      const now = new Date();
      localStorage.setItem(KEY_LAST_RESTORE_AT, now.toISOString());
      localStorage.setItem(KEY_AUTO_ENABLED, 'true');

      return {
        success: true,
        restoredAt: now,
        filename: selectedFile.name,
        backupDate: selectedFile.backupDate,
        message: res.message || 'Backup restored successfully',
      };
    } finally {
      isBusy = false;
    }
  },

  backupFilenameForDate,
  backupDateFromFilename,
  isBackupDue,
  newestFirst,
};

export default googleDriveBackupService;

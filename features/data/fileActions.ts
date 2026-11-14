import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Db } from '@/db/types';
import { todayKey } from '@/lib/dates';
import { buildDailyCsv, buildExport } from './exportData';
import { detectImport, type DetectedImport } from './format';

async function shareFile(
  name: string,
  content: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: name });
}

export async function exportJson(db: Db): Promise<void> {
  const payload = await buildExport(db);
  await shareFile(
    `oddech-${todayKey()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
    'public.json',
  );
}

export async function exportCsv(db: Db): Promise<void> {
  const payload = await buildExport(db);
  await shareFile(
    `oddech-dni-${todayKey()}.csv`,
    buildDailyCsv(payload),
    'text/csv',
    'public.comma-separated-values-text',
  );
}

/** Wybór pliku JSON i rozpoznanie formatu (bez zapisu – zapis po potwierdzeniu). Null = anulowano. */
export async function pickImportFile(): Promise<DetectedImport | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const text = await new File(result.assets[0].uri).text();
  return detectImport(text);
}

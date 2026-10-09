import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareBackupFile(text: string, dateKey: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('sharing-unavailable');
  const file = new File(Paths.cache, `Softday-${dateKey}.softday.json`);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    dialogTitle: '导出 Softday 数据',
    mimeType: 'application/json',
    UTI: 'public.json',
  });
}

export async function pickBackupFile() {
  const result = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain'] });
  if (result.canceled) return null;
  return result.result.text();
}

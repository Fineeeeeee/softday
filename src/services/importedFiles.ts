import { File } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { fileImportLimits, isSupportedTextFile, unsupportedFileReason } from '../domain/fileImport';
import type { ImportedFileSkip, ImportedTextDocument } from '../types';

export async function readImportedTextFiles(assets: DocumentPickerAsset[]) {
  const documents: ImportedTextDocument[] = [];
  const skippedFiles: ImportedFileSkip[] = [];
  let combinedCharacters = 0;

  for (const [index, asset] of assets.entries()) {
    if (index >= fileImportLimits.maxFiles) {
      skippedFiles.push({ name: asset.name, reason: `一次最多读取 ${fileImportLimits.maxFiles} 个文件` });
      continue;
    }
    if (!isSupportedTextFile(asset.name, asset.mimeType)) {
      skippedFiles.push({ name: asset.name, reason: unsupportedFileReason(asset.name) });
      continue;
    }

    try {
      const nativeFile = asset.file ? null : new File(asset.uri);
      const size = asset.size ?? nativeFile?.size;
      if (typeof size === 'number' && size > fileImportLimits.maxBytesPerFile) {
        skippedFiles.push({ name: asset.name, reason: '文件超过 256 KB' });
        continue;
      }
      const text = (asset.file ? await asset.file.text() : await nativeFile!.text()).replace(/\u0000/g, '').trim();
      if (!text) {
        skippedFiles.push({ name: asset.name, reason: '文件里没有可读取的文字' });
        continue;
      }
      if (combinedCharacters + text.length > fileImportLimits.maxCombinedCharacters) {
        skippedFiles.push({ name: asset.name, reason: '合计文字超过 30,000 字' });
        continue;
      }
      documents.push({ id: `file-${documents.length}`, name: asset.name, text });
      combinedCharacters += text.length;
    } catch {
      skippedFiles.push({ name: asset.name, reason: '没有读出这个文件' });
    }
  }

  return { documents, skippedFiles };
}

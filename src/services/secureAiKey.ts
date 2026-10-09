import * as SecureStore from 'expo-secure-store';

const keyName = 'softday.ai-api-key';

export async function hasStoredAiKey() {
  return Boolean(await SecureStore.getItemAsync(keyName));
}

export async function readAiKey() {
  return SecureStore.getItemAsync(keyName);
}

export async function saveAiKey(apiKey: string) {
  await SecureStore.setItemAsync(keyName, apiKey.trim());
}

export async function clearAiKey() {
  await SecureStore.deleteItemAsync(keyName);
}

const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const iconResource = '@drawable/softday_notification_icon';
const iconXml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="24dp"
  android:height="24dp"
  android:viewportWidth="108"
  android:viewportHeight="108">
  <path
    android:fillColor="@android:color/transparent"
    android:pathData="M20,55 C32,47 43,46 52,51 C61,56 64,70 72,70 C78,70 83,60 88,52 L96,40"
    android:strokeColor="#FFFFFFFF"
    android:strokeLineCap="round"
    android:strokeLineJoin="round"
    android:strokeWidth="10" />
  <path android:fillColor="#FFFFFFFF" android:pathData="M20,48 A7,7 0,1 0,20,62 A7,7 0,1 0,20,48" />
  <path android:fillColor="#FFFFFFFF" android:pathData="M50,46 A7,7 0,1 0,50,60 A7,7 0,1 0,50,46" />
</vector>
`;

module.exports = function withSoftdayNotificationIcon(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, 'com.google.firebase.messaging.default_notification_icon', iconResource, 'resource');
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, 'expo.modules.notifications.default_notification_icon', iconResource, 'resource');
    return modConfig;
  });

  return withDangerousMod(config, ['android', async (modConfig) => {
    const drawable = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'drawable');
    await fs.mkdir(drawable, { recursive: true });
    await fs.writeFile(path.join(drawable, 'softday_notification_icon.xml'), iconXml, 'utf8');
    return modConfig;
  }]);
};

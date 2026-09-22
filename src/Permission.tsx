import {Alert, Platform} from 'react-native';

import {
  requestMultiple,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

import {
  checkManagePermission,
  requestManagePermission,
} from 'manage-external-storage';


async function checkPermission() {
  // Gotta use it for because of type error
  if (Platform.OS !== 'android') {
    return true;
  }

  // Android 11+
  if (Platform.Version >= 30) {
    const hasAccess = await checkManagePermission();

    if (hasAccess) {
      return true;
    }

    Alert.alert(
      'All Files Access Required',
      'Allow this app to manage all files.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Allow',
          onPress: async () => {
            await requestManagePermission();
          },
        },
      ],
    );

    return false;
  }

  // Android 7 - 10
  const result =
    await requestMultiple([
      PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
    ]);

  return (
    result[PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE] === RESULTS.GRANTED &&
    result[PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE] === RESULTS.GRANTED
  );
}


export default checkPermission;
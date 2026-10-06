import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Take or choose a kitchen photo and shrink it to ~1024px JPEG. Small photos
// upload fast on mobile data and are plenty for spotting ingredients.
// Returns { uri, base64, mediaType } or null if the user cancelled.
// Throws { code: 'PERMISSION' } if camera/photos access was refused.
const MAX_SIDE = 1024;

export async function pickKitchenPhoto(source) {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    const err = new Error(source === 'camera' ? 'Camera access is off for Kya Khaun.' : 'Photo access is off for Kya Khaun.');
    err.code = 'PERMISSION';
    throw err;
  }

  const options = { mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width ?? 0, asset.height ?? 0) > MAX_SIDE) {
    context.resize((asset.width ?? 0) >= (asset.height ?? 0) ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.72, format: SaveFormat.JPEG, base64: true });
  return { uri: saved.uri, base64: saved.base64, mediaType: 'image/jpeg' };
}

import { Alert as RNAlert, Platform } from 'react-native';

export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Drop-in replacement for react-native's Alert.
 *
 * react-native-web implements Alert as `static alert() {}` — an empty function — so on web
 * every confirmation dialog and every error message silently does nothing. This routes web
 * through the browser's own dialogs and hands native straight to the real Alert.
 *
 * Import this instead of react-native's Alert; the call signature is unchanged.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;

  // Nothing to choose between: no buttons, or a single acknowledge button.
  if (!buttons || buttons.length < 2) {
    window.alert(body);
    buttons?.[0]?.onPress?.();
    return;
  }

  const confirmButton = buttons.find((b) => b.style !== 'cancel');
  const cancelButton = buttons.find((b) => b.style === 'cancel');

  // window.confirm only offers OK/Cancel, so spell out what OK does — on a delete
  // prompt an unlabelled "OK" is genuinely ambiguous.
  const prompt = confirmButton?.text ? `${body}\n\nOK = ${confirmButton.text}` : body;

  if (window.confirm(prompt)) confirmButton?.onPress?.();
  else cancelButton?.onPress?.();
}

export const Alert = { alert };

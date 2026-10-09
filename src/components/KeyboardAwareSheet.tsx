import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = { children: ReactNode; style: StyleProp<ViewStyle> };

export function KeyboardAwareSheet({ children, style }: Props) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none" style={styles.container}>
    <View style={style}>{children}</View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'flex-end' } });

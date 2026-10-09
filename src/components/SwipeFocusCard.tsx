import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii } from '../theme/tokens';

type Props = {
  children: ReactNode;
  enabled?: boolean;
  onComplete: () => void;
  revealColor: string;
};

export function SwipeFocusCard({ children, enabled = true, onComplete, revealColor }: Props) {
  const offset = useRef(new Animated.Value(0)).current;
  const crossedThreshold = useRef(false);
  const completeRef = useRef(onComplete);
  const [width, setWidth] = useState(320);
  completeRef.current = onComplete;

  const threshold = width * 0.36;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => enabled && gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderMove: (_, gesture) => {
      const next = Math.max(0, gesture.dx);
      offset.setValue(next);
      if (next >= threshold && !crossedThreshold.current) {
        crossedThreshold.current = true;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (next < threshold) crossedThreshold.current = false;
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx >= threshold || gesture.vx > 0.9) {
        Animated.timing(offset, { duration: 210, toValue: width + 80, useNativeDriver: true }).start(() => {
          offset.setValue(0);
          crossedThreshold.current = false;
          completeRef.current();
        });
        return;
      }
      crossedThreshold.current = false;
      Animated.spring(offset, { damping: 18, stiffness: 180, toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      crossedThreshold.current = false;
      Animated.spring(offset, { damping: 18, stiffness: 180, toValue: 0, useNativeDriver: true }).start();
    },
  }), [enabled, offset, threshold, width]);

  const rotation = offset.interpolate({ inputRange: [0, width], outputRange: ['0deg', '2.6deg'], extrapolate: 'clamp' });

  return <View style={styles.shadow}>
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.frame}>
      <View style={[styles.reveal, { backgroundColor: revealColor }]}><Ionicons color="rgba(255,255,255,0.92)" name="checkmark" size={28} /></View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX: offset }, { rotate: rotation }] }}>{children}</Animated.View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radii.lg, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 34, spreadDistance: -10, color: 'rgba(38,43,39,0.18)' }, { offsetX: 0, offsetY: 3, blurRadius: 10, spreadDistance: -3, color: 'rgba(38,43,39,0.08)' }] },
  frame: { borderRadius: radii.lg, overflow: 'hidden' },
  reveal: { ...StyleSheet.absoluteFill, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 28, borderRadius: radii.lg },
});

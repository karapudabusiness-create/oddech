import { GripVertical } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/i18n';
import { MIN_TOUCH, useTheme } from '@/theme';

interface Item {
  id: string;
  label: string;
}

/**
 * Lista z przeciąganiem (przytrzymaj uchwyt). Przeznaczona dla krótkich list (kilkanaście elementów) –
 * renderuje wszystkie elementy w zwykłym View, wysokości mierzy onLayout (obsługa dużej czcionki).
 * Dla czytników ekranu: akcje „Przesuń wyżej / niżej”.
 */
export function ReorderableList<T extends Item>({
  items,
  renderItem,
  onReorder,
  onDragStateChange,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onDragStateChange?: (dragging: boolean) => void;
}) {
  const heights = useSharedValue<number[]>(items.map(() => 72));
  const activeIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  // Kolejność optymistyczna po upuszczeniu – obowiązuje, dopóki baza nie odda nowej listy.
  const [optimistic, setOptimistic] = useState<{ base: T[]; order: T[] } | null>(null);
  const order = optimistic && optimistic.base === items ? optimistic.order : items;

  const commit = (from: number, to: number) => {
    onDragStateChange?.(false);
    if (from === to || from < 0 || to < 0) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setOptimistic({ base: items, order: next });
    onReorder(next.map((i) => i.id));
  };

  const move = (index: number, delta: number) =>
    commit(index, Math.max(0, Math.min(order.length - 1, index + delta)));

  return (
    <View>
      {order.map((item, index) => (
        <Row
          key={item.id}
          index={index}
          count={order.length}
          label={item.label}
          heights={heights}
          activeIndex={activeIndex}
          hoverIndex={hoverIndex}
          dragY={dragY}
          onDragStart={() => onDragStateChange?.(true)}
          onDrop={commit}
          onMove={(d) => move(index, d)}
        >
          {renderItem(item)}
        </Row>
      ))}
    </View>
  );
}

function Row({
  index,
  count,
  label,
  heights,
  activeIndex,
  hoverIndex,
  dragY,
  onDragStart,
  onDrop,
  onMove,
  children,
}: {
  index: number;
  count: number;
  label: string;
  heights: SharedValue<number[]>;
  activeIndex: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  onDragStart: () => void;
  onDrop: (from: number, to: number) => void;
  onMove: (delta: number) => void;
  children: ReactNode;
}) {
  const { colors, radii, scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    heights.modify((arr) => {
      'worklet';
      arr[index] = h;
      return arr;
    });
  };

  const pan = usePanGesture({
    activateAfterLongPress: 180,
    onActivate: () => {
      'worklet';
      activeIndex.set(index);
      hoverIndex.set(index);
      dragY.set(0);
      scheduleOnRN(onDragStart);
    },
    onUpdate: (e) => {
      'worklet';
      dragY.set(e.translationY);
      // Wyznacz docelowy indeks na podstawie skumulowanych wysokości.
      const h = heights.get();
      let target = index;
      let offset = e.translationY;
      if (offset > 0) {
        while (target < count - 1 && offset > (h[target + 1] ?? 0) / 2) {
          offset -= h[target + 1] ?? 0;
          target++;
        }
      } else {
        while (target > 0 && -offset > (h[target - 1] ?? 0) / 2) {
          offset += h[target - 1] ?? 0;
          target--;
        }
      }
      hoverIndex.set(target);
    },
    onDeactivate: () => {
      'worklet';
      const from = activeIndex.get();
      const to = hoverIndex.get();
      activeIndex.set(-1);
      hoverIndex.set(-1);
      dragY.set(0);
      scheduleOnRN(onDrop, from, to);
    },
  });

  const style = useAnimatedStyle(() => {
    const active = activeIndex.get();
    const hover = hoverIndex.get();
    if (active === index) {
      return {
        transform: [{ translateY: dragY.get() }, { scale: withTiming(1.02, { duration: 120 }) }],
        zIndex: 10,
        shadowOpacity: withTiming(scheme === 'dark' ? 0.4 : 0.12),
        elevation: 6,
      };
    }
    let shift = 0;
    if (active >= 0) {
      const h = heights.get()[active] ?? 0;
      if (active < index && hover >= index) shift = -h;
      if (active > index && hover <= index) shift = h;
    }
    return {
      transform: [
        { translateY: reduceMotion ? shift : withSpring(shift, { damping: 20, stiffness: 220 }) },
        { scale: 1 },
      ],
      zIndex: 0,
      shadowOpacity: 0,
      elevation: 0,
    };
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          shadowColor: colors.shadow,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <GestureDetector gesture={pan}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={strings.exercises.dragHandle(label)}
            accessibilityHint={strings.exercises.reorderHint}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
              ...(index > 0 ? [{ name: 'moveUp', label: strings.exercises.moveUp }] : []),
              ...(index < count - 1
                ? [{ name: 'moveDown', label: strings.exercises.moveDown }]
                : []),
            ]}
            onAccessibilityAction={(e) => {
              // VoiceOver: przesunięcie palcem w górę = increment = wyżej na liście.
              const a = e.nativeEvent.actionName;
              if (a === 'moveUp' || a === 'increment') onMove(-1);
              if (a === 'moveDown' || a === 'decrement') onMove(1);
            }}
            style={{
              width: MIN_TOUCH,
              minHeight: MIN_TOUCH,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GripVertical color={colors.textMuted} size={20} />
          </View>
        </GestureDetector>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </Animated.View>
  );
}

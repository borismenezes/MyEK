import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { WidgetConfig } from '@/types';

interface DraggableGridProps {
  items: WidgetConfig[];
  editing: boolean;
  onReorder: (next: WidgetConfig[]) => void;
  renderItem: (item: WidgetConfig, index: number) => React.ReactNode;
  onLongPressStart?: () => void;
  /** Horizontal padding the grid itself observes. */
  horizontalPadding?: number;
  gap?: number;
}

interface Slot {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  span: 1 | 2;
}

const ROW_HEIGHT_SMALL = 155;
const ROW_HEIGHT_LARGE = 200;

/**
 * iPhone-style draggable grid:
 *  - Two columns
 *  - Smalls take 1 column, larges span both
 *  - Long-press enters edit mode and the grid jiggles (handled by the parent)
 *  - In edit mode, an item can be dragged; on release we recompute slots and
 *    fire onReorder with the new ordering.
 *
 * Reanimated v3 + gesture-handler v2. Pure JS reordering — fine for ~20 items.
 */
export const DraggableGrid: React.FC<DraggableGridProps> = ({
  items,
  editing,
  onReorder,
  renderItem,
  onLongPressStart,
  horizontalPadding = 16,
  gap = 12,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const columnWidth = (screenWidth - horizontalPadding * 2 - gap) / 2;

  // Compute slot positions deterministically from the items list.
  //
  // Pack two-up: `small` takes 1 column, `large` takes both. We track `y`
  // inline as we walk the items. A `large` landing on col=1 pushes itself
  // (and y) to the next row — this is what was broken before: the previous
  // implementation's `computeY` helper recomputed y from the placed slots
  // and didn't see the "push to next row" event, which let a large overlap
  // a small at y=0.
  const slots = useMemo<Slot[]>(() => {
    let col = 0;
    let y = 0;
    let rowMaxHeight = 0;
    const out: Slot[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const span: 1 | 2 = it.layout.size === 'small' ? 1 : 2;

      // A 2-span item on col=1 wraps to the next row. Flush the current row.
      if (span === 2 && col === 1) {
        y += rowMaxHeight + gap;
        rowMaxHeight = 0;
        col = 0;
      }

      const itemHeight =
        span === 2
          ? it.layout.size === 'large'
            ? ROW_HEIGHT_LARGE
            : ROW_HEIGHT_SMALL
          : ROW_HEIGHT_SMALL;

      const x = horizontalPadding + col * (columnWidth + gap);
      out.push({
        index: i,
        x,
        y,
        width: span === 1 ? columnWidth : columnWidth * 2 + gap,
        height: itemHeight,
        span,
      });

      rowMaxHeight = Math.max(rowMaxHeight, itemHeight);
      col += span;

      // Row filled — advance y for the next iteration.
      if (col >= 2) {
        y += rowMaxHeight + gap;
        rowMaxHeight = 0;
        col = 0;
      }
    }
    return out;
  }, [items, columnWidth, gap]);

  const totalHeight = useMemo(() => {
    if (slots.length === 0) return 0;
    return Math.max(...slots.map(s => s.y + s.height)) + gap;
  }, [slots, gap]);

  return (
    <View style={{ height: totalHeight, position: 'relative' }}>
      {items.map((item, i) => (
        // Stable, identity-based key — never include the index. Including the
        // index churns the key when items shift (e.g. on remove), which forces
        // React to unmount/remount each downstream widget and triggers a fresh
        // data fetch (the "no data for a second" flicker).
        <GridItem
          key={item.widgetId}
          item={item}
          index={i}
          slots={slots}
          editing={editing}
          onReorder={onReorder}
          onLongPressStart={onLongPressStart}
          allItems={items}>
          {renderItem(item, i)}
        </GridItem>
      ))}
    </View>
  );
};

interface GridItemProps {
  item: WidgetConfig;
  index: number;
  slots: Slot[];
  editing: boolean;
  allItems: WidgetConfig[];
  onReorder: (next: WidgetConfig[]) => void;
  onLongPressStart?: () => void;
  children: React.ReactNode;
}

const GridItem: React.FC<GridItemProps> = ({ item, index, slots, editing, allItems, onReorder, onLongPressStart, children }) => {
  const slot = slots[index];
  const tx = useSharedValue(slot.x);
  const ty = useSharedValue(slot.y);
  const scale = useSharedValue(1);
  const z = useSharedValue(1);
  const [dragging, setDragging] = useState(false);

  // Snap to slot whenever the layout changes (after reorder, etc.)
  React.useEffect(() => {
    tx.value = withSpring(slot.x, { damping: 20, stiffness: 220 });
    ty.value = withSpring(slot.y, { damping: 20, stiffness: 220 });
  }, [slot.x, slot.y, tx, ty]);

  const performReorder = useCallback(
    (toIndex: number) => {
      if (toIndex === index || toIndex < 0 || toIndex >= allItems.length) return;
      const next = allItems.slice();
      const [removed] = next.splice(index, 1);
      next.splice(toIndex, 0, removed);
      onReorder(next);
    },
    [index, allItems, onReorder],
  );

  // Long press → enter edit mode (parent owns the boolean), then pan to drag.
  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      if (onLongPressStart) runOnJS(onLongPressStart)();
    });

  const pan = Gesture.Pan()
    .enabled(editing)
    .activateAfterLongPress(280)
    .onStart(() => {
      scale.value = withTiming(1.05, { duration: 120 });
      z.value = 10;
      runOnJS(setDragging)(true);
    })
    .onChange(e => {
      tx.value = slot.x + e.translationX;
      ty.value = slot.y + e.translationY;
    })
    .onEnd(e => {
      const dropX = slot.x + e.translationX + slot.width / 2;
      const dropY = slot.y + e.translationY + slot.height / 2;
      // Find the slot whose center is closest to the drop point.
      let bestIdx = index;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const s of slots) {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        const d = (cx - dropX) ** 2 + (cy - dropY) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = s.index;
        }
      }
      scale.value = withTiming(1, { duration: 120 });
      z.value = 1;
      runOnJS(setDragging)(false);
      if (bestIdx !== index) {
        runOnJS(performReorder)(bestIdx);
      } else {
        // Snap back
        tx.value = withSpring(slot.x);
        ty.value = withSpring(slot.y);
      }
    });

  const composed = Gesture.Race(pan, longPress);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: slot.width,
    height: slot.height,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: z.value,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[animStyle, dragging && { opacity: 0.95 }]}>{children}</Animated.View>
    </GestureDetector>
  );
};

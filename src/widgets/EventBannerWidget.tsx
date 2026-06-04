import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { EventItem, EventKind, EventsPayload, WidgetProps } from '@/types';

/**
 * EventBannerWidget — celebratory hero tile that surfaces the day's events.
 *
 * Drives off `EventsPayload`. Renders only events whose `date` matches the
 * device's local calendar day (`yyyy-mm-dd`), so the same payload can carry
 * future events without leaking into today's view. When two or more events
 * land on the same day the widget renders an iPhone-style stack of cards
 * — the front card auto-rotates every ~4.5s, with a faint card peeking out
 * behind to advertise the rest.
 *
 * The widget returns `null` when no events match today; the home grid is
 * responsible for filtering the layout so an empty event widget never
 * leaves a blank slot. (See HomeScreen — the layout filter still keeps
 * the entry visible inside the edit drawer.)
 */
export const EventBannerWidget: React.FC<WidgetProps<EventsPayload>> = ({ config, data, preview }) => {
  const todays = useTodayEvents(data?.events, { preview });
  if (todays.length === 0) return null;
  const compact = config.layout.size === 'small';
  return <EventStack events={todays} compact={compact} />;
};

/**
 * Public hook — exposed so HomeScreen can filter the events widget out of
 * the home grid when there's nothing to celebrate today, while still
 * including it in the edit drawer.
 *
 * `options.preview` short-circuits the date filter so the edit drawer
 * always shows a representative tile (otherwise the preview would render
 * blank on any day with no events). HomeScreen's call site does not pass
 * this flag, so its filter remains strictly today-only.
 */
export function useTodayEvents(
  events: EventItem[] | undefined,
  options: { preview?: boolean } = {},
): EventItem[] {
  return useMemo(() => {
    if (!events || events.length === 0) return [];
    if (options.preview) return events;
    const today = todayString();
    return events.filter(e => e.date === today);
  }, [events, options.preview]);
}

const EventStack: React.FC<{ events: EventItem[]; compact: boolean }> = ({ events, compact }) => {
  const [index, setIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  // Auto-advance every 7s. The 1100ms slide below means a card is
  // briefly in motion at the start of each dwell — the user sees ~6s
  // of stillness and ~1s of motion, a calm rhythm that doesn't compete
  // with the rest of the home grid for attention.
  useEffect(() => {
    if (events.length < 2) return;
    const id = setInterval(() => setIndex(i => (i + 1) % events.length), 7000);
    return () => clearInterval(id);
  }, [events.length]);

  // Carousel track — every card is laid out side-by-side in a single
  // horizontal row at full container width. Sliding the row's
  // translateX by `-index * trackWidth` brings each card into view in
  // turn, the way iOS Photos / Stocks pages between screens. No scale,
  // no opacity flicker — just a steady horizontal glide that reads as
  // "page n of N" rather than the previous size-and-fade morph.
  const offset = useSharedValue(0);
  useEffect(() => {
    if (trackWidth === 0) {
      // First measurement — snap into place without animating from 0.
      offset.value = -index * trackWidth;
      return;
    }
    offset.value = withTiming(-index * trackWidth, {
      duration: 1100,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [index, trackWidth, offset]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { flex: 1, flexDirection: 'row', width: trackWidth * events.length },
          trackStyle,
        ]}>
        {events.map(event => (
          <View key={event.id} style={{ width: trackWidth, height: '100%' }}>
            <EventCard event={event} compact={compact} />
          </View>
        ))}
      </Animated.View>

      {events.length > 1 ? <StackDots count={events.length} active={index} compact={compact} /> : null}
    </View>
  );
};

const EventCard: React.FC<{
  event: EventItem;
  compact: boolean;
  /** Render only the colour chrome — used by the peek-behind in the stack. */
  peekOnly?: boolean;
}> = ({ event, compact, peekOnly }) => {
  const theme = useTheme();
  const meta = visualMetaFor(event.kind);
  return (
    <View
      style={{
        flex: 1,
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        backgroundColor: event.color ?? meta.fallbackBg,
        padding: compact ? 14 : 18,
      }}>
      {event.color ? null : <GradientBg stops={meta.gradient} />}
      {!peekOnly ? <Confetti palette={meta.confetti} /> : null}
      {!peekOnly ? <Header icon={meta.icon} compact={compact} /> : null}
      {!peekOnly ? <Body event={event} compact={compact} /> : null}
    </View>
  );
};

const Header: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; compact: boolean }> = ({ icon, compact }) => (
  <View style={{ flexDirection: 'row', gap: compact ? 6 : 8, alignItems: 'center', position: 'relative' }}>
    <View
      style={{
        width: compact ? 22 : 32,
        height: compact ? 22 : 32,
        borderRadius: compact ? 7 : 10,
        backgroundColor: 'rgba(255,255,255,0.20)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={compact ? 12 : 18} color="white" />
    </View>
    <Text
      style={{
        color: 'rgba(255,255,255,0.85)',
        fontSize: compact ? widgetTheme.fontSize.caption : widgetTheme.fontSize.label,
        fontWeight: widgetTheme.fontWeight.bold,
        letterSpacing: 0.6,
      }}>
      TODAY
    </Text>
  </View>
);

const Body: React.FC<{ event: EventItem; compact: boolean }> = ({ event, compact }) => (
  <View style={{ flex: 1, justifyContent: compact ? 'flex-end' : 'flex-start', marginTop: compact ? 0 : 14, position: 'relative' }}>
    <Text
      style={{
        color: 'white',
        fontSize: compact ? widgetTheme.fontSize.titleLg : widgetTheme.fontSize.headline,
        fontWeight: widgetTheme.fontWeight.heavy,
        letterSpacing: -0.4,
        lineHeight: compact ? 21 : 26,
      }}
      numberOfLines={compact ? 2 : 3}>
      {event.title}
    </Text>
    {!compact && event.message ? (
      <Text
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: widgetTheme.fontSize.body,
          marginTop: 8,
          lineHeight: 17,
        }}
        numberOfLines={3}>
        {event.message}
      </Text>
    ) : null}
    {compact && event.perks && event.perks.length > 0 ? (
      <Text
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: widgetTheme.fontSize.label,
          marginTop: 6,
        }}
        numberOfLines={1}>
        🎁 {event.perks[0].label}
      </Text>
    ) : null}
  </View>
);

const StackDots: React.FC<{ count: number; active: number; compact: boolean }> = ({ count, active, compact }) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      bottom: compact ? 8 : 12,
      right: compact ? 12 : 16,
      flexDirection: 'row',
      gap: 4,
    }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          width: i === active ? 14 : 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: i === active ? 'white' : 'rgba(255,255,255,0.5)',
        }}
      />
    ))}
  </View>
);

// ─── Visual variants per event kind ────────────────────────────────────────

interface EventVisualMeta {
  gradient: { color: string; offset: number }[];
  confetti: string[];
  icon: React.ComponentProps<typeof Icon>['name'];
  fallbackBg: string;
}

const VISUAL_META: Record<EventKind, EventVisualMeta> = {
  birthday: {
    gradient: [
      { color: '#8B0000', offset: 0 },
      { color: '#C60C30', offset: 0.6 },
      { color: '#C49E4E', offset: 1 },
    ],
    confetti: ['#ffd9a3', '#ffffff', '#ffb3b3', '#fff2cc'],
    icon: 'cake',
    fallbackBg: '#8B0000',
  },
  newYear: {
    gradient: [
      { color: '#0F1B3A', offset: 0 },
      { color: '#3B2F87', offset: 0.55 },
      { color: '#C49E4E', offset: 1 },
    ],
    confetti: ['#fff2cc', '#ffffff', '#c4b5fd', '#fcd34d'],
    icon: 'sparkles',
    fallbackBg: '#0F1B3A',
  },
  anniversary: {
    gradient: [
      { color: '#3B2A12', offset: 0 },
      { color: '#9C6B1F', offset: 0.6 },
      { color: '#E0B559', offset: 1 },
    ],
    confetti: ['#fde68a', '#ffffff', '#fcd34d', '#facc15'],
    icon: 'medal',
    fallbackBg: '#3B2A12',
  },
  holiday: {
    gradient: [
      { color: '#0B3D2E', offset: 0 },
      { color: '#0F8A6A', offset: 0.6 },
      { color: '#C49E4E', offset: 1 },
    ],
    confetti: ['#bbf7d0', '#ffffff', '#86efac', '#fff2cc'],
    icon: 'globe',
    fallbackBg: '#0B3D2E',
  },
  company: {
    gradient: [
      { color: '#5B0610', offset: 0 },
      { color: '#C60C30', offset: 0.6 },
      { color: '#1F1F1F', offset: 1 },
    ],
    confetti: ['#ffd9a3', '#ffffff', '#ffb3b3'],
    icon: 'briefcase',
    fallbackBg: '#5B0610',
  },
};

function visualMetaFor(kind: EventKind): EventVisualMeta {
  return VISUAL_META[kind] ?? VISUAL_META.birthday;
}

/**
 * Approximation of CSS linear-gradient via stacked semi-transparent Views.
 * Views fill `top/left/right/bottom: 0` reliably — SVG percentages without
 * a viewBox were leaving gaps at the edges of the card. In a real codebase
 * swap to `react-native-linear-gradient`.
 */
const GradientBg: React.FC<{ stops: { color: string; offset: number }[] }> = ({ stops }) => (
  <>
    {stops.map((s, i) => (
      <View
        key={i}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: s.color,
          opacity: i === 0 ? 1 : 1 - s.offset,
        }}
      />
    ))}
  </>
);

const Confetti: React.FC<{ palette: string[] }> = ({ palette }) => (
  <Svg
    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45 }}
    width="100%"
    height="100%"
    viewBox="0 0 160 160"
    preserveAspectRatio="none">
    {Array.from({ length: 14 }).map((_, i) => {
      const x = (i * 23) % 160;
      const y = (i * 17) % 160;
      const c = palette[i % palette.length];
      return (
        <Rect
          key={i}
          x={x}
          y={y}
          width={i % 2 ? 3 : 5}
          height={i % 3 ? 2 : 7}
          fill={c}
          transform={`rotate(${(i * 31) % 360} ${x} ${y})`}
        />
      );
    })}
  </Svg>
);

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

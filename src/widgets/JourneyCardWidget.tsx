import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';
import type { MyTripsPayload, WidgetProps } from '@/types';
import { WidgetHeader } from './WidgetHeader';

/**
 * JourneyCardWidget — generic, application-agnostic origin-to-destination
 * journey card tile. Sits on the standard widget surface so it visually
 * matches the rest of the home grid; the gold plane icon is the only
 * travel-specific accent.
 *
 *  - small: route, times, seat + booking ref.
 *  - large: same plus flight number, gate, terminal, status pill.
 */
export const JourneyCardWidget: React.FC<WidgetProps<MyTripsPayload>> = ({ config, data }) => {
  if (!data) return null;
  const label = config.applicationName ?? 'MY TRIPS';
  if (config.layout.size === 'small') return <JourneyCardSmall data={data} label={label} />;
  return <JourneyCardLarge data={data} label={label} />;
};

const JourneyCardSmall: React.FC<{ data: MyTripsPayload; label: string }> = ({ data, label }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <Header label={label} subtitle={`${data.travelType} · ${data.date}`} />
      <RouteRow data={data} routeFontSize={widgetTheme.fontSize.headline} />
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>
        Seat {data.seat} · {data.bookingRef}
      </Text>
    </View>
  );
};

const JourneyCardLarge: React.FC<{ data: MyTripsPayload; label: string }> = ({ data, label }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <Header label={label} subtitle={`${data.travelType} · ${data.date}`} />
      <RouteRow data={data} routeFontSize={widgetTheme.fontSize.display} />
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {data.flightNumber ? <DetailColumn label="Flight" value={data.flightNumber} /> : null}
        {data.gate ? <DetailColumn label="Gate" value={data.gate} /> : null}
        {data.terminal ? <DetailColumn label="Terminal" value={`T${data.terminal}`} /> : null}
        <DetailColumn label="Seat" value={data.seat} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
          {data.bookingRef}
        </Text>
        {data.status ? <StatusPill status={data.status} /> : null}
      </View>
    </View>
  );
};

const Header: React.FC<{ label: string; subtitle: string }> = ({ label, subtitle }) => {
  const theme = useTheme();
  return (
    <View>
      <WidgetHeader
        icon="plane-flat"
        label={label}
        iconBg="rgba(196,158,78,0.18)"
        iconColor={theme.colors.ekGold}
      />
      <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, marginTop: 4 }}>
        {subtitle}
      </Text>
    </View>
  );
};

const RouteRow: React.FC<{ data: MyTripsPayload; routeFontSize: number }> = ({ data, routeFontSize }) => {
  const theme = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text
          style={{
            color: theme.colors.ink,
            fontSize: routeFontSize,
            fontWeight: widgetTheme.fontWeight.heavy,
            letterSpacing: -0.5,
            lineHeight: routeFontSize + 2,
          }}>
          {data.origin}
        </Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <DashedLine color={theme.colors.line} />
          <Icon name="plane-flat" size={14} color={theme.colors.ekGold} />
          <DashedLine color={theme.colors.line} />
        </View>
        <Text
          style={{
            color: theme.colors.ink,
            fontSize: routeFontSize,
            fontWeight: widgetTheme.fontWeight.heavy,
            letterSpacing: -0.5,
            lineHeight: routeFontSize + 2,
          }}>
          {data.destination}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: theme.colors.muted, fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.semibold }}>
          {data.departureTime}
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: widgetTheme.fontSize.label, fontWeight: widgetTheme.fontWeight.semibold }}>
          {data.arrivalTime}
        </Text>
      </View>
    </View>
  );
};

const DashedLine: React.FC<{ color: string }> = ({ color }) => (
  <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={i} style={{ flex: 1, height: 1, backgroundColor: color }} />
    ))}
  </View>
);

const DetailColumn: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ color: theme.colors.muted, fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: theme.colors.ink, fontSize: widgetTheme.fontSize.bodyEmphasis, fontWeight: widgetTheme.fontWeight.bold, marginTop: 1 }}>
        {value}
      </Text>
    </View>
  );
};

const StatusPill: React.FC<{ status: NonNullable<MyTripsPayload['status']> }> = ({ status }) => {
  const theme = useTheme();
  const map = {
    on_time: { label: 'On time', bg: theme.colors.greenSoft, fg: theme.colors.green },
    boarding: { label: 'Boarding', bg: 'rgba(196,158,78,0.18)', fg: theme.colors.ekGold },
    delayed: { label: 'Delayed', bg: 'rgba(198,12,48,0.10)', fg: theme.colors.ekRed },
  } as const;
  const { label, bg, fg } = map[status];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: fg, fontSize: widgetTheme.fontSize.caption, fontWeight: widgetTheme.fontWeight.bold }}>{label}</Text>
    </View>
  );
};

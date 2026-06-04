import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card, Icon } from '@components/index';
import { applicationDetailService } from '@services/applicationDetailService';
import { useTheme, widgetTheme } from '@theme/index';
import type { PlatinumVoucher, PlatinumVouchersPayload } from '@/types';
import type { DetailLayoutProps } from './DetailLayoutRegistry';

/**
 * Detail layout for `manifest.detail.layout === 'vouchers'`.
 *
 * Renders the user's Platinum-card-purchased vouchers (Lulu, Carrefour,
 * Careem, Noon, Global Village …). Sorted with active first then most-
 * recently expired, so the user's redeemable inventory is at the top.
 */
export const PlatinumVouchersDetailLayout: React.FC<DetailLayoutProps> = ({ entry }) => {
  const theme = useTheme();
  const [data, setData] = useState<PlatinumVouchersPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    applicationDetailService
      .fetch<PlatinumVouchersPayload>(entry.appName, {
        endpoint: entry.detail?.endpoint,
        apiVersion: entry.detail?.apiVersion,
      })
      .then(d => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load vouchers');
      });
    return () => {
      cancelled = true;
    };
  }, [entry.appName, entry.detail?.endpoint, entry.detail?.apiVersion]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.ekRed, fontSize: widgetTheme.fontSize.label }}>{error}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.ekRed} />
      </View>
    );
  }

  // Sort: active first (by soonest expiry), then used/expired by most-recent purchase.
  const sorted = [...data.vouchers].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'active') return -1;
      if (b.status === 'active') return 1;
    }
    if (a.status === 'active') {
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    }
    return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
  });
  const activeCount = data.vouchers.filter(v => v.status === 'active').length;

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <SummaryCard total={data.totalActiveAmount} currency={data.currency} activeCount={activeCount} />

      <SectionLabel title="VOUCHERS" />
      <View style={{ gap: 10 }}>
        {sorted.map(v => (
          <VoucherCard key={v.id} voucher={v} />
        ))}
      </View>
    </View>
  );
};

const SummaryCard: React.FC<{ total: number; currency: string; activeCount: number }> = ({
  total,
  currency,
  activeCount,
}) => {
  const theme = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: 'rgba(196,158,78,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="gift" size={24} color={theme.colors.ekGold} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              fontSize: widgetTheme.fontSize.micro,
              fontWeight: widgetTheme.fontWeight.bold,
              color: theme.colors.muted,
              letterSpacing: 0.6,
            }}>
            ACTIVE BALANCE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Text
              style={{
                fontSize: widgetTheme.fontSize.headline,
                fontWeight: widgetTheme.fontWeight.heavy,
                color: theme.colors.ink,
                letterSpacing: -0.4,
              }}>
              {formatAmount(total)}
            </Text>
            <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
              {currency}
            </Text>
          </View>
          <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted }}>
            {activeCount} {activeCount === 1 ? 'voucher' : 'vouchers'} ready to use
          </Text>
        </View>
      </View>
    </Card>
  );
};

const VoucherCard: React.FC<{ voucher: PlatinumVoucher }> = ({ voucher }) => {
  const theme = useTheme();
  const tone = statusTone(voucher.status, theme);
  const dimmed = voucher.status !== 'active';
  return (
    <Card style={dimmed ? { opacity: 0.68 } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 4,
            alignSelf: 'stretch',
            borderRadius: 2,
            backgroundColor: tone.bar,
          }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text
              style={{ fontSize: widgetTheme.fontSize.titleSm, fontWeight: widgetTheme.fontWeight.bold, color: theme.colors.ink }}
              numberOfLines={1}>
              {voucher.vendor}
            </Text>
            <StatusBadge status={voucher.status} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <Text
              style={{
                fontSize: widgetTheme.fontSize.titleLg,
                fontWeight: widgetTheme.fontWeight.heavy,
                color: theme.colors.ekRed,
                letterSpacing: -0.3,
              }}>
              {formatAmount(voucher.amount)}
            </Text>
            <Text style={{ fontSize: widgetTheme.fontSize.label, color: theme.colors.muted, fontWeight: widgetTheme.fontWeight.semibold }}>
              {voucher.currency}
            </Text>
          </View>

          {/* Two equal columns spanning the inner card width so the dates
              span the full ~60% of the screen the card occupies, instead
              of hugging left in a tight pair. */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Meta label="Purchased" value={formatDate(voucher.purchasedAt)} />
            </View>
            <View style={{ flex: 1 }}>
              <Meta label="Expires" value={formatDate(voucher.expiresAt)} accent={voucher.status === 'active'} />
            </View>
          </View>

          {voucher.code ? (
            <View
              style={{
                marginTop: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: theme.colors.bg,
                alignSelf: 'flex-start',
              }}>
              <Text
                style={{
                  fontSize: widgetTheme.fontSize.label,
                  fontWeight: widgetTheme.fontWeight.bold,
                  color: theme.colors.ink,
                  letterSpacing: 1.4,
                  fontVariant: ['tabular-nums'],
                }}
                selectable>
                {voucher.code}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const Meta: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.micro,
          fontWeight: widgetTheme.fontWeight.bold,
          color: theme.colors.muted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.body,
          fontWeight: widgetTheme.fontWeight.semibold,
          color: accent ? theme.colors.ink : theme.colors.inkSecondary,
          marginTop: 3,
          letterSpacing: -0.2,
        }}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const StatusBadge: React.FC<{ status: PlatinumVoucher['status'] }> = ({ status }) => {
  const theme = useTheme();
  const tone = statusTone(status, theme);
  return (
    <View style={{ backgroundColor: tone.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ fontSize: widgetTheme.fontSize.micro, fontWeight: widgetTheme.fontWeight.bold, color: tone.fg, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {status}
      </Text>
    </View>
  );
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: widgetTheme.fontSize.body,
        fontWeight: widgetTheme.fontWeight.bold,
        color: theme.colors.muted,
        letterSpacing: 1.5,
        paddingHorizontal: 4,
      }}>
      {title}
    </Text>
  );
};

function statusTone(
  status: PlatinumVoucher['status'],
  theme: ReturnType<typeof useTheme>,
): { bg: string; fg: string; bar: string } {
  switch (status) {
    case 'active':
      return { bg: theme.colors.greenSoft, fg: theme.colors.green, bar: theme.colors.green };
    case 'used':
      return { bg: theme.colors.bg, fg: theme.colors.muted, bar: theme.colors.line };
    case 'expired':
      return { bg: 'rgba(198,12,48,0.10)', fg: theme.colors.ekRed, bar: theme.colors.ekRed };
  }
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-GB');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
});

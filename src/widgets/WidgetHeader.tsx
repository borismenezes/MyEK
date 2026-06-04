import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from '@components/index';
import { useTheme, widgetTheme } from '@theme/index';

type IconProp = React.ComponentProps<typeof Icon>['name'];

interface WidgetHeaderProps {
  icon: IconProp;
  label: string;
  /** Override the icon-bubble background. Defaults to a soft-red tint. */
  iconBg?: string;
  /** Override the icon stroke colour. Defaults to `theme.colors.ekRed`. */
  iconColor?: string;
}

/**
 * Standard widget header — small tinted icon bubble + uppercase label.
 * Shared by widgets that follow the iOS-style "label + stat" layout
 * (Timesheet, Documents, Applications, Appreciations, etc.).
 */
export const WidgetHeader: React.FC<WidgetHeaderProps> = ({ icon, label, iconBg, iconColor }) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          backgroundColor: iconBg ?? 'rgba(198,12,48,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={14} color={iconColor ?? theme.colors.ekRed} />
      </View>
      <Text
        style={{
          fontSize: widgetTheme.fontSize.label,
          fontWeight: widgetTheme.fontWeight.bold,
          color: theme.colors.mutedStrong,
          letterSpacing: 0.6,
          // Uppercase via CSS so callers can pass either pre-uppercased
          // strings ("DOCUMENTS") or natural casing ("Leave Balance" coming
          // straight from the applications manifest) and get the same look.
          textTransform: 'uppercase',
        }}>
        {label}
      </Text>
    </View>
  );
};

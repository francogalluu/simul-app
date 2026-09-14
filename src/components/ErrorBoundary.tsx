import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react-native';

import { getPalette } from '@/lib/theme';
import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Fallback UI shown when the boundary catches a render error.
 * Uses hooks so it must be a child of ThemeProvider; ErrorBoundary is placed inside ThemeProvider.
 */
function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const darkMode = useSettingsStore(s => s.darkMode);
  const colors = getPalette(darkMode);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      <View style={s.container}>
        <View style={[s.iconWrap, { backgroundColor: colors.dangerSoft }]}>
          <AlertCircle size={48} color={colors.danger} strokeWidth={2} />
        </View>
        <Text style={[s.title, { color: colors.text1 }]}>{t('errorBoundary.title')}</Text>
        <Text style={[s.message, { color: colors.text2 }]}>{t('errorBoundary.message')}</Text>
        {__DEV__ && error?.message ? (
          <Text style={[s.detail, { color: colors.text3 }]} numberOfLines={5}>
            {error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            s.button,
            { backgroundColor: colors.teal, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('errorBoundary.tryAgain')}
        >
          <Text style={s.buttonText}>{t('errorBoundary.tryAgain')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/**
 * Catches JavaScript errors in the child tree and displays a fallback UI
 * instead of a white screen. Wrap the main app content (inside ThemeProvider
 * so the fallback can use theme).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback error={this.state.error} onRetry={this.reset} />
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  detail: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

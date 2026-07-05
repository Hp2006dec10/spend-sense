import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/utils/api';
import { Colors } from '@/constants/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
};

export default function AnalyticsScreen() {
  const scheme = useColorScheme() || 'light';
  const insets = useSafeAreaInsets();
  const colors = {
    ...(Colors[scheme] || Colors.light),
    backgroundElement: scheme === 'dark' ? '#212225' : '#F0F0F3',
    backgroundSelected: scheme === 'dark' ? '#2E3135' : '#E0E1E6',
    textSecondary: scheme === 'dark' ? '#B0B4BA' : '#60646C',
  };

  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [walletPieData, setWalletPieData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab State for Pie Chart (Expense vs Income breakdown)
  const [breakdownType, setBreakdownType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  // Tab State for Wallet Pie Chart (Expense vs Income breakdown)
  const [walletBreakdownType, setWalletBreakdownType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const fetchAnalyticsData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [summaryRes, pieRes, trendsRes, walletPieRes] = await Promise.all([
        apiFetch('/analytics/summary'),
        apiFetch(`/analytics/pie-chart?type=${breakdownType}`),
        apiFetch('/analytics/trends'),
        apiFetch(`/analytics/wallet-pie-chart?type=${walletBreakdownType}`),
      ]);
      setSummary(summaryRes);
      setPieData(pieRes);
      setTrendsData(trendsRes);
      setWalletPieData(walletPieRes);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalyticsData();
    }, [breakdownType, walletBreakdownType, isAuthenticated])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCY_SYMBOLS[code?.toUpperCase()] || code || '₹';
  };

  const formatAmount = (amount: number, currencyCode: string) => {
    const symbol = getCurrencySymbol(currencyCode);
    const absVal = Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${amount < 0 ? '-' : ''}${symbol}${absVal}`;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: Spacing.two, color: colors.text }}>Loading insights...</Text>
      </View>
    );
  }

  // Calculate some insights
  const preferredCurrency = summary?.preferredCurrency || 'INR';
  const savingsRate =
    summary && summary.totalIncome > 0
      ? Math.round((summary.totalBalance / summary.totalIncome) * 100)
      : 0;

  // Find max value in monthly trend to scale vertical bars
  const trendMaxVal =
    trendsData?.trends && trendsData.trends.length > 0
      ? Math.max(...trendsData.trends.map((t: any) => Math.max(t.income, t.expense, 100)))
      : 100;


  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
        }
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/spend-sense-app-icon.png')}
              style={styles.headerLogo}
              resizeMode="cover"
            />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics & Insights</Text>
          </View>



          {/* Monthly Trend Bars (Income vs Expense) */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Trends</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#2ECC71' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#E74C3C' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text>
              </View>
            </View>

            {trendsData?.trends && trendsData.trends.length > 0 ? (
              <View style={styles.barChartContainer}>
                {trendsData.trends.map((t: any, index: number) => {
                  // Compute heights relative to trendMaxVal
                  const incomeHeight = (t.income / trendMaxVal) * 110;
                  const expenseHeight = (t.expense / trendMaxVal) * 110;

                  return (
                    <View key={index} style={styles.barColumn}>
                      <View style={styles.barsContainer}>
                        {/* Income Bar */}
                        <View
                          style={[
                            styles.verticalBar,
                            {
                              height: Math.max(incomeHeight, 2),
                              backgroundColor: '#2ECC71',
                            },
                          ]}
                        />
                        {/* Expense Bar */}
                        <View
                          style={[
                            styles.verticalBar,
                            {
                              height: Math.max(expenseHeight, 2),
                              backgroundColor: '#E74C3C',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                        {t.month}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: colors.textSecondary, padding: Spacing.four }}>
                No monthly trend data available.
              </Text>
            )}
          </View>

          {/* Category Breakdown (Pie Chart Equivalent) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
              Category Distribution
            </Text>
            <View style={styles.breakdownTypeToggle}>
              <Pressable
                onPress={() => setBreakdownType('EXPENSE')}
                style={[
                  styles.toggleBtn,
                  breakdownType === 'EXPENSE'
                    ? { backgroundColor: '#E74C3C' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.toggleBtnText, breakdownType === 'EXPENSE' ? { color: '#fff' } : { color: colors.text }]}>
                  Spent
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBreakdownType('INCOME')}
                style={[
                  styles.toggleBtn,
                  breakdownType === 'INCOME'
                    ? { backgroundColor: '#2ECC71' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.toggleBtnText, breakdownType === 'INCOME' ? { color: '#fff' } : { color: colors.text }]}>
                  Income
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
            {pieData?.categories && pieData.categories.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: Spacing.four }}>
                {/* Pie Chart SVG representation */}
                <View style={{ position: 'relative', width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>
                  <Svg width="140" height="140" viewBox="0 0 120 120">
                    {/* Base track circle */}
                    <Circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="transparent"
                      stroke={scheme === 'dark' ? '#2E3135' : '#E0E1E6'}
                      strokeWidth="12"
                    />
                    {/* Slices */}
                    {(() => {
                      const radius = 45;
                      const circumference = 2 * Math.PI * radius; // ~282.74
                      let accumulatedPercentage = 0;

                      return pieData.categories.map((c: any) => {
                        const strokeDasharray = `${(c.percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -(accumulatedPercentage / 100) * circumference;
                        accumulatedPercentage += c.percentage;

                        return (
                          <Circle
                            key={c.id}
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="transparent"
                            stroke={c.color || '#4A90E2'}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 60 60)"
                          />
                        );
                      });
                    })()}
                  </Svg>

                  {/* Center text inside the donut hole */}
                  <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 'bold', letterSpacing: 0.5 }}>TOTAL</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: 'bold', marginTop: 2 }}>
                      {formatAmount(pieData.totalVolume || 0, preferredCurrency)}
                    </Text>
                  </View>
                </View>

                {/* Legend List */}
                <View style={{ flex: 1, minWidth: 180, gap: Spacing.two }}>
                  {pieData.categories.map((c: any) => (
                    <View key={c.id} style={styles.distributionItem}>
                      <View style={styles.distributionMeta}>
                        <View style={[styles.categoryColorCircle, { backgroundColor: c.color }]} />
                        <Text style={[styles.categoryNameText, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={[styles.categoryPctText, { color: colors.textSecondary, fontSize: 11 }]}>
                          {c.percentage.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[styles.categoryAmountText, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>
                        {formatAmount(c.amount, preferredCurrency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: colors.textSecondary, padding: Spacing.four }}>
                No distribution data available for this type.
              </Text>
            )}
          </View>

          {/* Wallet Distribution */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
              Wallet Distribution
            </Text>
            <View style={styles.breakdownTypeToggle}>
              <Pressable
                onPress={() => setWalletBreakdownType('EXPENSE')}
                style={[
                  styles.toggleBtn,
                  walletBreakdownType === 'EXPENSE'
                    ? { backgroundColor: '#E74C3C' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.toggleBtnText, walletBreakdownType === 'EXPENSE' ? { color: '#fff' } : { color: colors.text }]}>
                  Spent
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setWalletBreakdownType('INCOME')}
                style={[
                  styles.toggleBtn,
                  walletBreakdownType === 'INCOME'
                    ? { backgroundColor: '#2ECC71' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.toggleBtnText, walletBreakdownType === 'INCOME' ? { color: '#fff' } : { color: colors.text }]}>
                  Income
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement, marginBottom: Spacing.four }]}>
            {walletPieData?.wallets && walletPieData.wallets.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: Spacing.four }}>
                {/* Pie Chart SVG representation */}
                <View style={{ position: 'relative', width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>
                  <Svg width="140" height="140" viewBox="0 0 120 120">
                    {/* Base track circle */}
                    <Circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="transparent"
                      stroke={scheme === 'dark' ? '#2E3135' : '#E0E1E6'}
                      strokeWidth="12"
                    />
                    {/* Slices */}
                    {(() => {
                      const radius = 45;
                      const circumference = 2 * Math.PI * radius; // ~282.74
                      let accumulatedPercentage = 0;

                      return walletPieData.wallets.map((w: any) => {
                        const strokeDasharray = `${(w.percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -(accumulatedPercentage / 100) * circumference;
                        accumulatedPercentage += w.percentage;

                        return (
                          <Circle
                            key={w.id}
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="transparent"
                            stroke={w.color || '#4A90E2'}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 60 60)"
                          />
                        );
                      });
                    })()}
                  </Svg>

                  {/* Center text inside the donut hole */}
                  <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: 'bold', letterSpacing: 0.5 }}>TOTAL</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: 'bold', marginTop: 2 }}>
                      {formatAmount(walletPieData.totalVolume || 0, preferredCurrency)}
                    </Text>
                  </View>
                </View>

                {/* Legend List */}
                <View style={{ flex: 1, minWidth: 180, gap: Spacing.two }}>
                  {walletPieData.wallets.map((w: any) => (
                    <View key={w.id} style={styles.distributionItem}>
                      <View style={styles.distributionMeta}>
                        <View style={[styles.categoryColorCircle, { backgroundColor: w.color }]} />
                        <Text style={[styles.categoryNameText, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>
                          {w.name}
                        </Text>
                        <Text style={[styles.categoryPctText, { color: colors.textSecondary, fontSize: 11 }]}>
                          {w.percentage.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[styles.categoryAmountText, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>
                        {formatAmount(w.amount, preferredCurrency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: colors.textSecondary, padding: Spacing.four }}>
                No distribution data available for wallets.
              </Text>
            )}
          </View>


        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  insightCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  chartCard: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: Spacing.two,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.half,
    height: 110,
    marginBottom: Spacing.one,
  },
  verticalBar: {
    width: 8,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  breakdownTypeToggle: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  toggleBtn: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  distributionBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  distributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  distributionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoryColorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPctText: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryAmountText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  compareValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  compareBarBg: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  compareBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

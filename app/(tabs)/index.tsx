import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Alert,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { apiFetch } from '@/utils/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { MarkdownText } from '@/components/ui/markdown-text';


// Local Spacing token fallback
const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export default function HomeScreen() {
  const scheme = useColorScheme() || 'light';
  const insets = useSafeAreaInsets();

  // Local Theme Colors fallback using system color tokens
  const colors = {
    ...(Colors[scheme] || Colors.light),
    backgroundElement: scheme === 'dark' ? '#212225' : '#F0F0F3',
    backgroundSelected: scheme === 'dark' ? '#2E3135' : '#E0E1E6',
    textSecondary: scheme === 'dark' ? '#B0B4BA' : '#60646C',
  };

  const {
    user,
    isAuthenticated,
    isLoading,
    logout,
  } = useAuth();


  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [currentTxPage, setCurrentTxPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterWallets, setFilterWallets] = useState<string[]>([]);
  const [filterPaymentMethods, setFilterPaymentMethods] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Draft filter states (used in modal)
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftWallets, setDraftWallets] = useState<string[]>([]);
  const [draftPaymentMethods, setDraftPaymentMethods] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftMinAmount, setDraftMinAmount] = useState('');
  const [draftMaxAmount, setDraftMaxAmount] = useState('');

  const selectedDraftWalletObjs = wallets.filter((w) => draftWallets.includes(w.id));
  const hasOnlyCashDraftWallet = selectedDraftWalletObjs.length > 0 && selectedDraftWalletObjs.every((w) => w.type === 'CASH');
  const hasOnlyBankDraftWallet = selectedDraftWalletObjs.length > 0 && selectedDraftWalletObjs.every((w) => w.type === 'BANK');

  // Modal / Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [viewingTx, setViewingTx] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formCategory, setFormCategory] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [notesMode, setNotesMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formWalletId, setFormWalletId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formTime, setFormTime] = useState('12:00'); // HH:MM
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<any[]>([]);

  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [txErrorMessage, setTxErrorMessage] = useState<string | null>(null);

  const buildQueryString = (pageVal: number) => {
    let query = `/transactions?limit=10&page=${pageVal}&type=${filterType === 'ALL' ? '' : filterType}`;
    if (filterCategories.length > 0) query += `&categoryId=${filterCategories.join(',')}`;
    if (filterTags.length > 0) query += `&tagId=${filterTags.join(',')}`;
    if (filterWallets.length > 0) query += `&walletId=${filterWallets.join(',')}`;
    if (filterPaymentMethods.length > 0) query += `&paymentMethod=${filterPaymentMethods.join(',')}`;
    if (filterStartDate) query += `&startDate=${filterStartDate}`;
    if (filterEndDate) query += `&endDate=${filterEndDate}`;
    if (filterMinAmount) query += `&minAmount=${filterMinAmount}`;
    if (filterMaxAmount) query += `&maxAmount=${filterMaxAmount}`;
    if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
    return query;
  };

  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    try {
      const endpoint = buildQueryString(1);
      const [txsData, categoriesData, tagsData, walletsData] = await Promise.all([
        apiFetch(endpoint),
        apiFetch('/categories'),
        apiFetch('/tags'),
        apiFetch('/wallets'),
      ]);

      setTransactions(txsData.transactions || []);
      setHasMoreTransactions(txsData.hasMore || false);
      setCurrentTxPage(1);

      setCategories(categoriesData);
      setTags(tagsData);
      setWallets(walletsData);
    } catch (err: any) {
      console.log('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreTransactions) return;
    const nextPage = currentTxPage + 1;
    try {
      setLoadingMore(true);
      const endpoint = buildQueryString(nextPage);
      const txsData = await apiFetch(endpoint);
      setTransactions((prev) => [...prev, ...(txsData.transactions || [])]);
      setHasMoreTransactions(txsData.hasMore || false);
      setCurrentTxPage(nextPage);
    } catch (err: any) {
      console.log('Failed to load more transactions:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenFilterModal = () => {
    setDraftCategories(filterCategories);
    setDraftTags(filterTags);
    setDraftWallets(filterWallets);
    setDraftPaymentMethods(filterPaymentMethods);
    setDraftStartDate(filterStartDate);
    setDraftEndDate(filterEndDate);
    setDraftMinAmount(filterMinAmount);
    setDraftMaxAmount(filterMaxAmount);
    setFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setFilterCategories(draftCategories);
    setFilterTags(draftTags);
    setFilterWallets(draftWallets);
    setFilterPaymentMethods(draftPaymentMethods);
    setFilterStartDate(draftStartDate);
    setFilterEndDate(draftEndDate);
    setFilterMinAmount(draftMinAmount);
    setFilterMaxAmount(draftMaxAmount);
    setFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilterCategories([]);
    setFilterTags([]);
    setFilterWallets([]);
    setFilterPaymentMethods([]);
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMinAmount('');
    setFilterMaxAmount('');

    setDraftCategories([]);
    setDraftTags([]);
    setDraftWallets([]);
    setDraftPaymentMethods([]);
    setDraftStartDate('');
    setDraftEndDate('');
    setDraftMinAmount('');
    setDraftMaxAmount('');

    setFilterModalOpen(false);
  };


  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchDashboardData();
      }
    }, [
      isAuthenticated,
      filterType,
      filterCategories,
      filterTags,
      filterWallets,
      filterPaymentMethods,
    ])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refreshDashboard', () => {
      if (isAuthenticated) {
        fetchDashboardData();
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, fetchDashboardData]);



  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Autocomplete tags suggestion handler
  useEffect(() => {
    if (tagInput.trim() === '') {
      setTagSuggestions([]);
      return;
    }
    const filtered = tags.filter(
      (t) =>
        t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !formTags.includes(t.name)
    );
    setTagSuggestions(filtered);
  }, [tagInput, formTags, tags]);

  const addTagToForm = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags([...formTags, trimmed]);
    }
    setTagInput('');
    setTagSuggestions([]);
  };

  const removeTagFromForm = (name: string) => {
    setFormTags(formTags.filter((t) => t !== name));
  };

  const handleOpenAddModal = () => {
    setEditingTxId(null);
    setFormName('');
    setFormType('EXPENSE');
    setFormAmount('');
    setFormCurrency(user?.preferredCurrency || 'INR');

    const expenseCats = categories.filter((c) => c.type === 'EXPENSE');
    setFormCategory(expenseCats[0]?.id || '');

    setFormNotes('');
    setNotesMode('EDIT');
    setFormPaymentMethod('CASH');
    // Find the default Cash Wallet
    const cashWallet = wallets.find(w => w.name.toLowerCase() === 'cash wallet');
    setFormWalletId(cashWallet ? cashWallet.id : (wallets[0]?.id || ''));

    const now = new Date();
    setFormDate(now.toISOString().split('T')[0]);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setFormTime(`${hours}:${minutes}`);
    setFormTags([]);
    setShowAllCategories(false);
    setShowAllWallets(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (tx: any) => {
    setEditingTxId(tx.id);
    setFormName(tx.name || '');
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormCurrency(tx.currency);
    setFormCategory(tx.categoryId || '');
    setFormNotes(tx.notes || '');
    setNotesMode('EDIT');
    setFormPaymentMethod(tx.paymentMethod);
    setFormWalletId(tx.walletId || '');
    const dateObj = new Date(tx.date);
    setFormDate(dateObj.toISOString().split('T')[0]);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    setFormTime(`${hours}:${minutes}`);
    setFormTags(tx.tags ? tx.tags.map((t: any) => t.name) : []);
    setTxErrorMessage(null);
    setShowAllCategories(false);
    setShowAllWallets(false);
    setModalOpen(true);
  };

  const isPaymentMethodDisabled = (pm: string) => {
    const selectedWallet = wallets.find(w => w.id === formWalletId);
    if (!selectedWallet) return false;
    if (selectedWallet.type === 'CASH') {
      return pm !== 'CASH';
    } else {
      return pm === 'CASH';
    }
  };

  const handleSelectWallet = (wallet: any) => {
    setFormWalletId(wallet.id);
    if (wallet.type === 'CASH') {
      setFormPaymentMethod('CASH');
    } else {
      if (formPaymentMethod === 'CASH') {
        setFormPaymentMethod('UPI');
      }
    }
  };

  const handleSelectPaymentMethod = (pm: string) => {
    const selectedWallet = wallets.find(w => w.id === formWalletId);
    if (pm === 'CASH') {
      const cashWallet = wallets.find(w => w.name.toLowerCase() === 'cash wallet');
      if (cashWallet) {
        setFormWalletId(cashWallet.id);
      }
      setFormPaymentMethod('CASH');
    } else {
      if (!selectedWallet || selectedWallet.type === 'CASH') {
        const bankWallet = wallets.find(w => w.type === 'BANK');
        if (bankWallet) {
          setFormWalletId(bankWallet.id);
        } else {
          Alert.alert('Error', 'Please create a Bank Wallet in Settings first to use other payment methods.');
          return;
        }
      }
      setFormPaymentMethod(pm);
    }
  };

  const handleSaveTransaction = async () => {
    if (!formName.trim()) {
      setTxErrorMessage('Please enter a transaction name');
      return;
    }
    if (!formAmount || isNaN(parseFloat(formAmount)) || parseFloat(formAmount) <= 0) {
      setTxErrorMessage('Please enter a valid positive amount');
      return;
    }
    if (!formCategory) {
      setTxErrorMessage('Please select a category');
      return;
    }
    if (!formWalletId) {
      setTxErrorMessage('Please select a payment source wallet');
      return;
    }

    setIsSubmittingTx(true);
    setTxErrorMessage(null);

    const payload = {
      name: formName.trim(),
      type: formType,
      amount: parseFloat(formAmount),
      currency: formCurrency,
      categoryId: formCategory,
      notes: formNotes,
      paymentMethod: formPaymentMethod,
      walletId: formWalletId || null,
      date: new Date(`${formDate}T${formTime}:00`).toISOString(),
      tags: formTags,
    };

    try {
      if (editingTxId) {
        await apiFetch(`/transactions/${editingTxId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/transactions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      setTxErrorMessage(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const deleteAction = async () => {
      try {
        await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
        fetchDashboardData();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete transaction');
      }
    };

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteAction,
        },
      ]
    );
  };



  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Synchronizing session...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // ----------------------------------------------------
  // DASHBOARD VIEW (Logged In)
  // ----------------------------------------------------
  const CURRENCY_SYMBOLS: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCY_SYMBOLS[code?.toUpperCase()] || code || '₹';
  };


  const getCategoryIcon = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat?.icon || 'wallet';
  };

  const getCategoryColor = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat?.color || '#A0AEC0';
  };


  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
        }
      >
        <View style={styles.dashboardContainer}>
          {/* Header */}
          <View style={styles.dashboardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 }}>
              <Image
                source={require('@/assets/images/spend-sense-app-icon.png')}
                style={styles.headerLogo}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dashboardGreeting, { color: colors.textSecondary }]}>Welcome back,</Text>
                <Text style={[styles.dashboardName, { color: colors.text }]} numberOfLines={1}>{user.fullName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
              <Pressable onPress={handleOpenAddModal} style={styles.addButton}>
                <Ionicons name="add" size={16} color="#fff" style={{ marginRight: Spacing.one }} />
                <Text style={styles.addButtonText}>New</Text>
              </Pressable>
              <Pressable onPress={logout} style={styles.logoutBtn}>
                <Text style={styles.logoutBtnText}>Logout</Text>
              </Pressable>
            </View>
          </View>

          {/* Total Balance Card */}
          <View style={[styles.walletCard, { backgroundColor: '#4A90E2', marginBottom: Spacing.three, marginHorizontal: Spacing.three }]}>
            <Text style={styles.walletLabel}>TOTAL BALANCE</Text>
            <Text style={styles.walletBalance}>{getCurrencySymbol(user?.preferredCurrency || 'INR')} {totalBalance.toFixed(2)}</Text>
          </View>

          {/* Individual Wallets Carousel */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>My Wallets</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.three, gap: Spacing.two, marginBottom: Spacing.three }}
          >
            {wallets.map((w) => (
              <View
                key={w.id}
                style={[
                  styles.walletItemCard,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected, borderWidth: 1 }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.one }}>
                  <Ionicons
                    name={w.type === 'CASH' ? 'cash-outline' : 'card-outline'}
                    size={16}
                    color={w.type === 'CASH' ? '#2ECC71' : '#4A90E2'}
                  />
                  <Text style={[styles.walletItemName, { color: colors.text }]} numberOfLines={1}>
                    {w.name}
                  </Text>
                </View>
                <Text style={[styles.walletItemBalance, { color: colors.text }]} numberOfLines={1}>
                  {getCurrencySymbol(user?.preferredCurrency || 'INR')} {w.balance.toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Filters Section (Directly on Dashboard) */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.one }]}>Transactions Ledger</Text>
          <View style={{ gap: Spacing.two, marginBottom: Spacing.two }}>
            {/* Search & Filter Button Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.three, gap: Spacing.two }}>
              <View style={[styles.searchContainer, { flex: 1, marginHorizontal: 0, backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: Spacing.two }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search ledger..."
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={fetchDashboardData}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setSearch('');
                      setTimeout(() => fetchDashboardData(), 50);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              {/* Filter Icon Button */}
              <Pressable
                onPress={handleOpenFilterModal}
                style={({ pressed }) => [
                  {
                    width: 40,
                    height: 40,
                    borderRadius: Spacing.two,
                    backgroundColor: colors.backgroundElement,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: (filterCategories.length > 0 || filterTags.length > 0 || filterWallets.length > 0 || filterPaymentMethods.length > 0 || !!filterStartDate || !!filterEndDate || !!filterMinAmount || !!filterMaxAmount)
                      ? '#4A90E2'
                      : colors.backgroundSelected,
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
              >
                <Ionicons
                  name="funnel"
                  size={18}
                  color={(filterCategories.length > 0 || filterTags.length > 0 || filterWallets.length > 0 || filterPaymentMethods.length > 0 || !!filterStartDate || !!filterEndDate || !!filterMinAmount || !!filterMaxAmount) ? '#4A90E2' : colors.text}
                />
              </Pressable>
            </View>

            {/* Type Pills */}
            <View style={styles.pillsContainer}>
              <Pressable
                onPress={() => setFilterType('ALL')}
                style={[
                  styles.pill,
                  filterType === 'ALL'
                    ? { backgroundColor: '#4A90E2' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.pillText, filterType === 'ALL' ? { color: '#fff' } : { color: colors.text }]}>
                  All
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFilterType('EXPENSE')}
                style={[
                  styles.pill,
                  filterType === 'EXPENSE'
                    ? { backgroundColor: '#E74C3C' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.pillText, filterType === 'EXPENSE' ? { color: '#fff' } : { color: colors.text }]}>
                  Expenses
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFilterType('INCOME')}
                style={[
                  styles.pill,
                  filterType === 'INCOME'
                    ? { backgroundColor: '#2ECC71' }
                    : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.pillText, filterType === 'INCOME' ? { color: '#fff' } : { color: colors.text }]}>
                  Incomes
                </Text>
              </Pressable>
            </View>

            {/* Active filters indicators */}
            {(filterCategories.length > 0 || filterTags.length > 0 || filterWallets.length > 0 || filterPaymentMethods.length > 0 || !!filterStartDate || !!filterEndDate || !!filterMinAmount || !!filterMaxAmount) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersRow}>
                {filterCategories.map((catId) => (
                  <View key={catId} style={[styles.activeFilterPill, { borderColor: '#4A90E2' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      Cat: {categories.find((c) => c.id === catId)?.name || catId}
                    </Text>
                    <Pressable onPress={() => setFilterCategories(filterCategories.filter(id => id !== catId))}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                ))}
                {filterTags.map((tagId) => (
                  <View key={tagId} style={[styles.activeFilterPill, { borderColor: '#A0AEC0' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      Tag: {tags.find((t) => t.id === tagId)?.name || tagId}
                    </Text>
                    <Pressable onPress={() => setFilterTags(filterTags.filter(id => id !== tagId))}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                ))}
                {filterWallets.map((wId) => (
                  <View key={wId} style={[styles.activeFilterPill, { borderColor: '#2ECC71' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      Source: {wallets.find((w) => w.id === wId)?.name || wId}
                    </Text>
                    <Pressable onPress={() => setFilterWallets(filterWallets.filter(id => id !== wId))}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                ))}
                {filterPaymentMethods.map((pm) => (
                  <View key={pm} style={[styles.activeFilterPill, { borderColor: '#E74C3C' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      Method: {pm}
                    </Text>
                    <Pressable onPress={() => setFilterPaymentMethods(filterPaymentMethods.filter(m => m !== pm))}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                ))}
                {!!filterStartDate && (
                  <View style={[styles.activeFilterPill, { borderColor: '#F1C40F' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      From: {filterStartDate}
                    </Text>
                    <Pressable onPress={() => { setFilterStartDate(''); setTimeout(() => fetchDashboardData(), 50); }}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                )}
                {!!filterEndDate && (
                  <View style={[styles.activeFilterPill, { borderColor: '#F1C40F' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      To: {filterEndDate}
                    </Text>
                    <Pressable onPress={() => { setFilterEndDate(''); setTimeout(() => fetchDashboardData(), 50); }}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                )}
                {(!!filterMinAmount || !!filterMaxAmount) && (
                  <View style={[styles.activeFilterPill, { borderColor: '#9B51E0' }]}>
                    <Text style={[styles.activeFilterText, { color: colors.text }]}>
                      Amount: {filterMinAmount || '0'} - {filterMaxAmount || '∞'}
                    </Text>
                    <Pressable onPress={() => { setFilterMinAmount(''); setFilterMaxAmount(''); setTimeout(() => fetchDashboardData(), 50); }}>
                      <Ionicons name="close" size={14} color={colors.text} style={{ marginLeft: Spacing.one }} />
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* Transactions List */}
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#4A90E2" style={{ marginVertical: Spacing.four }} />
          ) : (
            <View style={{ gap: Spacing.two, paddingBottom: Spacing.six }}>
              {transactions.length === 0 ? (
                <View style={styles.emptyView}>
                  <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No transactions found.
                  </Text>
                </View>
              ) : (
                <>
                  {transactions.map((tx) => (
                    <Pressable
                      key={tx.id}
                      onPress={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                      style={[
                        styles.txCard,
                        {
                          backgroundColor: colors.backgroundElement,
                          flexDirection: 'column',
                          alignItems: 'stretch',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={[
                            styles.categoryIndicator,
                            { backgroundColor: getCategoryColor(tx.categoryId) },
                          ]}
                        >
                          <Ionicons
                            name={(getCategoryIcon(tx.categoryId) || 'wallet') as any}
                            size={18}
                            color="#fff"
                          />
                        </View>

                        <View style={{ flex: 1, paddingHorizontal: Spacing.two }}>
                          <Text style={[styles.txNote, { color: colors.text }]} numberOfLines={1}>
                            {tx.name || 'Transaction'}
                          </Text>
                          <Text style={[styles.txDetails, { color: colors.textSecondary }]}>
                            {tx.category?.name || 'Uncategorized'} • {tx.wallet ? tx.wallet.name : tx.paymentMethod}
                          </Text>
                          <Text style={[styles.txDetails, { color: colors.textSecondary, fontSize: 10 }]}>
                            {new Date(tx.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })} • {new Date(tx.date).toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </Text>

                          {/* Tag Pills */}
                          {tx.tags && tx.tags.length > 0 && (
                            <View style={styles.txTagsRow}>
                              {tx.tags.map((tag: any) => (
                                <Pressable
                                  key={tag.id}
                                  onPress={() => {
                                    if (filterTags.includes(tag.id)) {
                                      setFilterTags(filterTags.filter((id) => id !== tag.id));
                                    } else {
                                      setFilterTags([...filterTags, tag.id]);
                                    }
                                  }}
                                  style={[styles.tagPill, { backgroundColor: tag.color || '#A0AEC0' }]}
                                >
                                  <Text style={styles.tagText}>{tag.name}</Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>

                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text
                            style={[
                              styles.txAmount,
                              { color: tx.type === 'INCOME' ? '#2ECC71' : '#E74C3C', fontSize: 14 },
                            ]}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'}{getCurrencySymbol(tx.currency)}
                            {Math.abs(tx.amount).toFixed(2)}
                          </Text>
                          <View style={styles.actionRow}>
                            <Pressable onPress={() => setViewingTx(tx)} style={styles.actionIcon}>
                              <Ionicons name="eye-outline" size={16} color="#2ECC71" />
                            </Pressable>
                            <Pressable onPress={() => handleOpenEditModal(tx)} style={styles.actionIcon}>
                              <Ionicons name="create-outline" size={16} color="#4A90E2" />
                            </Pressable>
                            <Pressable onPress={() => handleDeleteTransaction(tx.id)} style={styles.actionIcon}>
                              <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                            </Pressable>
                          </View>
                        </View>
                      </View>

                      {/* Collapsible notes area */}
                      {expandedTxId === tx.id && tx.notes ? (
                        <View style={{ marginTop: Spacing.two, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: Spacing.two }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4 }}>NOTES</Text>
                          <MarkdownText content={tx.notes} colors={colors} />
                        </View>
                      ) : null}
                    </Pressable>
                  ))}

                  {hasMoreTransactions && (
                    <Pressable
                      onPress={handleLoadMore}
                      disabled={loadingMore}
                      style={[
                        styles.loadMoreBtn,
                        {
                          borderColor: colors.backgroundSelected,
                          backgroundColor: colors.backgroundElement,
                        },
                      ]}
                    >
                      {loadingMore ? (
                        <ActivityIndicator size="small" color="#4A90E2" />
                      ) : (
                        <Text style={[styles.loadMoreText, { color: colors.text }]}>Load More</Text>
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      <Modal
        visible={filterModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Advanced Filters</Text>
              <Pressable onPress={() => setFilterModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Scrollable filters body */}
            <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.four }}>
              {/* Categories Selector */}
              <View style={{ gap: Spacing.two }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>CATEGORIES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }}>
                  {categories.map((cat) => {
                    const isSelected = draftCategories.includes(cat.id);
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => {
                          if (isSelected) {
                            setDraftCategories(draftCategories.filter((id) => id !== cat.id));
                          } else {
                            setDraftCategories([...draftCategories, cat.id]);
                          }
                        }}
                        style={[
                          styles.filterOptionPill,
                          { backgroundColor: isSelected ? cat.color || '#4A90E2' : colors.backgroundSelected, marginVertical: 2 },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Wallets Selector */}
              <View style={{ gap: Spacing.two }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>PAYMENT SOURCES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }}>
                  {wallets.map((w) => {
                    const isSelected = draftWallets.includes(w.id);
                    return (
                      <Pressable
                        key={w.id}
                        onPress={() => {
                          let nextWallets = [];
                          if (isSelected) {
                            nextWallets = draftWallets.filter((id) => id !== w.id);
                          } else {
                            nextWallets = [...draftWallets, w.id];
                          }
                          setDraftWallets(nextWallets);

                          const selectedObjs = wallets.filter((wal) => nextWallets.includes(wal.id));
                          if (selectedObjs.length > 0) {
                            const allCash = selectedObjs.every((wal) => wal.type === 'CASH');
                            const allBank = selectedObjs.every((wal) => wal.type === 'BANK');
                            if (allCash) {
                              setDraftPaymentMethods(['CASH']);
                            } else if (allBank) {
                              setDraftPaymentMethods((prev) => prev.filter((m) => m !== 'CASH'));
                            }
                          }
                        }}
                        style={[
                          styles.filterOptionPill,
                          { backgroundColor: isSelected ? '#2ECC71' : colors.backgroundSelected, marginVertical: 2 },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>
                          {w.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Payment Methods Selector */}
              <View style={{ gap: Spacing.two }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>PAYMENT METHODS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }}>
                  {['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER'].map((pm) => {
                    const isSelected = draftPaymentMethods.includes(pm);
                    const isDisabled = (hasOnlyCashDraftWallet && pm !== 'CASH') || (hasOnlyBankDraftWallet && pm === 'CASH');
                    return (
                      <Pressable
                        key={pm}
                        disabled={isDisabled}
                        onPress={() => {
                          if (isSelected) {
                            setDraftPaymentMethods(draftPaymentMethods.filter((m) => m !== pm));
                          } else {
                            setDraftPaymentMethods([...draftPaymentMethods, pm]);
                          }
                        }}
                        style={[
                          styles.filterOptionPill,
                          {
                            backgroundColor: isSelected ? '#E74C3C' : colors.backgroundSelected,
                            marginVertical: 2,
                            opacity: isDisabled ? 0.3 : 1
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>
                          {pm.replace('_', ' ')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Tags Selector */}
              {tags.length > 0 && (
                <View style={{ gap: Spacing.two }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>TAGS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }}>
                    {tags.map((tag) => {
                      const isSelected = draftTags.includes(tag.id);
                      return (
                        <Pressable
                          key={tag.id}
                          onPress={() => {
                            if (isSelected) {
                              setDraftTags(draftTags.filter((id) => id !== tag.id));
                            } else {
                              setDraftTags([...draftTags, tag.id]);
                            }
                          }}
                          style={[
                            styles.filterOptionPill,
                            { backgroundColor: isSelected ? tag.color || '#A0AEC0' : colors.backgroundSelected, marginVertical: 2 },
                          ]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.text }}>
                            {tag.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Date Range Inputs */}
              <View style={{ gap: Spacing.two }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>DATE RANGE</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <View style={{ flex: 1, gap: Spacing.one }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary }}>START DATE</Text>
                    <TextInput
                      style={[styles.miniInput, { height: 40, color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundSelected }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      value={draftStartDate}
                      onChangeText={setDraftStartDate}
                    />
                  </View>
                  <View style={{ flex: 1, gap: Spacing.one }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary }}>END DATE</Text>
                    <TextInput
                      style={[styles.miniInput, { height: 40, color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundSelected }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      value={draftEndDate}
                      onChangeText={setDraftEndDate}
                    />
                  </View>
                </View>
              </View>

              {/* Amount Range Inputs */}
              <View style={{ gap: Spacing.two }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>AMOUNT RANGE</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <View style={{ flex: 1, gap: Spacing.one }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary }}>MIN AMOUNT</Text>
                    <TextInput
                      style={[styles.miniInput, { height: 40, color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundSelected }]}
                      placeholder="Min amount"
                      placeholderTextColor={colors.textSecondary}
                      value={draftMinAmount}
                      onChangeText={setDraftMinAmount}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, gap: Spacing.one }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary }}>MAX AMOUNT</Text>
                    <TextInput
                      style={[styles.miniInput, { height: 40, color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundSelected }]}
                      placeholder="Max amount"
                      placeholderTextColor={colors.textSecondary}
                      value={draftMaxAmount}
                      onChangeText={setDraftMaxAmount}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Action buttons inside filter modal */}
              <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, paddingBottom: Spacing.five }}>
                <Pressable
                  onPress={handleResetFilters}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.backgroundSelected,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Reset All</Text>
                </Pressable>

                <Pressable
                  onPress={handleApplyFilters}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: '#4A90E2',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>Apply Filters</Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Transaction Add/Edit Modal (Directly triggered on Home tab) */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingTxId ? 'Edit Transaction' : 'New Transaction'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {txErrorMessage && (
              <View style={styles.txErrorAlert}>
                <Text style={styles.txErrorText}>{txErrorMessage}</Text>
              </View>
            )}

            <ScrollView contentContainerStyle={styles.formContainer}>
              {/* Transaction Name */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Transaction Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="e.g. Weekly Groceries, Client Salary"
                placeholderTextColor={colors.textSecondary}
                value={formName}
                onChangeText={setFormName}
              />

              {/* Transaction Type */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Transaction Type</Text>
              <View style={styles.typeSelectorRow}>
                <Pressable
                  onPress={() => {
                    setFormType('EXPENSE');
                    const expenseCats = categories.filter((c) => c.type === 'EXPENSE');
                    if (expenseCats.length > 0 && !expenseCats.find((c) => c.id === formCategory)) {
                      setFormCategory(expenseCats[0].id);
                    }
                  }}
                  style={[
                    styles.typeSelectorPill,
                    formType === 'EXPENSE'
                      ? { backgroundColor: '#E74C3C' }
                      : { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  <Text style={[styles.typeText, formType === 'EXPENSE' ? { color: '#fff' } : { color: colors.text }]}>
                    Expense
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setFormType('INCOME');
                    const incomeCats = categories.filter((c) => c.type === 'INCOME');
                    if (incomeCats.length > 0 && !incomeCats.find((c) => c.id === formCategory)) {
                      setFormCategory(incomeCats[0].id);
                    }
                  }}
                  style={[
                    styles.typeSelectorPill,
                    formType === 'INCOME'
                      ? { backgroundColor: '#2ECC71' }
                      : { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  <Text style={[styles.typeText, formType === 'INCOME' ? { color: '#fff' } : { color: colors.text }]}>
                    Income
                  </Text>
                </Pressable>
              </View>

              {/* Amount and Currency */}
              <View style={styles.amountCurrencyRow}>
                <View style={{ flex: 1, marginRight: Spacing.two }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Amount</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={formAmount}
                    onChangeText={setFormAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Currency</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelect}>
                    {['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map((cur) => (
                      <Pressable
                        key={cur}
                        onPress={() => setFormCurrency(cur)}
                        style={[
                          styles.currencyOption,
                          formCurrency === cur
                            ? { backgroundColor: '#4A90E2' }
                            : { backgroundColor: colors.backgroundElement },
                        ]}
                      >
                        <Text style={[styles.currencyOptText, formCurrency === cur ? { color: '#fff' } : { color: colors.text }]}>
                          {cur}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Category */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
              <View style={{ marginBottom: Spacing.two }}>
                <View style={styles.categoriesSelectContainer}>
                  {(() => {
                    const filteredCats = categories.filter((cat) => cat.type === formType);
                    const displayedCats = showAllCategories ? filteredCats : filteredCats.slice(0, 6);
                    return (
                      <>
                        {displayedCats.map((cat) => (
                          <Pressable
                            key={cat.id}
                            onPress={() => setFormCategory(cat.id)}
                            style={[
                              styles.categoryOptionPill,
                              formCategory === cat.id
                                ? { backgroundColor: cat.color || '#4A90E2', borderColor: cat.color || '#4A90E2' }
                                : { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
                            ]}
                          >
                            <Ionicons
                              name={(cat.icon || 'wallet') as any}
                              size={14}
                              color={formCategory === cat.id ? '#fff' : colors.text}
                              style={{ marginRight: Spacing.one }}
                            />
                            <Text style={[styles.categoryOptText, formCategory === cat.id ? { color: '#fff' } : { color: colors.text }]}>
                              {cat.name}
                            </Text>
                          </Pressable>
                        ))}
                      </>
                    );
                  })()}
                </View>
                {(() => {
                  const filteredCats = categories.filter((cat) => cat.type === formType);
                  if (filteredCats.length > 6) {
                    return (
                      <Pressable
                        onPress={() => setShowAllCategories(!showAllCategories)}
                        style={styles.formLoadMoreBtn}
                      >
                        <Text style={styles.formLoadMoreBtnText}>
                          {showAllCategories ? 'Show Less' : 'Show More'}
                        </Text>
                      </Pressable>
                    );
                  }
                  return null;
                })()}
              </View>

              {/* Payment Source (Wallet) */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Payment Source (Wallet)</Text>
              <View style={{ marginBottom: Spacing.two }}>
                <View style={styles.categoriesSelectContainer}>
                  {(() => {
                    const displayedWallets = showAllWallets ? wallets : wallets.slice(0, 6);
                    return displayedWallets.map((w) => {
                      const isSelected = formWalletId === w.id;
                      const iconName = w.type === 'CASH' ? 'cash-outline' : 'card-outline';
                      const iconColor = w.type === 'CASH' ? '#2ECC71' : '#3498DB';
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => handleSelectWallet(w)}
                          style={[
                            styles.categoryOptionPill,
                            isSelected
                              ? { backgroundColor: '#4A90E2', borderColor: '#4A90E2' }
                              : { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
                          ]}
                        >
                          <Ionicons
                            name={iconName as any}
                            size={14}
                            color={isSelected ? '#fff' : iconColor}
                            style={{ marginRight: Spacing.one }}
                          />
                          <Text style={[styles.categoryOptText, isSelected ? { color: '#fff' } : { color: colors.text }]}>
                            {w.name} ({getCurrencySymbol(user?.preferredCurrency || 'INR')} {w.balance.toFixed(2)})
                          </Text>
                        </Pressable>
                      );
                    });
                  })()}
                </View>
                {wallets.length > 6 && (
                  <Pressable
                    onPress={() => setShowAllWallets(!showAllWallets)}
                    style={styles.formLoadMoreBtn}
                  >
                    <Text style={styles.formLoadMoreBtnText}>
                      {showAllWallets ? 'Show Less' : 'Show More'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Payment Method */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Payment Method</Text>
              <View style={styles.typeSelectorRow}>
                {['CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'OTHER'].map((pm) => {
                  const isDisabled = isPaymentMethodDisabled(pm);
                  const isSelected = formPaymentMethod === pm;
                  return (
                    <Pressable
                      key={pm}
                      onPress={() => {
                        if (isDisabled) return;
                        handleSelectPaymentMethod(pm);
                      }}
                      style={[
                        styles.typeSelectorPill,
                        isSelected
                          ? { backgroundColor: '#4A90E2' }
                          : { backgroundColor: colors.backgroundElement },
                        isDisabled ? { opacity: 0.3 } : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          { fontSize: 10 },
                          isSelected ? { color: '#fff' } : { color: colors.text },
                        ]}
                      >
                        {pm.replace('_', ' ')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Date and Time Row */}
              <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Date</Text>
                  <View>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={[styles.datePickerButton, { borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement, marginBottom: 0 }]}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.text} style={{ marginRight: Spacing.one }} />
                      <Text style={{ color: colors.text }}>{formDate}</Text>
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={new Date(formDate)}
                        mode="date"
                        display="default"
                        onChange={(event: any, selectedDate?: Date) => {
                          setShowDatePicker(false);
                          if (selectedDate) {
                            setFormDate(selectedDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Time</Text>
                  <View>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={[styles.datePickerButton, { borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement, marginBottom: 0 }]}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.text} style={{ marginRight: Spacing.one }} />
                      <Text style={{ color: colors.text }}>{formTime}</Text>
                    </Pressable>
                    {showTimePicker && (
                      <DateTimePicker
                        value={new Date(`${formDate}T${formTime}:00`)}
                        mode="time"
                        display="default"
                        is24Hour={true}
                        onChange={(event: any, selectedTime?: Date) => {
                          setShowTimePicker(false);
                          if (selectedTime) {
                            const hours = String(selectedTime.getHours()).padStart(2, '0');
                            const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
                            setFormTime(`${hours}:${minutes}`);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Tags Input with Autocomplete */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Tags</Text>
              <View style={[styles.searchContainer, { backgroundColor: colors.backgroundElement }]}>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Type tag name..."
                  placeholderTextColor={colors.textSecondary}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={() => addTagToForm(tagInput)}
                />
                {tagInput.trim().length > 0 && (
                  <Pressable onPress={() => addTagToForm(tagInput)} style={styles.addTagInlineBtn}>
                    <Text style={{ color: '#4A90E2', fontWeight: 'bold' }}>Add</Text>
                  </Pressable>
                )}
              </View>

              {/* Autocomplete Suggestions */}
              {tagSuggestions.length > 0 && (
                <View style={[styles.suggestionsBox, { backgroundColor: colors.backgroundElement }]}>
                  {tagSuggestions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => addTagToForm(s.name)}
                      style={styles.suggestionRow}
                    >
                      <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} style={{ marginRight: Spacing.two }} />
                      <Text style={{ color: colors.text }}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Active form tags */}
              {formTags.length > 0 && (
                <View style={styles.activeTagsFormRow}>
                  {formTags.map((t) => (
                    <View key={t} style={[styles.formTagPill]}>
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>{t}</Text>
                      <Pressable onPress={() => removeTagFromForm(t)}>
                        <Ionicons name="close-circle" size={14} color="#fff" style={{ marginLeft: Spacing.one }} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Notes Label and Mode Switcher */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.half }}>
                <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>Notes (Markdown supported)</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.one, backgroundColor: colors.backgroundSelected, borderRadius: 6, padding: 2 }}>
                  <Pressable
                    onPress={() => setNotesMode('EDIT')}
                    style={{
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      borderRadius: 4,
                      backgroundColor: notesMode === 'EDIT' ? colors.backgroundElement : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setNotesMode('PREVIEW')}
                    style={{
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      borderRadius: 4,
                      backgroundColor: notesMode === 'PREVIEW' ? colors.backgroundElement : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>Preview</Text>
                  </Pressable>
                </View>
              </View>

              {notesMode === 'EDIT' ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.backgroundSelected,
                      height: 80,
                      textAlignVertical: 'top',
                      paddingTop: Spacing.two,
                    },
                  ]}
                  placeholder="Details of transaction... (Markdown: **bold**, - list)"
                  placeholderTextColor={colors.textSecondary}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                />
              ) : (
                <View
                  style={{
                    minHeight: 80,
                    borderWidth: 1,
                    borderColor: colors.backgroundSelected,
                    borderRadius: Spacing.two,
                    backgroundColor: colors.backgroundElement,
                    padding: Spacing.two,
                    marginBottom: Spacing.two,
                  }}
                >
                  {formNotes.trim() ? (
                    <MarkdownText content={formNotes} colors={colors} />
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                      Nothing to preview. Type something in Edit mode!
                    </Text>
                  )}
                </View>
              )}

              {/* Save / Cancel Buttons */}
              <Pressable
                onPress={handleSaveTransaction}
                disabled={isSubmittingTx}
                style={styles.saveBtn}
              >
                {isSubmittingTx ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Transaction Details Modal */}
      <Modal
        visible={!!viewingTx}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingTx(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.backgroundSelected }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Transaction Details</Text>
            <Pressable onPress={() => setViewingTx(null)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Modal Content */}
          {viewingTx && (
            <ScrollView contentContainerStyle={styles.formContainer}>
              {/* Type, Name and Amount Header Card */}
              <View
                style={{
                  backgroundColor: colors.backgroundElement,
                  padding: Spacing.four,
                  borderRadius: Spacing.three,
                  alignItems: 'center',
                  gap: Spacing.one,
                  marginBottom: Spacing.two,
                }}
              >
                <View
                  style={{
                    backgroundColor: viewingTx.type === 'INCOME' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                    paddingVertical: Spacing.half,
                    paddingHorizontal: Spacing.three,
                    borderRadius: 12,
                    marginBottom: Spacing.one,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: viewingTx.type === 'INCOME' ? '#2ECC71' : '#E74C3C',
                    }}
                  >
                    {viewingTx.type}
                  </Text>
                </View>

                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
                  {viewingTx.name || 'Transaction'}
                </Text>

                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: viewingTx.type === 'INCOME' ? '#2ECC71' : '#E74C3C',
                    marginTop: Spacing.one,
                  }}
                >
                  {viewingTx.type === 'INCOME' ? '+' : '-'}{getCurrencySymbol(viewingTx.currency)}
                  {Math.abs(viewingTx.amount).toFixed(2)}
                </Text>
              </View>

              {/* Details list */}
              <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.one }}>
                {/* Category */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>CATEGORY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                    <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(viewingTx.categoryId), width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name={(getCategoryIcon(viewingTx.categoryId) || 'wallet') as any} size={11} color="#fff" />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                      {viewingTx.category?.name || 'Uncategorized'}
                    </Text>
                  </View>
                </View>

                {/* Wallet */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>WALLET</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {viewingTx.wallet?.name || viewingTx.paymentMethod}
                  </Text>
                </View>

                {/* Payment Method */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>PAYMENT METHOD</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {viewingTx.paymentMethod.replace('_', ' ')}
                  </Text>
                </View>

                {/* Date & Time */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>DATE & TIME</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {new Date(viewingTx.date).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })} at {new Date(viewingTx.date).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </View>

                {/* Tags */}
                {viewingTx.tags && viewingTx.tags.length > 0 && (
                  <View style={{ gap: Spacing.one }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>TAGS</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: 4 }}>
                      {viewingTx.tags.map((tag: any) => (
                        <View
                          key={tag.id}
                          style={[
                            styles.tagPill,
                            { backgroundColor: tag.color || '#A0AEC0', paddingVertical: 4, paddingHorizontal: 10 },
                          ]}
                        >
                          <Text style={[styles.tagText, { fontSize: 11 }]}>{tag.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Notes (Markdown supported) */}
                <View style={{ gap: Spacing.one, marginTop: Spacing.one }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>NOTES</Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.backgroundSelected,
                      borderRadius: Spacing.two,
                      backgroundColor: colors.backgroundElement,
                      padding: Spacing.three,
                      minHeight: 60,
                      marginTop: 4,
                    }}
                  >
                    {viewingTx.notes ? (
                      <MarkdownText content={viewingTx.notes} colors={colors} />
                    ) : (
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                        No notes added to this transaction.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.two,
    fontSize: 14,
    fontWeight: '500',
  },
  dashboardContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dashboardGreeting: {
    fontSize: 14,
  },
  dashboardName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#E74C3C',
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  walletCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: '#4A90E2',
    gap: Spacing.two,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  walletLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  walletBalance: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  walletItemCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    width: 140,
    justifyContent: 'center',
  },
  walletItemName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  walletItemBalance: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: Spacing.half,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: Spacing.two,
  },
  walletSubLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  walletSubValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  walletSubValueSpent: {
    color: '#FFD2D2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Spacing.three,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  budgetCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginTop: Spacing.one,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  transactionsList: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  txMeta: {
    fontSize: 11,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  addButton: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterSection: {
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  searchContainer: {
    height: 40,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    marginHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addTagInlineBtn: {
    paddingHorizontal: Spacing.two,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    marginRight: Spacing.one,
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  txCard: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
    marginHorizontal: Spacing.three,
  },
  categoryIndicator: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txNote: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  txDetails: {
    fontSize: 11,
    marginTop: Spacing.half,
  },
  txTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  tagPill: {
    paddingHorizontal: Spacing.one,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionIcon: {
    padding: Spacing.half,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: Spacing.one,
  },
  txErrorAlert: {
    backgroundColor: '#FDEDEC',
    padding: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
  },
  txErrorText: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  formContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.half,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  typeSelectorPill: {
    flex: 1,
    height: 40,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  typeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  amountCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currencySelect: {
    flexDirection: 'row',
    height: 44,
  },
  currencyOption: {
    height: 40,
    width: 50,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.one,
  },
  currencyOptText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriesSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  categoryOptText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: Spacing.two,
    marginTop: -Spacing.two,
    padding: Spacing.one,
    maxHeight: 120,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  activeTagsFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  formTagPill: {
    backgroundColor: '#34495E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  datePickerButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  loadMoreBtn: {
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  formLoadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  formLoadMoreBtnText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterOptionPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginRight: 6,
  },
  miniInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#4A90E2',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Alert,
  Platform,
  Modal,
  Switch,
  KeyboardAvoidingView,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch, secureApiKeyStore } from '@/utils/api';
import { Colors } from '@/constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';

const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

const PRESET_COLORS = [
  '#FF7A59',
  '#4A90E2',
  '#FFB900',
  '#9B51E0',
  '#27AE60',
  '#EB5757',
  '#F2994A',
  '#607D8B',
];

const PRESET_ICONS = [
  'fast-food',
  'car',
  'basket',
  'game-controller',
  'bulb',
  'heart',
  'home',
  'wallet',
  'cash',
  'briefcase',
  'trending-up',
  'gift',
  'refresh',
  'help',
];

export default function SettingsScreen() {
  const scheme = useColorScheme() || 'light';
  const colors = {
    ...(Colors[scheme] || Colors.light),
    backgroundElement: scheme === 'dark' ? '#212225' : '#F0F0F3',
    backgroundSelected: scheme === 'dark' ? '#2E3135' : '#E0E1E6',
    textSecondary: scheme === 'dark' ? '#B0B4BA' : '#60646C',
  };

  const { user, checkAuth, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);


  // Data states
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Accordion states
  const [currencyExpanded, setCurrencyExpanded] = useState(false);
  const [walletsExpanded, setWalletsExpanded] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [apiKeyExpanded, setApiKeyExpanded] = useState(false);

  // Forms
  const [prefCurrency, setPrefCurrency] = useState(user?.preferredCurrency || 'INR');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(user?.isAiEnabled !== false);

  // Add Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState(PRESET_ICONS[0]);
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);

  // Add Tag form
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  // Add Wallet form
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<'CASH' | 'BANK'>('BANK');
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const loadApiKeyStatus = async () => {
    try {
      const key = await secureApiKeyStore.getApiKey();
      if (key) {
        setIsApiKeySet(true);
        setApiKeyInput('••••••••••••••••••••••••••••••••••••••');
      } else {
        setIsApiKeySet(false);
        setApiKeyInput('');
      }
    } catch (e) {
      console.error('Failed to load API key status:', e);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid Gemini API Key');
      return;
    }
    if (apiKeyInput.startsWith('•••')) {
      Alert.alert('Info', 'Gemini API Key is already saved.');
      return;
    }
    setApiKeySaving(true);
    try {
      await secureApiKeyStore.setApiKey(apiKeyInput.trim());
      setIsApiKeySet(true);
      Alert.alert('Success', 'Gemini API Key saved securely on your device.');
      await loadApiKeyStatus();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save API Key');
    } finally {
      setApiKeySaving(false);
    }
  };

  const handleClearApiKey = async () => {
    try {
      await secureApiKeyStore.removeApiKey();
      setIsApiKeySet(false);
      setApiKeyInput('');
      Alert.alert('Success', 'Gemini API Key removed from your device.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to clear API Key');
    }
  };

  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [categoriesData, tagsData, walletsData] = await Promise.all([
        apiFetch('/categories'),
        apiFetch('/tags'),
        apiFetch('/wallets'),
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
      setWallets(walletsData);
      if (user) {
        if (user.preferredCurrency) {
          setPrefCurrency(user.preferredCurrency);
        }
        setIsAiEnabled(user.isAiEnabled !== false);
      }
      await loadApiKeyStatus();
    } catch (err: any) {
      console.error('Failed to load settings data:', err);
      Alert.alert('Error', err.message || 'Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Toggle AI Opt-in
  const handleToggleAi = async (value: boolean) => {
    setIsAiEnabled(value);
    try {
      await apiFetch('/auth/profile/ai-toggle', {
        method: 'PUT',
        body: JSON.stringify({ isAiEnabled: value }),
      });
      await checkAuth(); // Sync globally
    } catch (err: any) {
      setIsAiEnabled(!value);
      Alert.alert('Error', err.message || 'Failed to update AI setting');
    }
  };

  // Change Preferred Currency
  const handleChangeCurrency = async (currency: string) => {
    setCurrencyLoading(true);
    try {
      await apiFetch('/auth/profile/currency', {
        method: 'PUT',
        body: JSON.stringify({ preferredCurrency: currency }),
      });
      setPrefCurrency(currency);
      await checkAuth(); // Sync profile details in auth state
      DeviceEventEmitter.emit('refreshDashboard');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update preferred currency');
    } finally {
      setCurrencyLoading(false);
    }
  };

  // Create / Edit Category
  const handleOpenAddCategoryModal = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatType('EXPENSE');
    setNewCatColor(PRESET_COLORS[0]);
    setNewCatIcon(PRESET_ICONS[0]);
    setCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    setCatSubmitting(true);
    try {
      if (editingCatId) {
        // Edit Category
        await apiFetch(`/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: newCatName.trim(),
            color: newCatColor,
            icon: newCatIcon,
          }),
        });
        setEditingCatId(null);
      } else {
        // Create Category
        await apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: newCatName.trim(),
            type: newCatType,
            color: newCatColor,
            icon: newCatIcon,
          }),
        });
      }
      setNewCatName('');
      setNewCatColor(PRESET_COLORS[0]);
      setNewCatIcon(PRESET_ICONS[0]);
      setCatModalOpen(false);
      loadData();
      DeviceEventEmitter.emit('refreshDashboard');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category');
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleStartEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatType(cat.type);
    setNewCatColor(cat.color || PRESET_COLORS[0]);
    setNewCatIcon(cat.icon || PRESET_ICONS[0]);
    setCatModalOpen(true);
  };

  const handleCancelEditCategory = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatColor(PRESET_COLORS[0]);
    setNewCatIcon(PRESET_ICONS[0]);
    setCatModalOpen(false);
  };

  // Delete Custom Category
  const handleDeleteCategory = async (id: string, name: string) => {
    const deleteAction = async () => {
      try {
        await apiFetch(`/categories/${id}`, { method: 'DELETE' });
        loadData();
        DeviceEventEmitter.emit('refreshDashboard');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete category');
      }
    };

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This will delete all expense records associated with this category.`,
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

  // Create / Edit Tag
  const handleOpenAddTagModal = () => {
    setEditingTagId(null);
    setNewTagName('');
    setNewTagColor(PRESET_COLORS[0]);
    setTagModalOpen(true);
  };

  const handleSaveTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }
    setTagSubmitting(true);
    try {
      if (editingTagId) {
        // Edit Tag
        await apiFetch(`/tags/${editingTagId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: newTagName.trim(),
            color: newTagColor,
          }),
        });
        setEditingTagId(null);
      } else {
        // Create Tag
        await apiFetch('/tags', {
          method: 'POST',
          body: JSON.stringify({
            name: newTagName.trim(),
            color: newTagColor,
          }),
        });
      }
      setNewTagName('');
      setNewTagColor(PRESET_COLORS[0]);
      setTagModalOpen(false);
      loadData();
      DeviceEventEmitter.emit('refreshDashboard');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save tag');
    } finally {
      setTagSubmitting(false);
    }
  };

  const handleStartEditTag = (tag: any) => {
    setEditingTagId(tag.id);
    setNewTagName(tag.name);
    setNewTagColor(tag.color || PRESET_COLORS[0]);
    setTagModalOpen(true);
  };

  const handleCancelEditTag = () => {
    setEditingTagId(null);
    setNewTagName('');
    setNewTagColor(PRESET_COLORS[0]);
    setTagModalOpen(false);
  };

  // Delete Tag
  const handleDeleteTag = async (id: string, name: string) => {
    const deleteAction = async () => {
      try {
        await apiFetch(`/tags/${id}`, { method: 'DELETE' });
        loadData();
        DeviceEventEmitter.emit('refreshDashboard');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete tag');
      }
    };

    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete tag "${name}"? This will only remove the tag from expenses without deleting the expenses themselves.`,
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

  // Create / Edit Wallet
  const handleOpenAddWalletModal = () => {
    setEditingWalletId(null);
    setNewWalletName('');
    setNewWalletType('BANK');
    setWalletModalOpen(true);
  };

  const handleSaveWallet = async () => {
    if (!newWalletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }
    setWalletSubmitting(true);
    try {
      if (editingWalletId) {
        // Edit Wallet
        await apiFetch(`/wallets/${editingWalletId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: newWalletName.trim(),
            type: newWalletType,
          }),
        });
        setEditingWalletId(null);
      } else {
        // Create Wallet
        await apiFetch('/wallets', {
          method: 'POST',
          body: JSON.stringify({
            name: newWalletName.trim(),
            type: newWalletType,
          }),
        });
      }
      setNewWalletName('');
      setNewWalletType('BANK');
      setWalletModalOpen(false);
      loadData();
      DeviceEventEmitter.emit('refreshDashboard');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save wallet');
    } finally {
      setWalletSubmitting(false);
    }
  };

  const handleStartEditWallet = (wallet: any) => {
    setEditingWalletId(wallet.id);
    setNewWalletName(wallet.name);
    setNewWalletType(wallet.type);
    setWalletModalOpen(true);
  };

  const handleCancelEditWallet = () => {
    setEditingWalletId(null);
    setNewWalletName('');
    setNewWalletType('BANK');
    setWalletModalOpen(false);
  };

  // Delete Custom Wallet
  const handleDeleteWallet = async (id: string, name: string) => {
    if (name.toLowerCase() === 'cash wallet') {
      Alert.alert('Error', 'The default Cash Wallet is non-deletable');
      return;
    }

    const deleteAction = async () => {
      try {
        await apiFetch(`/wallets/${id}`, { method: 'DELETE' });
        loadData();
        DeviceEventEmitter.emit('refreshDashboard');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete wallet');
      }
    };

    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${name}"? Its transactions will remain, but they won't have an associated wallet.`,
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

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/spend-sense-app-icon.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Preferences</Text>
        </View>

        {/* 1. Preferred Currency Accordion */}
        <Pressable
          onPress={() => setCurrencyExpanded(!currencyExpanded)}
          style={[
            styles.accordionHeader,
            {
              backgroundColor: colors.backgroundElement,
              borderBottomLeftRadius: currencyExpanded ? 0 : Spacing.three,
              borderBottomRightRadius: currencyExpanded ? 0 : Spacing.three,
              marginBottom: currencyExpanded ? 0 : Spacing.two,
            },
          ]}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="cash-outline" size={18} color="#4A90E2" style={{ marginRight: Spacing.two }} />
            <View>
              <Text style={[styles.accordionTitle, { color: colors.text }]}>Preferred Currency</Text>
              <Text style={[styles.accordionSubTitle, { color: colors.textSecondary }]}>Active: {prefCurrency}</Text>
            </View>
          </View>
          <Ionicons name={currencyExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
        </Pressable>

        {currencyExpanded && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -Spacing.one, marginBottom: Spacing.two }]}>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              All balances, metrics, and charts will convert and aggregate in your preferred currency.
            </Text>
            <View style={styles.currencyGrid}>
              {['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map((currency) => (
                <Pressable
                  key={currency}
                  onPress={() => handleChangeCurrency(currency)}
                  disabled={currencyLoading}
                  style={[
                    styles.currencyPill,
                    prefCurrency === currency
                      ? { backgroundColor: '#4A90E2' }
                      : { backgroundColor: colors.backgroundSelected },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyText,
                      prefCurrency === currency ? { color: '#fff' } : { color: colors.text },
                    ]}
                  >
                    {currency}
                  </Text>
                </Pressable>
              ))}
            </View>
            {currencyLoading && (
              <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: Spacing.two }} />
            )}
          </View>
        )}

        {/* 2. Wallets Accordion */}
        <Pressable
          onPress={() => setWalletsExpanded(!walletsExpanded)}
          style={[
            styles.accordionHeader,
            {
              backgroundColor: colors.backgroundElement,
              borderBottomLeftRadius: walletsExpanded ? 0 : Spacing.three,
              borderBottomRightRadius: walletsExpanded ? 0 : Spacing.three,
              marginBottom: walletsExpanded ? 0 : Spacing.two,
            },
          ]}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="wallet-outline" size={18} color="#2ECC71" style={{ marginRight: Spacing.two }} />
            <View>
              <Text style={[styles.accordionTitle, { color: colors.text }]}>Wallets</Text>
              <Text style={[styles.accordionSubTitle, { color: colors.textSecondary }]}>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''} defined</Text>
            </View>
          </View>
          <Ionicons name={walletsExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
        </Pressable>

        {walletsExpanded && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -Spacing.one, marginBottom: Spacing.two }]}>
            {/* Add Wallet Button */}
            <Pressable
              onPress={handleOpenAddWalletModal}
              style={[styles.saveBtn, { height: 40, marginBottom: Spacing.two, flexDirection: 'row', gap: Spacing.one }]}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Add Wallet</Text>
            </Pressable>

            {/* List Wallets */}
            <Text style={[styles.formSubtitle, { color: colors.text, marginTop: Spacing.three }]}>
              Current Wallets
            </Text>
            <View style={styles.listContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                wallets.map((wallet) => {
                  const isDefaultCash = wallet.name.toLowerCase() === 'cash wallet';
                  return (
                    <View key={wallet.id} style={styles.listItem}>
                      <View style={styles.listItemMeta}>
                        <View style={[styles.catIconCircle, { backgroundColor: wallet.type === 'CASH' ? '#2ECC71' : '#3498DB' }]}>
                          <Ionicons name={wallet.type === 'CASH' ? 'cash-outline' : 'card-outline'} size={14} color="#fff" />
                        </View>
                        <View>
                          <Text style={[styles.listItemText, { color: colors.text, fontWeight: 'bold' }]}>{wallet.name}</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                            Balance: {prefCurrency} {wallet.balance.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                        <Pressable onPress={() => handleStartEditWallet(wallet)} style={{ padding: Spacing.one }}>
                          <Ionicons name="create-outline" size={16} color="#4A90E2" />
                        </Pressable>
                        {!isDefaultCash && (
                          <Pressable onPress={() => handleDeleteWallet(wallet.id, wallet.name)} style={{ padding: Spacing.one }}>
                            <Ionicons name="trash" size={16} color="#E74C3C" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* 3. Categories Accordion */}
        <Pressable
          onPress={() => setCategoriesExpanded(!categoriesExpanded)}
          style={[
            styles.accordionHeader,
            {
              backgroundColor: colors.backgroundElement,
              borderBottomLeftRadius: categoriesExpanded ? 0 : Spacing.three,
              borderBottomRightRadius: categoriesExpanded ? 0 : Spacing.three,
              marginBottom: categoriesExpanded ? 0 : Spacing.two,
            },
          ]}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="grid-outline" size={18} color="#9B51E0" style={{ marginRight: Spacing.two }} />
            <View>
              <Text style={[styles.accordionTitle, { color: colors.text }]}>Categories</Text>
              <Text style={[styles.accordionSubTitle, { color: colors.textSecondary }]}>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} defined</Text>
            </View>
          </View>
          <Ionicons name={categoriesExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
        </Pressable>

        {categoriesExpanded && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -Spacing.one, marginBottom: Spacing.two }]}>
            {/* Add Category Button */}
            <Pressable
              onPress={handleOpenAddCategoryModal}
              style={[styles.saveBtn, { height: 40, marginBottom: Spacing.two, flexDirection: 'row', gap: Spacing.one }]}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Add Category</Text>
            </Pressable>

            {/* List Categories */}
            <Text style={[styles.formSubtitle, { color: colors.text, marginTop: Spacing.three }]}>
              Current Categories (Swipe down to refresh list)
            </Text>
            <View style={styles.listContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                categories.map((cat) => (
                  <View key={cat.id} style={styles.listItem}>
                    <View style={styles.listItemMeta}>
                      <View style={[styles.catIconCircle, { backgroundColor: cat.color || '#828282' }]}>
                        <Ionicons name={(cat.icon || 'wallet') as any} size={14} color="#fff" />
                      </View>
                      <Text style={[styles.listItemText, { color: colors.text }]}>{cat.name}</Text>
                      <Text style={{ fontSize: 9, color: cat.type === 'INCOME' ? '#2ECC71' : '#E74C3C', fontWeight: 'bold' }}>
                        {cat.type}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                      <Pressable onPress={() => handleStartEditCategory(cat)} style={{ padding: Spacing.one }}>
                        <Ionicons name="create-outline" size={16} color="#4A90E2" />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteCategory(cat.id, cat.name)} style={{ padding: Spacing.one }}>
                        <Ionicons name="trash" size={16} color="#E74C3C" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* 4. Tags Accordion */}
        <Pressable
          onPress={() => setTagsExpanded(!tagsExpanded)}
          style={[
            styles.accordionHeader,
            {
              backgroundColor: colors.backgroundElement,
              borderBottomLeftRadius: tagsExpanded ? 0 : Spacing.three,
              borderBottomRightRadius: tagsExpanded ? 0 : Spacing.three,
              marginBottom: tagsExpanded ? 0 : Spacing.four,
            },
          ]}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="pricetags-outline" size={18} color="#FF7A59" style={{ marginRight: Spacing.two }} />
            <View>
              <Text style={[styles.accordionTitle, { color: colors.text }]}>Tags</Text>
              <Text style={[styles.accordionSubTitle, { color: colors.textSecondary }]}>{tags.length} custom tag{tags.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          <Ionicons name={tagsExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
        </Pressable>

        {tagsExpanded && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -Spacing.one, marginBottom: Spacing.four }]}>
            {/* Add Tag Button */}
            <Pressable
              onPress={handleOpenAddTagModal}
              style={[styles.saveBtn, { height: 40, marginBottom: Spacing.two, flexDirection: 'row', gap: Spacing.one }]}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Add Tag</Text>
            </Pressable>

            {/* List Tags */}
            <Text style={[styles.formSubtitle, { color: colors.text, marginTop: Spacing.three }]}>
              Current Tags
            </Text>
            <View style={styles.listContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : tags.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', padding: Spacing.two }}>
                  No custom tags created yet.
                </Text>
              ) : (
                tags.map((tag) => (
                  <View key={tag.id} style={styles.listItem}>
                    <View style={styles.listItemMeta}>
                      <View style={[styles.tagColorPill, { backgroundColor: tag.color || '#A0AEC0' }]}>
                        <Text style={styles.tagText}>{tag.name}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                      <Pressable onPress={() => handleStartEditTag(tag)} style={{ padding: Spacing.one }}>
                        <Ionicons name="create-outline" size={16} color="#4A90E2" />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteTag(tag.id, tag.name)} style={{ padding: Spacing.one }}>
                        <Ionicons name="trash" size={16} color="#E74C3C" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* 5. SpendSense AI Assistant Toggle */}
        <Pressable
          onPress={() => handleToggleAi(!isAiEnabled)}
          style={({ pressed }) => [
            styles.accordionHeader,
            {
              backgroundColor: colors.backgroundElement,
              borderRadius: Spacing.three,
              marginBottom: isAiEnabled ? Spacing.two : Spacing.four,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="sparkles-outline" size={18} color="#4A90E2" style={{ marginRight: Spacing.two }} />
            <View>
              <Text style={[styles.accordionTitle, { color: colors.text }]}>AI Assistant Features</Text>
              <Text style={[styles.accordionSubTitle, { color: colors.textSecondary }]}>
                {isAiEnabled ? 'Enabled (Chat agent is active)' : 'Disabled (Chat agent is hidden)'}
              </Text>
            </View>
          </View>
          <View pointerEvents="none">
            <Switch
              value={isAiEnabled}
              trackColor={{ false: '#767577', true: '#4A90E2' }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
            />
          </View>
        </Pressable>

        {/* 6. SpendSense Agent API Key Accordion */}
        {isAiEnabled && (
          <>
            <Pressable
              onPress={() => setApiKeyExpanded(!apiKeyExpanded)}
              style={[
                styles.accordionHeader,
                {
                  backgroundColor: colors.backgroundElement,
                  borderBottomLeftRadius: apiKeyExpanded ? 0 : Spacing.three,
                  borderBottomRightRadius: apiKeyExpanded ? 0 : Spacing.three,
                  marginBottom: apiKeyExpanded ? 0 : Spacing.four,
                },
              ]}
            >
              <View style={styles.accordionHeaderLeft}>
                <Ionicons name="key-outline" size={18} color="#FFD700" style={{ marginRight: Spacing.two }} />
                <View>
                  <Text style={[styles.accordionTitle, { color: colors.text }]}>SpendSense AI API Key</Text>
                  <Text style={[styles.accordionSubTitle, { color: colors.textSecondary }]}>
                    {isApiKeySet ? 'Status: Configured' : 'Status: Not Set (SpendSense AI agent disabled)'}
                  </Text>
                </View>
              </View>
              <Ionicons name={apiKeyExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
            </Pressable>

            {apiKeyExpanded && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -Spacing.one, marginBottom: Spacing.four }]}>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  Provide your own Google Gemini API Key. Your key is stored securely on this device's hardware keychain and is only sent to the server in-flight during requests. It is never saved on our databases or server disks.
                </Text>

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.two }]}>Gemini API Key</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="AIzaSy..."
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={true}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                />

                <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two }}>
                  {!isApiKeySet ? (
                    <Pressable
                      onPress={handleSaveApiKey}
                      disabled={apiKeySaving}
                      style={[styles.saveBtn, { flex: 1 }]}
                    >
                      {apiKeySaving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save Key</Text>
                      )}
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleClearApiKey}
                      style={[styles.secondaryBtn, { flex: 1, borderColor: '#E74C3C', marginTop: 0 }]}
                    >
                      <Text style={[styles.secondaryBtnText, { color: '#E74C3C' }]}>Clear Key</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Category Add/Edit Modal */}
      <Modal
        visible={catModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelEditCategory}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingCatId ? 'Edit Category' : 'Add Category'}
              </Text>
              <Pressable onPress={handleCancelEditCategory} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Form ScrollView */}
            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Category name"
                placeholderTextColor={colors.textSecondary}
                value={newCatName}
                onChangeText={setNewCatName}
              />

              {/* Category Type Selector - Hide when editing */}
              {!editingCatId && (
                <View style={{ marginBottom: Spacing.two }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Category Type</Text>
                  <View style={styles.typeToggle}>
                    <Pressable
                      onPress={() => setNewCatType('EXPENSE')}
                      style={[
                        styles.toggleBtn,
                        newCatType === 'EXPENSE'
                          ? { backgroundColor: '#E74C3C' }
                          : { backgroundColor: colors.backgroundSelected },
                      ]}
                    >
                      <Text style={[styles.toggleBtnText, newCatType === 'EXPENSE' ? { color: '#fff' } : { color: colors.text }]}>
                        Expense
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setNewCatType('INCOME')}
                      style={[
                        styles.toggleBtn,
                        newCatType === 'INCOME'
                          ? { backgroundColor: '#2ECC71' }
                          : { backgroundColor: colors.backgroundSelected },
                      ]}
                    >
                      <Text style={[styles.toggleBtnText, newCatType === 'INCOME' ? { color: '#fff' } : { color: colors.text }]}>
                        Income
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Select Color */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.one }]}>Select Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40, marginBottom: Spacing.one }}>
                <View style={styles.presetColorGrid}>
                  {PRESET_COLORS.map((col) => (
                    <Pressable
                      key={col}
                      onPress={() => setNewCatColor(col)}
                      style={[
                        styles.colorPill,
                        { backgroundColor: col },
                        newCatColor === col ? { borderColor: colors.text, borderWidth: 2 } : null,
                      ]}
                    />
                  ))}
                </View>
              </ScrollView>

              {/* Select Icon */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.two }]}>Select Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 45, marginBottom: Spacing.two }}>
                <View style={styles.presetColorGrid}>
                  {PRESET_ICONS.map((ico) => (
                    <Pressable
                      key={ico}
                      onPress={() => setNewCatIcon(ico)}
                      style={[
                        styles.iconOptionBtn,
                        { backgroundColor: colors.backgroundSelected },
                        newCatIcon === ico ? { borderColor: '#4A90E2', borderWidth: 2 } : null,
                      ]}
                    >
                      <Ionicons name={ico as any} size={18} color={colors.text} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Save Button */}
              <Pressable
                onPress={handleSaveCategory}
                disabled={catSubmitting}
                style={[styles.saveBtn, { marginTop: Spacing.three }]}
              >
                {catSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingCatId ? 'Save Changes' : 'Create Category'}</Text>
                )}
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                onPress={handleCancelEditCategory}
                style={[styles.secondaryBtn, { borderColor: colors.backgroundSelected, marginTop: Spacing.two }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Wallet Add/Edit Modal */}
      <Modal
        visible={walletModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelEditWallet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingWalletId ? 'Edit Wallet' : 'Add Wallet'}
              </Text>
              <Pressable onPress={handleCancelEditWallet} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Form ScrollView */}
            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Wallet Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Wallet name (e.g. Chase Bank, Handcash)"
                placeholderTextColor={colors.textSecondary}
                value={newWalletName}
                onChangeText={setNewWalletName}
              />

              {/* Wallet Type Toggle - Disable when CASH wallet default */}
              <View style={{ marginBottom: Spacing.three }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Wallet Type</Text>
                <View style={styles.typeToggle}>
                  <Pressable
                    onPress={() => {
                      if (editingWalletId && wallets.find(w => w.id === editingWalletId)?.name.toLowerCase() === 'cash wallet') {
                        return;
                      }
                      setNewWalletType('CASH');
                    }}
                    disabled={!!(editingWalletId && wallets.find(w => w.id === editingWalletId)?.name.toLowerCase() === 'cash wallet')}
                    style={[
                      styles.toggleBtn,
                      newWalletType === 'CASH'
                        ? { backgroundColor: '#4A90E2' }
                        : { backgroundColor: colors.backgroundSelected },
                      editingWalletId && wallets.find(w => w.id === editingWalletId)?.name.toLowerCase() === 'cash wallet' ? { opacity: 0.5 } : null,
                    ]}
                  >
                    <Text style={[styles.toggleBtnText, newWalletType === 'CASH' ? { color: '#fff' } : { color: colors.text }]}>
                      Cash Wallet
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (editingWalletId && wallets.find(w => w.id === editingWalletId)?.name.toLowerCase() === 'cash wallet') {
                        return;
                      }
                      setNewWalletType('BANK');
                    }}
                    disabled={!!(editingWalletId && wallets.find(w => w.id === editingWalletId)?.name.toLowerCase() === 'cash wallet')}
                    style={[
                      styles.toggleBtn,
                      newWalletType === 'BANK'
                        ? { backgroundColor: '#4A90E2' }
                        : { backgroundColor: colors.backgroundSelected },
                      editingWalletId && wallets.find(w => w.id === editingWalletId)?.name.toLowerCase() === 'cash wallet' ? { opacity: 0.5 } : null,
                    ]}
                  >
                    <Text style={[styles.toggleBtnText, newWalletType === 'BANK' ? { color: '#fff' } : { color: colors.text }]}>
                      Bank Account
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSaveWallet}
                disabled={walletSubmitting}
                style={[styles.saveBtn, { marginTop: Spacing.two }]}
              >
                {walletSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingWalletId ? 'Save Wallet' : 'Add Wallet'}</Text>
                )}
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                onPress={handleCancelEditWallet}
                style={[styles.secondaryBtn, { borderColor: colors.backgroundSelected, marginTop: Spacing.two }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tag Add/Edit Modal */}
      <Modal
        visible={tagModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelEditTag}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingTagId ? 'Edit Tag' : 'Add Tag'}
              </Text>
              <Pressable onPress={handleCancelEditTag} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Form ScrollView */}
            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Tag Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Tag name (e.g. Outing)"
                placeholderTextColor={colors.textSecondary}
                value={newTagName}
                onChangeText={setNewTagName}
              />

              {/* Select Color */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.one }]}>Select Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40, marginBottom: Spacing.one }}>
                <View style={styles.presetColorGrid}>
                  {PRESET_COLORS.map((col) => (
                    <Pressable
                      key={col}
                      onPress={() => setNewTagColor(col)}
                      style={[
                        styles.colorPill,
                        { backgroundColor: col },
                        newTagColor === col ? { borderColor: colors.text, borderWidth: 2 } : null,
                      ]}
                    />
                  ))}
                </View>
              </ScrollView>

              {/* Save Button */}
              <Pressable
                onPress={handleSaveTag}
                disabled={tagSubmitting}
                style={[styles.saveBtn, { marginTop: Spacing.two }]}
              >
                {tagSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingTagId ? 'Save Changes' : 'Create Tag'}</Text>
                )}
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                onPress={handleCancelEditTag}
                style={[styles.secondaryBtn, { borderColor: colors.backgroundSelected, marginTop: Spacing.two }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accordionHeader: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  accordionSubTitle: {
    fontSize: 11,
    marginTop: 2,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  card: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: Spacing.one,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  currencyPill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  formSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  inlineForm: {
    gap: Spacing.two,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: Spacing.one,
  },
  presetColorGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  colorPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  iconOptionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    height: 40,
    backgroundColor: '#4A90E2',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContainer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  catIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagColorPill: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    height: 40,
    borderWidth: 1,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
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
  formContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.half,
  },
});

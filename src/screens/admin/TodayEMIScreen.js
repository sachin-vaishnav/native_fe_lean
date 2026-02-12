import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';

const TABS = [
  { id: 'collections', label: 'Collections' },
  { id: 'today', label: "Today's EMIs" },
  { id: 'overdue', label: 'Overdue' },
];

const TodayEMIScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'collections');

  // Update activeTab if route params change
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const [emis, setEmis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // UI States
  const [showFilters, setShowFilters] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [pickingDateFor, setPickingDateFor] = useState(''); // 'start' or 'end'

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchData = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else if (pageNum === 1) setLoading(true);

    try {
      let statusParams = [];
      if (activeTab === 'collections') statusParams = ['paid'];
      else if (activeTab === 'today') statusParams = ['pending', 'overdue', 'paid']; // Show all for today
      else if (activeTab === 'overdue') statusParams = ['overdue'];

      const params = {
        status: statusParams,
        userIds: selectedUserIds.join(','),
        page: pageNum,
        limit: 20
      };

      if (activeTab === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.startDate = today.toISOString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        params.endDate = tomorrow.toISOString();
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await adminAPI.getEMIs(params);

      if (isLoadMore) {
        setEmis(prev => [...prev, ...res.data.emis]);
      } else {
        setEmis(res.data.emis);
      }

      setSummary(res.data.summary);
      setHasMore(res.data.pagination.page < res.data.pagination.pages);
      setPage(res.data.pagination.page);

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load EMIs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchData(1);
      fetchUsers();
    }, [activeTab, startDate, endDate, selectedUserIds])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchData(1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchData(page + 1, true);
    }
  };

  const handleMarkPaid = (emiId) => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to manually mark this EMI as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await adminAPI.markEMIPaid(emiId);
              Alert.alert('Success', 'EMI marked as paid');
              fetchData(false);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to update');
            }
          }
        }
      ]
    );
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const openDatePicker = (type) => {
    setPickingDateFor(type);
    setTempDate(type === 'start' ? startDate : endDate);
    setShowDatePickerModal(true);
  };

  const saveDate = () => {
    if (pickingDateFor === 'start') setStartDate(tempDate);
    else setEndDate(tempDate);
    setShowDatePickerModal(false);
  };

  const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || 0}`;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderEMIItem = ({ item }) => (
    <Card style={styles.emiCard}>
      <View style={styles.emiHeader}>
        <View style={styles.userSection}>
          <Text style={styles.userName}>{item.userId?.name || 'Unknown'}</Text>
          <Text style={styles.userMobile}>{item.userId?.mobile || 'No Mobile'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? colors.successLight : (item.status === 'overdue' ? colors.errorLight : colors.warningLight) }]}>
          <Text style={[styles.statusText, { color: item.status === 'paid' ? colors.success : (item.status === 'overdue' ? colors.error : colors.warning) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.emiInfo}>
        <View style={styles.emiRow}>
          <Text style={styles.emiLabel}>Amount:</Text>
          <Text style={styles.emiValue}>{formatCurrency(item.totalAmount)}</Text>
        </View>
        <View style={styles.emiRow}>
          <Text style={styles.emiLabel}>Due Date:</Text>
          <Text style={styles.emiValue}>{formatDate(item.dueDate)}</Text>
        </View>
        {item.status === 'paid' && item.paidAt && (
          <View style={styles.emiRow}>
            <Text style={styles.emiLabel}>Paid At:</Text>
            <Text style={styles.emiValue}>{formatDate(item.paidAt)}</Text>
          </View>
        )}
      </View>

      {item.status !== 'paid' && (
        <TouchableOpacity style={styles.payBtn} onPress={() => handleMarkPaid(item._id)}>
          <Text style={styles.payBtnText}>Receive Payment</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Summary Header - Only Collected */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>EMI Management</Text>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterToggle}>
            <Ionicons name="filter" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.collectedCard}>
          <Text style={styles.collectedLabel}>{activeTab === 'collections' ? 'Total Collected' : 'Filtered Collection'}</Text>
          <Text style={styles.collectedValue}>{formatCurrency(summary?.collectedAmount)}</Text>
          <Text style={styles.countLabel}>{summary?.paid || 0} Successful Transactions</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters Overlay */}
      {showFilters && (
        <View style={styles.filtersOverlay}>
          <Card style={styles.filtersContainer}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Options</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Date Range</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('start')}>
                <Text style={styles.dateInputLabel}>From</Text>
                <Text style={styles.dateInputValue}>{startDate || 'Any Time'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('end')}>
                <Text style={styles.dateInputLabel}>To</Text>
                <Text style={styles.dateInputValue}>{endDate || 'Any Time'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>User Selection</Text>
            <TouchableOpacity
              style={styles.userPicker}
              onPress={() => setShowUserDropdown(!showUserDropdown)}
            >
              <Text style={styles.userPickerValue}>
                {selectedUserIds.length === 0 ? 'All Customers' : `${selectedUserIds.length} Customers Selected`}
              </Text>
              <Ionicons name={showUserDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textLight} />
            </TouchableOpacity>

            {showUserDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                  {users.map(u => (
                    <TouchableOpacity
                      key={u._id}
                      style={styles.dropdownItem}
                      onPress={() => toggleUserSelection(u._id)}
                    >
                      <Ionicons
                        name={selectedUserIds.includes(u._id) ? "checkbox" : "square-outline"}
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.dropdownText}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.filterActions}>
              <Button
                title="Reset"
                variant="outline"
                size="small"
                onPress={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedUserIds([]);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Apply Filters"
                size="small"
                onPress={() => setShowFilters(false)}
                style={{ flex: 2 }}
              />
            </View>
          </Card>
        </View>
      )}

      {/* Basic Date Picker Modal */}
      <Modal visible={showDatePickerModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Card style={styles.dateModal}>
            <Text style={styles.modalTitle}>Set {pickingDateFor === 'start' ? 'Start' : 'End'} Date</Text>
            <Text style={styles.modalSub}>Type in YYYY-MM-DD format</Text>
            <TextInput
              style={styles.modalInput}
              value={tempDate}
              onChangeText={setTempDate}
              placeholder="2024-12-31"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveDate} style={[styles.modalBtn, styles.modalBtnPrimary]}>
                <Text style={styles.modalBtnTextPrimary}>Set Date</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={emis}
          renderItem={renderEMIItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={() => (
            hasMore ? (
              <View style={styles.footerLoader}>
                <Button
                  title={loadingMore ? "Loading..." : "Load More (20)"}
                  onPress={handleLoadMore}
                  loading={loadingMore}
                  variant="outline"
                />
              </View>
            ) : null
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color={colors.border} />
              <Text style={styles.emptyText}>No matching EMIs records</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filterToggle: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  collectedCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  collectedLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  collectedValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: fontWeight.bold,
  },
  countLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  filtersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    padding: spacing.md,
    justifyContent: 'center',
  },
  filtersContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  filterTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 0.48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  dateInputLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 2,
  },
  dateInputValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  userPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  userPickerValue: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  filterActions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emiCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  emiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userMobile: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  emiInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  emiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  emiLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emiValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  payBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  payBtnText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    opacity: 0.5,
  },
  emptyText: {
    color: colors.textLight,
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dateModal: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalInput: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    fontSize: 24,
    textAlign: 'center',
    padding: spacing.sm,
    marginBottom: spacing.xl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  modalBtnTextCancel: {
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  modalBtnTextPrimary: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
});

export default TodayEMIScreen;

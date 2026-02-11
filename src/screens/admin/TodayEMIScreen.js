import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';

const TodayEMIScreen = ({ navigation }) => {
  const [emis, setEmis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchTodayEMIs = async () => {
    try {
      const response = await adminAPI.getTodayEMIs();
      setEmis(response.data.emis);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching today EMIs:', error);
      Alert.alert('Error', 'Failed to load EMIs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodayEMIs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayEMIs();
  };

  const handleProcessOverdues = () => {
    Alert.alert(
      'Process Overdues',
      'Mark all pending EMIs with past due dates as overdue and apply penalty (₹120/day)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            setProcessing(true);
            try {
              const res = await adminAPI.processOverdues();
              Alert.alert('Done', res.data.message || 'Overdues processed');
              fetchTodayEMIs();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed');
            }
            setProcessing(false);
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || 0}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'overdue':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'paid':
        return colors.successLight;
      case 'overdue':
        return colors.errorLight;
      default:
        return colors.warningLight;
    }
  };

  const renderEMIItem = ({ item }) => (
    <View style={styles.emiCard}>
      <View style={styles.emiHeader}>
        <View>
          <Text style={styles.userName}>
            {item.userId?.name || item.loanId?.applicantName || 'Unknown'}
          </Text>
          <Text style={styles.userMobile}>{item.userId?.mobile}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBgColor(item.status) },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.emiDetails}>
        <View style={styles.emiRow}>
          <Text style={styles.emiLabel}>Day {item.dayNumber} EMI</Text>
          <Text style={styles.emiAmount}>{formatCurrency(item.totalAmount)}</Text>
        </View>
        <View style={styles.emiRow}>
          <Text style={styles.emiSubLabel}>
            Loan: {formatCurrency(item.loanId?.amount)}
          </Text>
          {item.penaltyAmount > 0 && (
            <Text style={styles.penaltyText}>
              +{formatCurrency(item.penaltyAmount)} penalty
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.summaryContainer}>
      <Button
        title="Process Overdues"
        onPress={handleProcessOverdues}
        loading={processing}
        variant="outline"
        size="small"
        style={styles.processBtn}
      />
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary?.total || 0}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.paidValue]}>
              {summary?.paid || 0}
            </Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.pendingValue]}>
              {summary?.pending || 0}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.overdueValue]}>
              {summary?.overdue || 0}
            </Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
        </View>

        <View style={styles.amountSummary}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Expected Collection:</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(summary?.totalAmount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Collected:</Text>
            <Text style={[styles.amountValue, styles.collectedValue]}>
              {formatCurrency(summary?.collectedAmount)}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No EMIs due today</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={emis}
        renderItem={renderEMIItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
  },
  summaryContainer: {
    marginBottom: spacing.md,
  },
  processBtn: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  summaryCard: {
    backgroundColor: colors.surface,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paidValue: {
    color: colors.success,
  },
  pendingValue: {
    color: colors.warning,
  },
  overdueValue: {
    color: colors.error,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  amountSummary: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  amountLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  amountValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  collectedValue: {
    color: colors.success,
  },
  emiCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  userMobile: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  emiDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  emiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emiLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emiAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  emiSubLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  penaltyText: {
    fontSize: fontSize.xs,
    color: colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default TodayEMIScreen;

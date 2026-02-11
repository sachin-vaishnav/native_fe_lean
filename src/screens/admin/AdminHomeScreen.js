import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
    } else {
      window.alert(`${title}: ${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const AdminHomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleReviewLoan = (loan) => {
    navigation.navigate('LoanReview', { loan });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || 0}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = dashboard?.stats || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <Text style={styles.statValueWhite}>{stats.totalUsers || 0}</Text>
            <Text style={styles.statLabelWhite}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.warningValue]}>
              {stats.pendingLoans || 0}
            </Text>
            <Text style={styles.statLabel}>Pending Loans</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.successValue]}>
              {stats.activeLoans || 0}
            </Text>
            <Text style={styles.statLabel}>Active Loans</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.errorValue]}>
              {stats.overdueEMIs || 0}
            </Text>
            <Text style={styles.statLabel}>Overdue EMIs</Text>
          </View>
        </View>

        {/* Today's EMIs */}
        <Card
          title="Today's EMIs"
          onPress={() => navigation.navigate('EMIsTab')}
        >
          <View style={styles.todayEmiContainer}>
            <View style={styles.todayEmiStat}>
              <Text style={styles.todayEmiValue}>{stats.todayEMIs || 0}</Text>
              <Text style={styles.todayEmiLabel}>Total</Text>
            </View>
            <View style={styles.todayEmiDivider} />
            <View style={styles.todayEmiStat}>
              <Text style={[styles.todayEmiValue, styles.warningValue]}>
                {stats.todayPendingEMIs || 0}
              </Text>
              <Text style={styles.todayEmiLabel}>Pending</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('EMIsTab')}
          >
            <Text style={styles.viewAllText}>View All Today's EMIs →</Text>
          </TouchableOpacity>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="View All Users"
            onPress={() => navigation.navigate('UsersTab')}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="EMI Statistics"
            onPress={() => navigation.navigate('TotalEMIs')}
            variant="outline"
            style={styles.actionButton}
          />
        </View>

        {/* Pending Loan Applications */}
        {dashboard?.recentApplications?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Loan Applications</Text>
            {dashboard.recentApplications.map((loan) => (
              <TouchableOpacity
                key={loan._id}
                style={styles.applicationCard}
                onPress={() => handleReviewLoan(loan)}
              >
                <View style={styles.applicationHeader}>
                  <Text style={styles.applicationAmount}>
                    {formatCurrency(loan.amount)}
                  </Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>PENDING</Text>
                  </View>
                </View>
                <Text style={styles.applicationName}>{loan.applicantName}</Text>
                <Text style={styles.applicationMobile}>
                  {loan.applicantMobile}
                </Text>
                <Text style={styles.reviewText}>Tap to Review →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: colors.primary,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statValueWhite: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  successValue: {
    color: colors.success,
  },
  warningValue: {
    color: colors.warning,
  },
  errorValue: {
    color: colors.error,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statLabelWhite: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  todayEmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  todayEmiStat: {
    flex: 1,
    alignItems: 'center',
  },
  todayEmiDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  todayEmiValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  todayEmiLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  applicationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  applicationAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  pendingBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pendingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  applicationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  applicationMobile: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reviewText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.md,
    textAlign: 'right',
  },
});

export default AdminHomeScreen;

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { crescaCalendarPaymentsService, ScheduledPayment } from '../services/contractServices';
import { web3Service } from '../services/web3Service';

export default function CalendarScreen() {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduledPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'schedules'>('create');
  
  // Create form
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [intervalDays, setIntervalDays] = useState('30');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      const walletData = await web3Service.initializeWallet();
      setWalletAddress(walletData.address);
      
      const walletBalance = await web3Service.getBalance();
      setBalance(parseFloat(walletBalance).toFixed(3));
      
      await loadSchedules();
    } catch (error) {
      console.error('Error initializing wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const userSchedules = await crescaCalendarPaymentsService.getUserPayments(walletAddress).catch(() => []);
      setSchedules(userSchedules);
    } catch (error) {
      console.warn('Could not load schedules:', error);
    }
  };

  const handleCreateSchedule = async () => {
    if (!recipientAddress || !amount || !intervalDays) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseInt(intervalDays) <= 0) {
      Alert.alert('Error', 'Please enter a valid interval');
      return;
    }

    try {
      setIsCreating(true);
      
      const txHash = await crescaCalendarPaymentsService.createScheduledPayment(
        recipientAddress,
        amount,
        parseInt(intervalDays)
      );
      
      const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;
      
      Alert.alert(
        '✓ Schedule Created',
        'Your recurring payment has been scheduled successfully.',
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      
      // Reset form
      setRecipientAddress('');
      setAmount('');
      setIntervalDays('30');
      
      // Refresh data
      await loadSchedules();
      const newBalance = await web3Service.getBalance();
      setBalance(parseFloat(newBalance).toFixed(3));
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create schedule');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExecuteSchedule = async (scheduleId: number) => {
    try {
      const txHash = await crescaCalendarPaymentsService.executePayment(scheduleId, walletAddress);
      
      const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;
      
      Alert.alert(
        '✓ Payment Executed',
        'The scheduled payment has been executed.',
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      
      await loadSchedules();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to execute payment');
    }
  };

  const handleCancelSchedule = async (scheduleId: number) => {
    Alert.alert(
      'Cancel Schedule',
      'Are you sure you want to cancel this scheduled payment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const txHash = await crescaCalendarPaymentsService.cancelPayment(scheduleId);
              
              const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;
              
              Alert.alert(
                '✓ Schedule Cancelled',
                'The scheduled payment has been cancelled.',
                [
                  { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
                  { text: 'OK', style: 'cancel' }
                ]
              );
              
              await loadSchedules();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel schedule');
            }
          }
        }
      ]
    );
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scheduled Payments</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>{balance} MON</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            Create
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedules' && styles.tabActive]}
          onPress={() => setActiveTab('schedules')}
        >
          <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive]}>
            My Schedules
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'create' ? (
          <View style={styles.createContainer}>
            <View style={styles.infoCard}>
              <Ionicons name="calendar" size={32} color="#6C5CE7" />
              <Text style={styles.infoTitle}>Recurring Payments</Text>
              <Text style={styles.infoDescription}>
                Set up automatic payments that execute at regular intervals. Perfect for subscriptions, rent, or any recurring expense.
              </Text>
            </View>

            {/* Recipient Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recipient Address</Text>
              <TextInput
                style={styles.input}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder="0x..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount per Payment</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.amountCurrency}>MON</Text>
              </View>
            </View>

            {/* Interval */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Interval (days)</Text>
              <View style={styles.intervalContainer}>
                <TextInput
                  style={styles.intervalInput}
                  value={intervalDays}
                  onChangeText={setIntervalDays}
                  placeholder="30"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
                <Text style={styles.intervalLabel}>days</Text>
              </View>
              <Text style={styles.hint}>Payment will execute every {intervalDays || '0'} days</Text>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateSchedule}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Schedule</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.schedulesContainer}>
            {schedules.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Schedules Yet</Text>
                <Text style={styles.emptyText}>
                  Create your first recurring payment to get started
                </Text>
              </View>
            ) : (
              schedules.map((schedule, index) => (
                <View key={schedule.id || index} style={styles.scheduleCard}>
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleIconContainer}>
                      <Ionicons name="repeat" size={24} color="#6C5CE7" />
                    </View>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleAmount}>{schedule.amount} MON</Text>
                      <Text style={styles.scheduleRecipient}>
                        To: {formatAddress(schedule.recipient)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      schedule.isActive ? styles.statusActive : styles.statusInactive
                    ]}>
                      <Text style={styles.statusText}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scheduleDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Interval</Text>
                      <Text style={styles.detailValue}>Every {schedule.intervalSeconds / 86400} days</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Next Payment</Text>
                      <Text style={styles.detailValue}>{formatDate(schedule.executeAt)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created</Text>
                      <Text style={styles.detailValue}>{formatDate(schedule.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.scheduleActions}>
                    {schedule.isActive && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleExecuteSchedule(schedule.id)}
                      >
                        <Ionicons name="play-circle" size={20} color="#10B981" />
                        <Text style={[styles.actionButtonText, { color: '#10B981' }]}>
                          Execute Now
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCancelSchedule(schedule.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#6C5CE7',
  },
  content: {
    flex: 1,
  },
  createContainer: {
    padding: 20,
  },
  infoCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 14,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  intervalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 14,
  },
  intervalLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  schedulesContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  scheduleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  scheduleRecipient: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  scheduleDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

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
    Modal,
} from 'react-native';
import { crescaCalendarPaymentsService, ScheduledPayment } from '../services/contractServices';
import { web3Service } from '../services/web3Service';

export default function CalendarScreen() {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduledPayment[]>([]);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create form
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [intervalDays, setIntervalDays] = useState('7');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [isCreating, setIsCreating] = useState(false);
  const [creationTxHash, setCreationTxHash] = useState<string>('');

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      const walletData = await web3Service.initializeWallet();
      setWalletAddress(walletData.address);
      
      const walletBalance = await web3Service.getBalance();
      setBalance(parseFloat(walletBalance).toFixed(3));
      
      // Load schedules using the address directly
      await loadSchedules(walletData.address);
    } catch (error) {
      console.error('Error initializing wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async (address?: string) => {
    try {
      const addressToUse = address || walletAddress;
      if (!addressToUse) {
        console.log('⚠️ No wallet address available yet');
        return;
      }
      
      const userSchedules = await crescaCalendarPaymentsService.getUserPayments(addressToUse).catch(() => []);
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

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    try {
      setIsCreating(true);
      
      // Create execution date with selected time (convert 12-hour to 24-hour)
      const executionDate = new Date(selectedDate);
      let hour24 = parseInt(selectedHour) || 12;
      if (selectedPeriod === 'AM' && hour24 === 12) hour24 = 0;
      if (selectedPeriod === 'PM' && hour24 !== 12) hour24 += 12;
      executionDate.setHours(hour24);
      executionDate.setMinutes(parseInt(selectedMinute) || 0);
      executionDate.setSeconds(0);
      executionDate.setMilliseconds(0);
      
      // Convert to Unix timestamp (seconds)
      const executeAtTimestamp = Math.floor(executionDate.getTime() / 1000);
      
      // Check if execution time is in the future
      if (executeAtTimestamp <= Math.floor(Date.now() / 1000)) {
        Alert.alert('Error', 'Execution time must be in the future');
        setIsCreating(false);
        return;
      }
      
      // Calculate interval in seconds
      const intervalSeconds = parseInt(intervalDays) * 24 * 60 * 60;
      const occurrences = 12; // Default 12 payments
      
      const txHash = await crescaCalendarPaymentsService.createSchedule(
        recipientAddress,
        amount,
        executeAtTimestamp,
        intervalSeconds,
        occurrences
      );
      
      // Store transaction hash
      setCreationTxHash(txHash);
      console.log('📝 Schedule created with tx:', txHash);
      
      const explorerUrl = `https://monad-testnet.socialscan.io/tx/${txHash}`;
      
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
      setIntervalDays('7');
      setSelectedHour('12');
      setSelectedMinute('00');
      setSelectedPeriod('PM');
      setShowCreateModal(false);
      
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
      console.log('⚡ Executing schedule:', scheduleId, 'for payer:', walletAddress);
      const txHash = await crescaCalendarPaymentsService.executePayment(walletAddress, scheduleId);
      
      const explorerUrl = `https://monad-testnet.socialscan.io/tx/${txHash}`;
      
      Alert.alert(
        '✓ Payment Executed',
        'The scheduled payment has been executed successfully.',
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      
      // Refresh schedules and balance
      await loadSchedules();
      const newBalance = await web3Service.getBalance();
      setBalance(parseFloat(newBalance).toFixed(3));
    } catch (error: any) {
      console.error('Failed to execute payment:', error);
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
              console.log('🚫 Canceling schedule:', scheduleId);
              const txHash = await crescaCalendarPaymentsService.cancelPayment(scheduleId);
              
              const explorerUrl = `https://monad-testnet.socialscan.io/tx/${txHash}`;
              
              Alert.alert(
                '✓ Schedule Cancelled',
                'The scheduled payment has been cancelled successfully.',
                [
                  { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
                  { text: 'OK', style: 'cancel' }
                ]
              );
              
              // Refresh schedules and balance
              await loadSchedules();
              const newBalance = await web3Service.getBalance();
              setBalance(parseFloat(newBalance).toFixed(3));
            } catch (error: any) {
              console.error('Failed to cancel schedule:', error);
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
    // Contract returns Unix timestamps in seconds, convert to milliseconds
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewScheduleOnExplorer = (scheduleId: number) => {
    // For now, use the creation tx hash if available
    // In production, you'd fetch the specific schedule's transaction hash
    if (creationTxHash) {
      const explorerUrl = `https://monad-testnet.socialscan.io/tx/${creationTxHash}`;
      Linking.openURL(explorerUrl);
    } else {
      Alert.alert('Info', 'Transaction hash not available for this schedule');
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Previous month's days
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i)
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      });
    }

    // Next month's days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      });
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const hasScheduledPayment = (date: Date) => {
    return schedules.some(schedule => {
      const scheduleDate = new Date(schedule.executeAt * 1000); // Convert Unix timestamp to milliseconds
      return scheduleDate.getDate() === date.getDate() &&
             scheduleDate.getMonth() === date.getMonth() &&
             scheduleDate.getFullYear() === date.getFullYear() &&
             schedule.active;
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
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="expand-outline" size={24} color="#6C5CE7" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Main Wallet</Text>
          <View style={styles.walletIdContainer}>
            <Text style={styles.walletId}>ID: {formatAddress(walletAddress)}</Text>
            <Ionicons name="copy-outline" size={16} color="#9CA3AF" />
          </View>
        </View>
        <TouchableOpacity style={styles.walletIcon}>
          <Ionicons name="wallet-outline" size={24} color="#6C5CE7" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scheduleTitleContainer}>
          <Text style={styles.scheduleTitle}>Schedule</Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <Text style={styles.monthYear}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.navigationButtons}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Week Days */}
          <View style={styles.weekDays}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={index} style={styles.weekDay}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {renderCalendar().map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !item.isCurrentMonth && styles.calendarDayInactive,
                  isToday(item.date) && styles.calendarDayToday,
                ]}
                onPress={() => {
                  setSelectedDate(item.date);
                  setShowCreateModal(true);
                }}
              >
                <Text style={[
                  styles.calendarDayText,
                  !item.isCurrentMonth && styles.calendarDayTextInactive,
                  isToday(item.date) && styles.calendarDayTextToday,
                ]}>
                  {item.day}
                </Text>
                {hasScheduledPayment(item.date) && (
                  <View style={styles.scheduleDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scheduled Payments List */}
        <View style={styles.schedulesListContainer}>
          <Text style={styles.schedulesListTitle}>Scheduled Payments</Text>
          
          {/* Recent Transaction */}
          {creationTxHash && (
            <TouchableOpacity 
              style={styles.recentTxCard}
              onPress={() => Linking.openURL(`https://monad-testnet.socialscan.io/tx/${creationTxHash}`)}
              activeOpacity={0.7}
            >
              <View style={styles.recentTxHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.recentTxTitle}>Recent Transaction</Text>
              </View>
              <Text style={styles.recentTxHash} numberOfLines={1}>
                {creationTxHash.substring(0, 12)}...{creationTxHash.substring(creationTxHash.length - 8)}
              </Text>
              <Text style={styles.recentTxLink}>Tap to view on Monad Explorer →</Text>
            </TouchableOpacity>
          )}
          
          {schedules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Schedules Yet</Text>
              <Text style={styles.emptyText}>
                Tap any date on the calendar to create a scheduled payment
              </Text>
            </View>
          ) : (
              schedules.map((schedule, index) => (
                <TouchableOpacity 
                  key={schedule.id || index} 
                  style={styles.scheduleCard}
                  onPress={() => handleViewScheduleOnExplorer(schedule.id)}
                  activeOpacity={0.7}
                >
                  {/* Header with Amount and Status */}
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleIconContainer}>
                      <Ionicons name="repeat" size={24} color="#6C5CE7" />
                    </View>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleAmount}>
                        {parseFloat(schedule.amount).toFixed(4)} MON
                      </Text>
                      <Text style={styles.scheduleRecipient}>
                        To: {formatAddress(schedule.recipient)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      schedule.active ? styles.statusActive : styles.statusInactive
                    ]}>
                      <Text style={styles.statusText}>
                        {schedule.active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Info Grid */}
                  <View style={styles.paymentInfoGrid}>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>Interval</Text>
                      <Text style={styles.infoValue}>Every {Math.floor(schedule.intervalSeconds / 86400)}d</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>Progress</Text>
                      <Text style={styles.infoValue}>{schedule.executedCount}/{schedule.occurrences}</Text>
                    </View>
                  </View>

                  {/* Details Section */}
                  <View style={styles.scheduleDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Next Payment</Text>
                      <Text style={styles.detailValue}>{formatDate(schedule.executeAt)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Escrow Balance</Text>
                      <Text style={[styles.detailValue, schedule.escrowBalance === '0' && styles.zeroBalance]}>
                        {parseFloat(schedule.escrowBalance).toFixed(4)} MON
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Value</Text>
                      <Text style={styles.detailValue}>
                        {(parseFloat(schedule.amount) * schedule.occurrences).toFixed(4)} MON
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.scheduleActions}>
                    {schedule.active ? (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonPrimary]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleExecuteSchedule(schedule.id);
                          }}
                        >
                          <Ionicons name="play-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionButtonTextPrimary}>
                            Execute
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCancelSchedule(schedule.id);
                          }}
                        >
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonSecondary, { flex: 1 }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelSchedule(schedule.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
        </View>
      </ScrollView>

      {/* Create Schedule Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Payment</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedDate && (
                <View style={styles.selectedDateCard}>
                  <Ionicons name="calendar" size={24} color="#6C5CE7" />
                  <Text style={styles.selectedDateText}>
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Execution Time</Text>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={styles.timeInput}
                      value={selectedHour}
                      onChangeText={(text) => {
                        // Allow empty or valid numbers
                        if (text === '') {
                          setSelectedHour('');
                          return;
                        }
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 1 && num <= 12) {
                          setSelectedHour(text);
                        }
                      }}
                      onBlur={() => {
                        // Pad with zero on blur if needed
                        if (selectedHour && selectedHour.length === 1) {
                          setSelectedHour(selectedHour.padStart(2, '0'));
                        } else if (selectedHour === '' || parseInt(selectedHour) < 1 || parseInt(selectedHour) > 12) {
                          setSelectedHour('12');
                        }
                      }}
                      placeholder="12"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.timeLabel}>Hour</Text>
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={styles.timeInput}
                      value={selectedMinute}
                      onChangeText={(text) => {
                        // Allow empty or valid numbers
                        if (text === '') {
                          setSelectedMinute('');
                          return;
                        }
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 0 && num <= 59) {
                          setSelectedMinute(text);
                        }
                      }}
                      onBlur={() => {
                        // Pad with zero on blur if needed
                        if (selectedMinute && selectedMinute.length === 1) {
                          setSelectedMinute(selectedMinute.padStart(2, '0'));
                        } else if (selectedMinute === '') {
                          setSelectedMinute('00');
                        }
                      }}
                      placeholder="00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.timeLabel}>Minute</Text>
                  </View>
                  <View style={styles.periodToggle}>
                    <TouchableOpacity
                      style={[styles.periodButton, selectedPeriod === 'AM' && styles.periodButtonActive]}
                      onPress={() => setSelectedPeriod('AM')}
                    >
                      <Text style={[styles.periodText, selectedPeriod === 'AM' && styles.periodTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.periodButton, selectedPeriod === 'PM' && styles.periodButtonActive]}
                      onPress={() => setSelectedPeriod('PM')}
                    >
                      <Text style={[styles.periodText, selectedPeriod === 'PM' && styles.periodTextActive]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.hint}>Payment will execute at {selectedHour}:{selectedMinute} {selectedPeriod}</Text>
              </View>

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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repeat Every (days)</Text>
                <View style={styles.intervalContainer}>
                  <TextInput
                    style={styles.intervalInput}
                    value={intervalDays}
                    onChangeText={setIntervalDays}
                    placeholder="7"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                  <Text style={styles.intervalLabel}>days</Text>
                </View>
                <Text style={styles.hint}>Payment will execute every {intervalDays || '0'} days</Text>
              </View>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color="#6C5CE7" />
                <Text style={styles.infoText}>
                  The smart contract will automatically execute this payment every {intervalDays || '0'} days. You can cancel or execute manually at any time.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.createButton, isCreating && styles.createButtonDisabled]}
                onPress={handleCreateSchedule}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Create Schedule</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  walletIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletId: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  walletIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scheduleTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scheduleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthNavigation: {
    marginBottom: 24,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: '#1F2937',
    borderRadius: 50,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#1F2937',
  },
  calendarDayTextInactive: {
    color: '#9CA3AF',
  },
  calendarDayTextToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scheduleDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C5CE7',
  },
  schedulesListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  schedulesListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalScroll: {
    padding: 20,
  },
  selectedDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  selectedDateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: '#F0F3FF',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
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
    fontSize: 20,
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
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
  },
  timeInputWrapper: {
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    width: 80,
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  periodButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#FFFFFF',
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
  recentTxCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  recentTxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recentTxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  recentTxHash: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#047857',
    marginBottom: 4,
  },
  recentTxLink: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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
  paymentInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  scheduleDetails: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
  },
  zeroBalance: {
    color: '#EF4444',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonPrimary: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

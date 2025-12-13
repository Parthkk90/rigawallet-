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
import { crescaPaymentsService } from '../services/contractServices';
import { web3Service } from '../services/web3Service';

interface Payment {
  hash: string;
  to: string;
  amount: string;
  memo: string;
  timestamp: number;
}

export default function PaymentsScreen() {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [isLoading, setIsLoading] = useState(true);
  const [sentPayments, setSentPayments] = useState<Payment[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  
  // Send form
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      const walletData = await web3Service.initializeWallet();
      setWalletAddress(walletData.address);
      
      const walletBalance = await web3Service.getBalance();
      setBalance(parseFloat(walletBalance).toFixed(3));
      
      await loadPayments();
    } catch (error) {
      console.error('Error initializing wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const [sent, received] = await Promise.all([
        crescaPaymentsService.getSentPayments(walletAddress).catch(() => []),
        crescaPaymentsService.getReceivedPayments(walletAddress).catch(() => []),
      ]);
      
      setSentPayments(sent);
      setReceivedPayments(received);
    } catch (error) {
      console.warn('Could not load payment history:', error);
    }
  };

  const handleSendPayment = async () => {
    if (!recipientAddress || !amount || !memo) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsSending(true);
      
      const txHash = await crescaPaymentsService.sendPayment(recipientAddress, amount, memo);
      
      const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;
      
      Alert.alert(
        '✓ Payment Sent',
        'Your payment has been sent successfully.',
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      
      // Reset form
      setRecipientAddress('');
      setAmount('');
      setMemo('');
      
      // Refresh data
      const newBalance = await web3Service.getBalance();
      setBalance(parseFloat(newBalance).toFixed(3));
      await loadPayments();
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send payment');
    } finally {
      setIsSending(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>{balance} MON</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.tabActive]}
          onPress={() => setActiveTab('send')}
        >
          <Text style={[styles.tabText, activeTab === 'send' && styles.tabTextActive]}>
            Send
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'send' ? (
          <View style={styles.sendContainer}>
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
              <Text style={styles.inputLabel}>Amount</Text>
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

            {/* Memo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Memo (Note)</Text>
              <TextInput
                style={[styles.input, styles.memoInput]}
                value={memo}
                onChangeText={setMemo}
                placeholder="What's this payment for?"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
              onPress={handleSendPayment}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Send Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {/* Sent Payments */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Sent Payments</Text>
              {sentPayments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="arrow-up-circle-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No sent payments yet</Text>
                </View>
              ) : (
                sentPayments.map((payment, index) => (
                  <TouchableOpacity
                    key={payment.hash + index}
                    style={styles.paymentItem}
                    onPress={() => Linking.openURL(`https://explorer.testnet.monad.xyz/tx/${payment.hash}`)}
                  >
                    <View style={styles.paymentIconContainer}>
                      <Ionicons name="arrow-up" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentMemo}>{payment.memo || 'Payment'}</Text>
                      <Text style={styles.paymentAddress}>To: {formatAddress(payment.to)}</Text>
                      <Text style={styles.paymentDate}>{formatDate(payment.timestamp)}</Text>
                    </View>
                    <Text style={styles.paymentAmount}>-{payment.amount} MON</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Received Payments */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Received Payments</Text>
              {receivedPayments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="arrow-down-circle-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No received payments yet</Text>
                </View>
              ) : (
                receivedPayments.map((payment, index) => (
                  <TouchableOpacity
                    key={payment.hash + index}
                    style={styles.paymentItem}
                    onPress={() => Linking.openURL(`https://explorer.testnet.monad.xyz/tx/${payment.hash}`)}
                  >
                    <View style={styles.paymentIconContainer}>
                      <Ionicons name="arrow-down" size={20} color="#10B981" />
                    </View>
                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentMemo}>{payment.memo || 'Payment'}</Text>
                      <Text style={styles.paymentAddress}>From: {formatAddress(payment.to)}</Text>
                      <Text style={styles.paymentDate}>{formatDate(payment.timestamp)}</Text>
                    </View>
                    <Text style={[styles.paymentAmount, styles.paymentAmountReceived]}>
                      +{payment.amount} MON
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
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
  sendContainer: {
    padding: 20,
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
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
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
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyContainer: {
    padding: 20,
  },
  historySection: {
    marginBottom: 32,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentMemo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  paymentAmountReceived: {
    color: '#10B981',
  },
});

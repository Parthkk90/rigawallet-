import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { web3Service } from '../services/web3Service';

interface Transaction {
  hash: string;
  type: string;
  amount: string;
  to: string;
  timestamp: number;
  status: string;
}

export default function WalletScreen() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isWalletInitialized, setIsWalletInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      const walletData = await web3Service.initializeWallet();
      setWalletAddress(walletData.address);
      setIsWalletInitialized(true);
      
      await loadWalletData();
    } catch (error) {
      console.error('Error initializing wallet:', error);
      Alert.alert('Error', 'Failed to initialize wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletData = async () => {
    try {
      const [walletBalance, txHistory] = await Promise.all([
        web3Service.getBalance(),
        web3Service.getTransactionHistory(),
      ]);
      
      setBalance(parseFloat(walletBalance).toFixed(6));
      setTransactions(txHistory);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
    Alert.alert('✓', 'Address copied to clipboard');
  };

  const handleSend = async () => {
    if (!sendToAddress || !sendAmount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsSending(true);
      const txHash = await web3Service.sendETH(sendToAddress, sendAmount);
      
      setShowSendModal(false);
      setSendToAddress('');
      setSendAmount('');
      
      const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;
      
      Alert.alert(
        '✓ Transaction Sent',
        'Your transaction has been submitted to the network.',
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      
      await loadWalletData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send transaction');
    } finally {
      setIsSending(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Initializing Wallet...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.userName}>Riga Wallet</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => copyToClipboard(walletAddress)}>
              <Ionicons name="copy-outline" size={20} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total balance ▼</Text>
          <Text style={styles.balanceAmount}>${(parseFloat(balance) * 10).toFixed(2)}</Text>
          <View style={styles.cryptoBalance}>
            <Text style={styles.cryptoAmount}>{balance} MON</Text>
            <View style={styles.changeIndicator}>
              <Ionicons name="trending-up" size={12} color="#10B981" />
              <Text style={styles.changeText}>+1.44%</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowSendModal(true)}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowReceiveModal(true)}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="arrow-down" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Receive</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="swap-horizontal" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Swap</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionSection}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>Transaction History</Text>
            <TouchableOpacity onPress={loadWalletData}>
              <Ionicons name="reload" size={20} color="#8B92B0" />
            </TouchableOpacity>
          </View>

          <View style={styles.transactionFilters}>
            <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
              <Text style={[styles.filterText, styles.filterTextActive]}>Latest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton}>
              <Text style={styles.filterText}>Oldest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton}>
              <Text style={styles.filterText}>This Week</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx, index) => (
              <TouchableOpacity
                key={tx.hash + index}
                style={styles.transactionItem}
                onPress={() => {
                  const url = `https://explorer.testnet.monad.xyz/tx/${tx.hash}`;
                  Linking.openURL(url);
                }}
              >
                <View style={styles.txIconContainer}>
                  <Ionicons
                    name={tx.type === 'sent' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color={tx.type === 'sent' ? '#EF4444' : '#10B981'}
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txType}>
                    {tx.type === 'sent' ? 'Sent' : 'Received'} MON
                  </Text>
                  <Text style={styles.txTime}>{formatTime(tx.timestamp)}</Text>
                  <Text style={styles.txAddress}>{formatAddress(tx.to)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, tx.type === 'sent' && styles.txAmountSent]}>
                    {tx.type === 'sent' ? '-' : '+'}{tx.amount} MON
                  </Text>
                  {tx.status === 'confirmed' ? (
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  ) : (
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Send Modal */}
      <Modal
        visible={showSendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send MON</Text>
              <TouchableOpacity onPress={() => setShowSendModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Recipient Address</Text>
              <TextInput
                style={styles.input}
                value={sendToAddress}
                onChangeText={setSendToAddress}
                placeholder="0x..."
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Amount (MON)</Text>
              <TextInput
                style={styles.input}
                value={sendAmount}
                onChangeText={setSendAmount}
                placeholder="0.0"
                placeholderTextColor="#6B7280"
                keyboardType="decimal-pad"
              />

              <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoText}>Available: {balance} MON</Text>
              </View>

              <TouchableOpacity
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receive Modal */}
      <Modal
        visible={showReceiveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receive</Text>
              <TouchableOpacity onPress={() => setShowReceiveModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.qrPlaceholder}>
                <View style={styles.qrCode}>
                  <Ionicons name="qr-code" size={120} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.receiveDescription}>
                You can use this address to receive MON on Monad Testnet
              </Text>

              <View style={styles.addressContainer}>
                <Text style={styles.addressText}>{walletAddress}</Text>
              </View>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(walletAddress)}
              >
                <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                <Text style={styles.copyButtonText}>Copy Address</Text>
              </TouchableOpacity>
            </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  cryptoBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cryptoAmount: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  transactionSection: {
    paddingHorizontal: 20,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  transactionFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterActive: {
    backgroundColor: '#1F2937',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  txTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  txAddress: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  txAmountSent: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  balanceInfo: {
    marginTop: 12,
    marginBottom: 24,
  },
  balanceInfoText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sendButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qrPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: '#374151',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiveDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  addressContainer: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { web3Service } from '../services/web3Service';
import { priceService } from '../services/priceService';

interface Token {
  symbol: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  balance?: string;
}

const AVAILABLE_TOKENS: Token[] = [
  { symbol: 'MON', name: 'Monad', icon: 'logo-electron', color: '#6C5CE7' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'logo-ethereum', color: '#627EEA' },
  { symbol: 'BTC', name: 'Bitcoin', icon: 'logo-bitcoin', color: '#F7931A' },
  { symbol: 'SOL', name: 'Solana', icon: 'sunny', color: '#14F195' },
  { symbol: 'USDC', name: 'USD Coin', icon: 'cash', color: '#2775CA' },
  { symbol: 'USDT', name: 'Tether', icon: 'cash-outline', color: '#26A17B' },
];

export default function SwapScreen() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [isLoading, setIsLoading] = useState(true);
  const [fromToken, setFromToken] = useState<Token>(AVAILABLE_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(AVAILABLE_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    initializeWallet();
    loadExchangeRate();
  }, [fromToken, toToken]);

  useEffect(() => {
    if (fromAmount && exchangeRate) {
      const calculatedAmount = (parseFloat(fromAmount) * exchangeRate).toFixed(6);
      setToAmount(calculatedAmount);
    } else {
      setToAmount('');
    }
  }, [fromAmount, exchangeRate]);

  const initializeWallet = async () => {
    try {
      const walletData = await web3Service.initializeWallet();
      setWalletAddress(walletData.address);
      
      const walletBalance = await web3Service.getBalance();
      setBalance(parseFloat(walletBalance).toFixed(3));
    } catch (error) {
      console.error('Error initializing wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      // Get prices for both tokens
      const prices = await priceService.getBundlePrices();
      
      let fromPrice = 1;
      let toPrice = 1;

      // Map token symbols to prices
      if (fromToken.symbol === 'BTC') fromPrice = prices.btc.price;
      else if (fromToken.symbol === 'ETH') fromPrice = prices.eth.price;
      else if (fromToken.symbol === 'SOL') fromPrice = prices.sol.price;
      else if (fromToken.symbol === 'MON') fromPrice = 10; // Mock price for MON
      else if (fromToken.symbol === 'USDC' || fromToken.symbol === 'USDT') fromPrice = 1;

      if (toToken.symbol === 'BTC') toPrice = prices.btc.price;
      else if (toToken.symbol === 'ETH') toPrice = prices.eth.price;
      else if (toToken.symbol === 'SOL') toPrice = prices.sol.price;
      else if (toToken.symbol === 'MON') toPrice = 10; // Mock price for MON
      else if (toToken.symbol === 'USDC' || toToken.symbol === 'USDT') toPrice = 1;

      const rate = fromPrice / toPrice;
      setExchangeRate(rate);
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      setExchangeRate(1);
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setToAmount('');
  };

  const handleSelectFromToken = (token: Token) => {
    if (token.symbol === toToken.symbol) {
      // Auto-swap if selecting the same token
      setFromToken(token);
      setToToken(fromToken);
    } else {
      setFromToken(token);
    }
    setShowFromTokenModal(false);
    setFromAmount('');
    setToAmount('');
  };

  const handleSelectToToken = (token: Token) => {
    if (token.symbol === fromToken.symbol) {
      // Auto-swap if selecting the same token
      setToToken(token);
      setFromToken(toToken);
    } else {
      setToToken(token);
    }
    setShowToTokenModal(false);
    setFromAmount('');
    setToAmount('');
  };

  const handlePreviewSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (fromToken.symbol === 'MON' && parseFloat(fromAmount) > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert(
      'Swap Preview',
      `You are swapping ${fromAmount} ${fromToken.symbol} for approximately ${toAmount} ${toToken.symbol}\n\nExchange Rate: 1 ${fromToken.symbol} = ${exchangeRate?.toFixed(6)} ${toToken.symbol}\n\nNote: This is a demo swap on Monad Testnet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Execute Swap', onPress: handleExecuteSwap }
      ]
    );
  };

  const handleExecuteSwap = async () => {
    try {
      setIsSwapping(true);

      // Simulate swap transaction
      // In production, this would call a DEX router contract
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock transaction hash
      const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66);
      const explorerUrl = `https://monad-testnet.socialscan.io/tx/${mockTxHash}`;

      Alert.alert(
        '✓ Swap Successful',
        `Successfully swapped ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`,
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel', onPress: () => router.back() }
        ]
      );

      // Reset form
      setFromAmount('');
      setToAmount('');

      // Refresh balance
      const newBalance = await web3Service.getBalance();
      setBalance(parseFloat(newBalance).toFixed(3));

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const renderTokenModal = (isFromToken: boolean) => {
    const showModal = isFromToken ? showFromTokenModal : showToTokenModal;
    const setShowModal = isFromToken ? setShowFromTokenModal : setShowToTokenModal;
    const handleSelect = isFromToken ? handleSelectFromToken : handleSelectToToken;

    return (
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tokenModalContent}>
            <View style={styles.tokenModalHeader}>
              <Text style={styles.tokenModalTitle}>Select Token</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tokenList}>
              {AVAILABLE_TOKENS.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  style={styles.tokenItem}
                  onPress={() => handleSelect(token)}
                >
                  <View style={[styles.tokenIcon, { backgroundColor: token.color }]}>
                    <Ionicons name={token.icon} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.tokenInfo}>
                    <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                    <Text style={styles.tokenName}>{token.name}</Text>
                  </View>
                  {((isFromToken && token.symbol === fromToken.symbol) || 
                    (!isFromToken && token.symbol === toToken.symbol)) && (
                    <Ionicons name="checkmark-circle" size={24} color="#6C5CE7" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swap</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* From Token */}
        <View style={styles.swapCard}>
          <Text style={styles.cardLabel}>From</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={fromAmount}
              onChangeText={setFromAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            
            <TouchableOpacity 
              style={styles.tokenSelector}
              onPress={() => setShowFromTokenModal(true)}
            >
              <View style={[styles.tokenIconSmall, { backgroundColor: fromToken.color }]}>
                <Ionicons name={fromToken.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.tokenSelectorText}>
                <Text style={styles.tokenSelectorSymbol}>{fromToken.symbol}</Text>
                <Text style={styles.tokenSelectorName}>{fromToken.name}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {fromToken.symbol === 'MON' && (
            <Text style={styles.balanceText}>Balance: {balance} MON</Text>
          )}
        </View>

        {/* Swap Button */}
        <View style={styles.swapButtonContainer}>
          <TouchableOpacity 
            style={styles.swapIconButton}
            onPress={handleSwapTokens}
          >
            <Ionicons name="swap-vertical" size={24} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        {/* To Token */}
        <View style={styles.swapCard}>
          <Text style={styles.cardLabel}>To</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={toAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              editable={false}
            />
            
            <TouchableOpacity 
              style={styles.tokenSelector}
              onPress={() => setShowToTokenModal(true)}
            >
              <View style={[styles.tokenIconSmall, { backgroundColor: toToken.color }]}>
                <Ionicons name={toToken.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.tokenSelectorText}>
                <Text style={styles.tokenSelectorSymbol}>{toToken.symbol}</Text>
                <Text style={styles.tokenSelectorName}>{toToken.name}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Exchange Rate Info */}
        {exchangeRate && fromAmount && (
          <View style={styles.rateCard}>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Exchange Rate</Text>
              <Text style={styles.rateValue}>
                1 {fromToken.symbol} = {exchangeRate.toFixed(6)} {toToken.symbol}
              </Text>
            </View>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Estimated Output</Text>
              <Text style={styles.rateValue}>{toAmount} {toToken.symbol}</Text>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#6C5CE7" />
          <Text style={styles.infoText}>
            Swaps are executed on Monad Testnet. Exchange rates are fetched from live price feeds.
          </Text>
        </View>

        {/* Preview Button */}
        <TouchableOpacity
          style={[styles.previewButton, isSwapping && styles.previewButtonDisabled]}
          onPress={handlePreviewSwap}
          disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
        >
          {isSwapping ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.previewButtonText}>Preview Swap Info</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {renderTokenModal(true)}
      {renderTokenModal(false)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  swapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    padding: 0,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tokenIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenSelectorText: {
    marginRight: 4,
  },
  tokenSelectorSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  tokenSelectorName: {
    fontSize: 11,
    color: '#6B7280',
  },
  balanceText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  swapButtonContainer: {
    alignItems: 'center',
    marginVertical: -16,
    zIndex: 10,
  },
  swapIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  rateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  previewButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  previewButtonDisabled: {
    opacity: 0.5,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tokenModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  tokenModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tokenModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  tokenList: {
    padding: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tokenName: {
    fontSize: 13,
    color: '#6B7280',
  },
});

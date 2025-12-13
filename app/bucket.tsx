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
import { crescaBucketProtocolService } from '../services/contractServices';
import { web3Service } from '../services/web3Service';

export default function BundlesScreen() {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0.000');
  const [isLoading, setIsLoading] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [positionType, setPositionType] = useState<'long' | 'short'>('long');

  useEffect(() => {
    initializeWallet();
  }, []);

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

  const handleExecuteTrade = async () => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid investment amount');
      return;
    }

    if (parseFloat(investmentAmount) > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsLoading(true);
      
      // This will: init → Create Bucket → Deposit → Open Position
      const txHash = await crescaBucketProtocolService.openPosition(
        1, // bucketId (would be dynamic in production)
        positionType === 'long',
        investmentAmount
      );
      
      const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;
      
      Alert.alert(
        '✓ Trade Executed',
        'Your position has been opened successfully.',
        [
          { text: 'View on Monadscan', onPress: () => Linking.openURL(explorerUrl) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      
      // Reset form
      setInvestmentAmount('');
      setLeverage(1);
      
      // Refresh balance
      const newBalance = await web3Service.getBalance();
      setBalance(parseFloat(newBalance).toFixed(3));
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to execute trade');
    } finally {
      setIsLoading(false);
    }
  };

  const renderLeverageSlider = () => {
    const leverageMarks = [1, 20, 40, 60, 80, 100, 120, 140, 150];
    const sliderPosition = ((leverage - 1) / 149) * 100;

    return (
      <View style={styles.leverageContainer}>
        <Text style={styles.sectionLabel}>Leverage: {leverage}x</Text>
        
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${sliderPosition}%` }]} />
            <TouchableOpacity
              style={[styles.sliderThumb, { left: `${sliderPosition}%` }]}
              onPress={() => {}} // Would handle drag in production
            />
          </View>
          
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1x</Text>
            <Text style={styles.sliderLabel}>150x</Text>
          </View>
        </View>

        <View style={styles.leverageButtons}>
          {leverageMarks.map((lev) => (
            <TouchableOpacity
              key={lev}
              style={[
                styles.leverageButton,
                leverage === lev && styles.leverageButtonActive
              ]}
              onPress={() => setLeverage(lev)}
            >
              <Text style={[
                styles.leverageButtonText,
                leverage === lev && styles.leverageButtonTextActive
              ]}>{lev}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  const totalExposure = parseFloat(investmentAmount || '0') * leverage;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Bundle Trading</Text>
            <Text style={styles.headerSubtitle}>The Standard Bundle</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Bundle Info Card */}
        <View style={styles.bundleCard}>
          <View style={styles.bundleHeader}>
            <Ionicons name="trending-up" size={20} color="#6C5CE7" />
            <Text style={styles.bundleTitle}>The Standard Bundle</Text>
          </View>
          <Text style={styles.bundleComposition}>BTC 50% • ETH 30% • SOL 20%</Text>
          <View style={styles.riskBadge}>
            <Text style={styles.riskText}>Medium Risk</Text>
          </View>
        </View>

        {/* Investment Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Investment Amount</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={investmentAmount}
              onChangeText={setInvestmentAmount}
              placeholder="0.0"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputCurrency}>MON</Text>
          </View>
          <Text style={styles.hint}>Minimum: 0.1 MON</Text>
        </View>

        {/* Leverage Slider */}
        {renderLeverageSlider()}

        {/* Position Direction */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Position Direction</Text>
          <View style={styles.positionButtons}>
            <TouchableOpacity
              style={[
                styles.positionButton,
                styles.longButton,
                positionType === 'long' && styles.positionButtonActive
              ]}
              onPress={() => setPositionType('long')}
            >
              <Ionicons name="trending-up" size={20} color="#FFFFFF" />
              <Text style={styles.positionButtonText}>LONG</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.positionButton,
                styles.shortButton,
                positionType === 'short' && styles.positionButtonActive
              ]}
              onPress={() => setPositionType('short')}
            >
              <Ionicons name="trending-down" size={20} color="#EF4444" />
              <Text style={[styles.positionButtonText, styles.shortButtonText]}>SHORT</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Profit when bundle price {positionType === 'long' ? 'increases' : 'decreases'}
          </Text>
        </View>

        {/* Transaction Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Transaction Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Investment</Text>
            <Text style={styles.summaryValue}>{investmentAmount || '0'} MON</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Leverage</Text>
            <Text style={styles.summaryValue}>{leverage}x</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Position</Text>
            <Text style={[
              styles.summaryValue,
              positionType === 'long' ? styles.longText : styles.shortText
            ]}>
              {positionType.toUpperCase()}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total Exposure</Text>
            <Text style={styles.summaryTotalValue}>{totalExposure.toFixed(2)} MON</Text>
          </View>
        </View>

        {/* Risk Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Leveraged trading involves significant risk. You may lose more than your initial investment.
          </Text>
        </View>

        {/* Execute Button */}
        <TouchableOpacity
          style={styles.executeButton}
          onPress={handleExecuteTrade}
          disabled={isLoading || !investmentAmount}
        >
          <Ionicons name="flash" size={20} color="#FFFFFF" />
          <Text style={styles.executeButtonText}>Execute Trade</Text>
        </TouchableOpacity>

        <Text style={styles.processSteps}>
          This will execute: Init → Create Bucket → Deposit → Open Position
        </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  bundleCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bundleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  bundleComposition: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 16,
  },
  inputCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  leverageContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sliderContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    marginLeft: -10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  leverageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  leverageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  leverageButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  leverageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  leverageButtonTextActive: {
    color: '#FFFFFF',
  },
  positionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  positionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  longButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  shortButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EF4444',
  },
  positionButtonActive: {
    opacity: 1,
  },
  positionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shortButtonText: {
    color: '#EF4444',
  },
  longText: {
    color: '#10B981',
  },
  shortText: {
    color: '#EF4444',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
  },
  executeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  processSteps: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
  },
});

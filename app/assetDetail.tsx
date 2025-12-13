import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

export default function AssetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1Y');

  const name = params.name as string;
  const symbol = params.symbol as string;
  const price = parseFloat(params.price as string);
  const change24h = parseFloat(params.change24h as string);
  const icon = params.icon as string;
  const color = params.color as string;

  // Mock chart data - would come from API in production
  const generateChartData = () => {
    const dataPoints = timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : 12;
    const data = [];
    let baseValue = price * 0.7;
    
    for (let i = 0; i < dataPoints; i++) {
      baseValue += (Math.random() - 0.45) * (price * 0.05);
      data.push(baseValue);
    }
    
    // Ensure last value is close to current price
    data[data.length - 1] = price;
    
    return data;
  };

  const chartData = generateChartData();
  const screenWidth = Dimensions.get('window').width;

  // Calculate annual return (mock)
  const annualReturn = ((price - chartData[0]) / chartData[0]) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>Crypto Portfolio</Text>
        </View>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Annual Return Card */}
        <View style={styles.returnCard}>
          <Text style={styles.returnLabel}>Annual Return</Text>
          <View style={styles.returnRow}>
            <Text style={styles.returnValue}>
              {annualReturn > 0 ? '+' : ''}{annualReturn.toFixed(1)}%
            </Text>
            <View style={[styles.returnBadge, annualReturn >= 0 ? styles.returnBadgePositive : styles.returnBadgeNegative]}>
              <Ionicons 
                name={annualReturn >= 0 ? 'trending-up' : 'trending-down'} 
                size={14} 
                color={annualReturn >= 0 ? '#10B981' : '#EF4444'} 
              />
              <Text style={[styles.returnBadgeText, annualReturn >= 0 ? styles.returnBadgeTextPositive : styles.returnBadgeTextNegative]}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData.map((value, index) => ({ value, label: '' }))}
            width={screenWidth - 60}
            height={220}
            color={color}
            thickness={3}
            startFillColor={color}
            endFillColor={'#FFFFFF'}
            startOpacity={0.3}
            endOpacity={0.01}
            spacing={screenWidth / chartData.length - 10}
            initialSpacing={10}
            noOfSections={5}
            yAxisColor="#F3F4F6"
            xAxisColor="#F3F4F6"
            yAxisTextStyle={{ color: '#9CA3AF', fontSize: 10 }}
            hideDataPoints={true}
            curved
            areaChart
            hideRules
            hideYAxisText={false}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisLabelWidth={40}
            isAnimated
            animationDuration={1000}
            pointerConfig={{
              pointerStripHeight: 200,
              pointerStripColor: color,
              pointerStripWidth: 2,
              pointerColor: color,
              radius: 6,
              pointerLabelWidth: 100,
              pointerLabelHeight: 90,
              activatePointersOnLongPress: false,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: any) => {
                return (
                  <View style={{
                    height: 90,
                    width: 100,
                    justifyContent: 'center',
                    marginTop: -30,
                    marginLeft: -40,
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      marginBottom: 6,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: color,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}>
                      ${items[0].value.toFixed(2)}
                    </Text>
                  </View>
                );
              },
            }}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{symbol}</Text>
              <Text style={styles.legendPercent}>100%</Text>
            </View>
          </View>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.timeframeButton, timeframe === tf && styles.timeframeButtonActive]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.timeframeText, timeframe === tf && styles.timeframeTextActive]}>
                {tf}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Holdings Section */}
        <View style={styles.holdingsSection}>
          <Text style={styles.holdingsTitle}>Holdings</Text>
          
          <View style={styles.holdingCard}>
            <View style={styles.holdingLeft}>
              <View style={[styles.holdingIcon, { backgroundColor: color }]}>
                <Text style={styles.holdingIconText}>{icon}</Text>
              </View>
              <View>
                <Text style={styles.holdingName}>{symbol}</Text>
                <Text style={styles.holdingAllocation}>100% allocation</Text>
              </View>
            </View>
            
            <View style={styles.holdingRight}>
              <Text style={styles.holdingPrice}>${price.toLocaleString()}</Text>
              <View style={[styles.holdingChangeBadge, change24h >= 0 ? styles.changeBadgePositive : styles.changeBadgeNegative]}>
                <Text style={[styles.holdingChangeText, change24h >= 0 ? styles.changeTextPositive : styles.changeTextNegative]}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Asset Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About {name}</Text>
          <Text style={styles.infoDescription}>
            {name} ({symbol}) is a cryptocurrency asset trading on the Monad testnet. 
            Track its performance and market movements in real-time with live price updates and historical charts.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  returnCard: {
    padding: 20,
  },
  returnLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  returnValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#10B981',
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  returnBadgePositive: {
    backgroundColor: '#D1FAE5',
  },
  returnBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  returnBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  returnBadgeTextPositive: {
    color: '#10B981',
  },
  returnBadgeTextNegative: {
    color: '#EF4444',
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  legendPercent: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  timeframeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  timeframeButtonActive: {
    backgroundColor: '#EBF5FF',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  timeframeTextActive: {
    color: '#6C5CE7',
  },
  holdingsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  holdingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  holdingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingIconText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  holdingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  holdingAllocation: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  holdingChangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  holdingChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeBadgePositive: {
    backgroundColor: '#D1FAE5',
  },
  changeBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  changeTextPositive: {
    color: '#10B981',
  },
  changeTextNegative: {
    color: '#EF4444',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

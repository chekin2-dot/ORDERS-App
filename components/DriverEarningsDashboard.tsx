import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Wallet, Calendar } from 'lucide-react-native';

interface DriverEarningsDashboardProps {
  driverId: string;
}

interface EarningsData {
  totalAmount: number;
  driverShare: number;
  appCommission: number;
  paidAmount: number;
  remainingBalance: number;
  deliveryCount: number;
  expressCount: number;
}

export function DriverEarningsDashboard({ driverId }: DriverEarningsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [earnings, setEarnings] = useState<EarningsData>({
    totalAmount: 0,
    driverShare: 0,
    appCommission: 0,
    paidAmount: 0,
    remainingBalance: 0,
    deliveryCount: 0,
    expressCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    loadEarnings();
  }, [driverId, selectedPeriod]);

  const getDateRange = () => {
    const end = new Date();
    let start = new Date();

    switch (selectedPeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all':
        start = new Date('2020-01-01');
        break;
    }

    return { start, end };
  };

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      setStartDate(start);
      setEndDate(end);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('delivery_fee, is_express, status, created_at')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'preparing', 'ready', 'in_delivery', 'delivered'])
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      let totalAmount = 0;
      let deliveryCount = 0;
      let expressCount = 0;

      orders?.forEach(order => {
        const fee = order.delivery_fee || (order.is_express ? 1500 : 1000);
        totalAmount += fee;
        deliveryCount++;
        if (order.is_express) {
          expressCount++;
        }
      });

      const driverShare = totalAmount * 0.9;
      const appCommission = totalAmount * 0.1;

      const { data: driver } = await supabase
        .from('drivers')
        .select('balance')
        .eq('id', driverId)
        .single();

      const currentBalance = driver?.balance || 0;

      const { data: earningsData } = await supabase
        .from('driver_earnings')
        .select('amount, status')
        .eq('driver_id', driverId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      let paidInPeriod = 0;
      earningsData?.forEach(earning => {
        if (earning.status === 'credited' || earning.status === 'withdrawn') {
          paidInPeriod += earning.amount;
        }
      });

      setEarnings({
        totalAmount,
        driverShare,
        appCommission,
        paidAmount: paidInPeriod,
        remainingBalance: currentBalance,
        deliveryCount,
        expressCount,
      });
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Wallet size={24} color="#1a1a1a" />
          <Text style={styles.title}>Mes Gains</Text>
        </View>
      </View>

      <View style={styles.periodSelectorContainer}>
        <TouchableOpacity
          style={[styles.periodButtonFull, selectedPeriod === 'all' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('all')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'all' && styles.periodButtonTextActive]}>
            Total
          </Text>
        </TouchableOpacity>

        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'today' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'today' && styles.periodButtonTextActive]}>
              Aujourd'hui
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
              7 jours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
              30 jours
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {startDate && (
        <View style={styles.dateRangeCard}>
          <Calendar size={16} color="#666" />
          <Text style={styles.dateRangeText}>
            Du {formatDate(startDate)} au {formatDate(endDate)}
          </Text>
        </View>
      )}

      <View style={styles.mainCard}>
        <Text style={styles.mainCardLabel}>Montant Total des Courses</Text>
        <View style={styles.mainAmountContainer}>
          <Text style={styles.mainAmount}>{formatCurrency(earnings.totalAmount)}</Text>
          <Text style={styles.mainCurrency}>F CFA</Text>
        </View>
        <Text style={styles.deliveryCount}>
          {earnings.deliveryCount} course{earnings.deliveryCount > 1 ? 's' : ''}
          {earnings.expressCount > 0 && ` (${earnings.expressCount} express)`}
        </Text>
      </View>

      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <DollarSign size={20} color="#5cb85c" />
            <Text style={styles.breakdownTitle}>Votre Part (90%)</Text>
          </View>
          <View style={styles.breakdownAmountContainer}>
            <Text style={styles.breakdownAmount}>{formatCurrency(earnings.driverShare)}</Text>
            <Text style={styles.breakdownCurrency}>F CFA</Text>
          </View>
          <Text style={styles.breakdownNote}>Montant que vous recevez</Text>
        </View>

        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <TrendingUp size={20} color="#2563eb" />
            <Text style={styles.breakdownTitle}>Commission App (10%)</Text>
          </View>
          <View style={styles.breakdownAmountContainer}>
            <Text style={styles.breakdownAmount}>{formatCurrency(earnings.appCommission)}</Text>
            <Text style={styles.breakdownCurrency}>F CFA</Text>
          </View>
          <Text style={styles.breakdownNote}>Frais de service</Text>
        </View>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Paiements</Text>

        <View style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Montant Payé</Text>
            <View style={styles.paymentAmountContainer}>
              <Text style={styles.paymentAmount}>{formatCurrency(earnings.paidAmount)}</Text>
              <Text style={styles.paymentCurrency}>F CFA</Text>
            </View>
          </View>
          <Text style={styles.paymentNote}>Versé via Orange Money</Text>
        </View>

        <View style={[styles.paymentCard, styles.balanceCard]}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Solde Disponible</Text>
            <View style={styles.paymentAmountContainer}>
              <Text style={[styles.paymentAmount, styles.balanceAmount]}>{formatCurrency(earnings.remainingBalance)}</Text>
              <Text style={styles.paymentCurrency}>F CFA</Text>
            </View>
          </View>
          <Text style={styles.balanceNote}>Payé à J+1 via Orange Money</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Système de Paiement</Text>
        <Text style={styles.infoText}>
          • Vous recevez 90% du montant de chaque course{'\n'}
          • 10% sont retenus pour les frais de l'application{'\n'}
          • Les paiements sont effectués à J+1 via Orange Money{'\n'}
          • Course standard: 1 000 F CFA{'\n'}
          • Course express: 1 500 F CFA
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  periodSelectorContainer: {
    marginBottom: 16,
  },
  periodButtonFull: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateRangeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  mainCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  mainCardLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  mainAmountContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mainAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  mainCurrency: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  deliveryCount: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  breakdownContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  breakdownAmountContainer: {
    marginBottom: 8,
  },
  breakdownAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  breakdownCurrency: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  breakdownNote: {
    fontSize: 11,
    color: '#999',
  },
  paymentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  paymentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  balanceCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  balanceAmount: {
    color: '#16a34a',
  },
  paymentCurrency: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  paymentNote: {
    fontSize: 12,
    color: '#666',
  },
  balanceNote: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
  },
});

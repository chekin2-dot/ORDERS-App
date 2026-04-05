import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, TextInput, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, Truck, DollarSign, Phone, CreditCard, CircleCheck as CheckCircle, X, Search, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/Toast';
import PaymentBulletin, { BulletinData } from '@/components/PaymentBulletin';

type PartnerType = 'merchants' | 'drivers';

interface Merchant {
  id: string;
  user_id: string;
  shop_name: string;
  orange_money_number: string | null;
  orange_money_name: string | null;
  user_profiles: {
    first_name: string;
    last_name: string;
    phone: string;
    profile_photo_url: string | null;
  };
  pending_amount: number;
}

interface Driver {
  id: string;
  user_id: string;
  balance: number;
  orange_money_number: string | null;
  orange_money_name: string | null;
  user_profiles: {
    first_name: string;
    last_name: string;
    phone: string;
    profile_photo_url: string | null;
  };
}

export default function PartnerPaymentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PartnerType>('merchants');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Merchant | Driver | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPayoutDates, setPendingPayoutDates] = useState<string[]>([]);
  const [showBulletin, setShowBulletin] = useState(false);
  const [currentBulletin, setCurrentBulletin] = useState<BulletinData | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    loadPartners();
  }, [activeTab]);

  useEffect(() => {
    const merchantsSub = supabase
      .channel('admin_merchants_om')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'merchants',
        filter: 'verification_status=eq.verified',
      }, () => {
        if (activeTab === 'merchants') loadPartners();
      })
      .subscribe();

    const driversSub = supabase
      .channel('admin_drivers_om')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: 'verification_status=eq.verified',
      }, () => {
        if (activeTab === 'drivers') loadPartners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(merchantsSub);
      supabase.removeChannel(driversSub);
    };
  }, [activeTab]);

  const loadPartners = async () => {
    try {
      setLoading(true);

      if (activeTab === 'merchants') {
        const { data: merchantsData, error } = await supabase
          .from('merchants')
          .select(`
            id,
            user_id,
            shop_name,
            orange_money_number,
            orange_money_name,
            user_profiles(first_name, last_name, phone, profile_photo_url)
          `)
          .eq('verification_status', 'verified')
          .order('shop_name');

        if (error) throw error;

        const merchantsWithBalances = await Promise.all(
          (merchantsData || []).map(async (merchant) => {
            const { data: payoutsData } = await supabase
              .from('merchant_daily_payouts')
              .select('merchant_amount')
              .eq('merchant_id', merchant.id)
              .eq('payment_status', 'pending');

            const pending_amount = payoutsData?.reduce((sum, p) => sum + Number(p.merchant_amount), 0) || 0;

            return {
              ...merchant,
              pending_amount,
            };
          })
        );

        setMerchants(merchantsWithBalances as any as Merchant[]);
      } else {
        const { data: driversData, error } = await supabase
          .from('drivers')
          .select(`
            id,
            user_id,
            balance,
            orange_money_number,
            orange_money_name,
            user_profiles(first_name, last_name, phone, profile_photo_url)
          `)
          .eq('verification_status', 'verified')
          .order('user_profiles(first_name)');

        if (error) throw error;
        setDrivers((driversData || []) as any as Driver[]);
      }
    } catch (error) {
      console.error('Error loading partners:', error);
      showToast('Erreur lors du chargement des partenaires', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSelectPartner = async (partner: Merchant | Driver) => {
    setSelectedPartner(partner);
    const amount = 'pending_amount' in partner ? partner.pending_amount : partner.balance;
    setPaymentAmount(amount.toFixed(0));
    setPendingPayoutDates([]);

    if ('pending_amount' in partner) {
      const { data } = await supabase
        .from('merchant_daily_payouts')
        .select('payment_date')
        .eq('merchant_id', partner.id)
        .eq('payment_status', 'pending')
        .order('payment_date', { ascending: true });

      if (data) {
        setPendingPayoutDates(data.map((d) => d.payment_date));
      }
    } else {
      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('created_at')
        .eq('driver_id', partner.id)
        .in('earning_type', ['delivery_fee', 'express_bonus', 'tip'])
        .eq('status', 'credited')
        .order('created_at', { ascending: true });

      if (earnings && earnings.length > 0) {
        const uniqueDates = [...new Set(
          earnings.map((e) => e.created_at.split('T')[0])
        )];

        const { data: lastBulletin } = await supabase
          .from('payment_bulletins')
          .select('paid_at')
          .eq('partner_id', partner.id)
          .eq('recipient_type', 'driver')
          .order('paid_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastPayoutDate = lastBulletin?.paid_at
          ? lastBulletin.paid_at.split('T')[0]
          : null;

        const pendingDates = lastPayoutDate
          ? uniqueDates.filter((d) => d > lastPayoutDate)
          : uniqueDates;

        setPendingPayoutDates(pendingDates);
      }
    }

    setShowPaymentModal(true);
  };

  const formatPayoutDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handlePayment = () => {
    if (!selectedPartner || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Montant invalide', 'error');
      return;
    }

    if (!selectedPartner.orange_money_number) {
      showToast('Numéro Orange Money non configuré', 'error');
      return;
    }

    const cleanNumber = selectedPartner.orange_money_number.replace(/\D/g, '');
    const ussdCode = `*144*2*1*${cleanNumber}*${amount.toFixed(0)}#`;

    Linking.openURL(`tel:${encodeURIComponent(ussdCode)}`).catch(() => {});

    setConfirmingPayment(true);
  };

  const markPaymentAsCompleted = async (amount: number) => {
    if (!selectedPartner) return;

    try {
      setProcessingPayment(true);

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      const paidAt = new Date().toISOString();
      const partner = selectedPartner;
      const partnerProfile = partner.user_profiles as any;
      const recipientName = 'shop_name' in partner
        ? partner.shop_name
        : `${partnerProfile.first_name} ${partnerProfile.last_name}`;

      if (activeTab === 'merchants') {
        const { error } = await supabase
          .from('merchant_daily_payouts')
          .update({
            payment_status: 'paid',
            paid_at: paidAt,
          })
          .eq('merchant_id', partner.id)
          .eq('payment_status', 'pending');

        if (error) throw error;
      } else {
        const { error: balanceError } = await supabase
          .from('drivers')
          .update({ balance: 0 })
          .eq('id', partner.id);

        if (balanceError) throw balanceError;
      }

      const periodLabel = pendingPayoutDates.length === 1
        ? pendingPayoutDates[0]
        : `${pendingPayoutDates[0]} — ${pendingPayoutDates[pendingPayoutDates.length - 1]}`;

      const { data: bulletinRecord, error: bulletinError } = await supabase
        .from('payment_bulletins')
        .insert({
          recipient_id: partner.user_id,
          recipient_type: activeTab === 'merchants' ? 'merchant' : 'driver',
          partner_id: partner.id,
          amount,
          payment_method: 'orange_money',
          orange_money_number: partner.orange_money_number,
          period_dates: pendingPayoutDates,
          period_label: periodLabel,
          admin_id: adminUser?.id ?? null,
          paid_at: paidAt,
        })
        .select('id')
        .single();

      if (bulletinError) {
        console.error('Bulletin save error:', bulletinError);
      }

      const notifTitle = 'Paiement reçu';
      const datesText = pendingPayoutDates.map((d) => {
        const date = new Date(d + 'T12:00:00');
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      }).join(', ');
      const notifMessage = `Votre paiement de ${amount.toLocaleString('fr-FR')} FCFA a été effectué pour : ${datesText}. Votre bulletin de paiement est disponible.`;

      const { data: notif } = await supabase
        .from('system_notifications')
        .insert({
          title: notifTitle,
          message: notifMessage,
          target_user_type: activeTab === 'merchants' ? 'merchant' : 'driver',
          is_active: true,
        })
        .select('id')
        .single();

      if (notif) {
        await supabase.from('user_notifications').insert({
          user_id: partner.user_id,
          notification_id: notif.id,
          is_read: false,
        });
      }

      const bulletinData: BulletinData = {
        id: bulletinRecord?.id ?? 'temp',
        recipient_type: activeTab === 'merchants' ? 'merchant' : 'driver',
        amount,
        payment_method: 'orange_money',
        orange_money_number: partner.orange_money_number,
        period_dates: pendingPayoutDates,
        period_label: periodLabel,
        paid_at: paidAt,
        recipient_name: recipientName,
        recipient_phone: partnerProfile.phone,
        shop_name: 'shop_name' in partner ? partner.shop_name : undefined,
      };

      setShowPaymentModal(false);
      setSelectedPartner(null);
      setPaymentAmount('');
      setConfirmingPayment(false);
      loadPartners();

      setCurrentBulletin(bulletinData);
      setShowBulletin(true);
    } catch (error) {
      console.error('Error marking payment:', error);
      showToast('Erreur lors de l\'enregistrement du paiement', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPartnerName = (partner: Merchant | Driver) => {
    if ('shop_name' in partner) {
      return partner.shop_name;
    }
    const profile = partner.user_profiles as any;
    return `${profile.first_name} ${profile.last_name}`;
  };

  const getPartnerBalance = (partner: Merchant | Driver) => {
    return 'pending_amount' in partner ? partner.pending_amount : partner.balance;
  };

  const filterPartners = (partners: Merchant[] | Driver[]) => {
    if (!searchQuery.trim()) return partners;

    const query = searchQuery.toLowerCase();
    return partners.filter((partner) => {
      const name = getPartnerName(partner).toLowerCase();
      const profile = partner.user_profiles as any;
      const phone = profile.phone?.toLowerCase() || '';
      const omNumber = partner.orange_money_number?.toLowerCase() || '';

      return name.includes(query) || phone.includes(query) || omNumber.includes(query);
    });
  };

  const renderPartnerCard = (partner: Merchant | Driver) => {
    const name = getPartnerName(partner);
    const balance = getPartnerBalance(partner);
    const profile = partner.user_profiles as any;
    const hasOMNumber = partner.orange_money_number;

    return (
      <TouchableOpacity
        key={partner.id}
        style={styles.partnerCard}
        onPress={() => handleSelectPartner(partner)}
        disabled={balance <= 0}
      >
        <View style={styles.partnerCardHeader}>
          <View style={styles.partnerAvatar}>
            {profile.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.partnerAvatarImage} />
            ) : (
              <Text style={styles.partnerAvatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.partnerInfo}>
            <Text style={styles.partnerName}>{name}</Text>
            <View style={styles.partnerContactRow}>
              <Phone size={14} color="#64748b" />
              <Text style={styles.partnerPhone}>{profile.phone}</Text>
            </View>
            {hasOMNumber ? (
              <View style={styles.omInfoContainer}>
                <View style={styles.partnerContactRow}>
                  <CreditCard size={14} color="#f97316" />
                  <Text style={styles.omNumber}>{partner.orange_money_number}</Text>
                </View>
                {partner.orange_money_name && (
                  <Text style={styles.omName}>{partner.orange_money_name}</Text>
                )}
              </View>
            ) : (
              <View style={styles.omMissingRow}>
                <CreditCard size={13} color="#ef4444" />
                <Text style={styles.omMissingText}>Pas de compte Orange Money</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.partnerCardFooter}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>
              {activeTab === 'merchants' ? 'À payer' : 'Solde'}
            </Text>
            <Text style={[styles.balanceAmount, balance > 0 && styles.balanceAmountPositive]}>
              {balance.toFixed(0)} FCFA
            </Text>
          </View>

          {balance > 0 && hasOMNumber ? (
            <View style={[styles.statusBadge, styles.statusPending]}>
              <Text style={styles.statusText}>En attente</Text>
            </View>
          ) : balance > 0 ? (
            <View style={[styles.statusBadge, styles.statusWarning]}>
              <Text style={styles.statusText}>Pas d'OM</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusPaid]}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={[styles.statusText, { color: '#10b981' }]}>Payé</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Paiement des partenaires</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/bulletins')}
          style={styles.historyButton}
        >
          <FileText size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'merchants' && styles.tabActive]}
          onPress={() => setActiveTab('merchants')}
        >
          <Users size={20} color={activeTab === 'merchants' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'merchants' && styles.tabTextActive]}>
            Vendeurs
          </Text>
          {!loading && (
            <View style={[styles.tabBadge, activeTab === 'merchants' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'merchants' && styles.tabBadgeTextActive]}>
                {merchants.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'drivers' && styles.tabActive]}
          onPress={() => setActiveTab('drivers')}
        >
          <Truck size={20} color={activeTab === 'drivers' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'drivers' && styles.tabTextActive]}>
            Livreurs
          </Text>
          {!loading && (
            <View style={[styles.tabBadge, activeTab === 'drivers' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'drivers' && styles.tabBadgeTextActive]}>
                {drivers.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Chargement des partenaires...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom, téléphone ou Orange Money..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <DollarSign size={24} color="#2563eb" />
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Total à payer</Text>
                <Text style={styles.summaryValue}>
                  {activeTab === 'merchants'
                    ? merchants.reduce((sum, m) => sum + m.pending_amount, 0).toFixed(0)
                    : drivers.reduce((sum, d) => sum + d.balance, 0).toFixed(0)} FCFA
                </Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Users size={24} color="#10b981" />
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Partenaires actifs</Text>
                <Text style={styles.summaryValue}>
                  {activeTab === 'merchants' ? merchants.length : drivers.length}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {activeTab === 'merchants' ? 'Liste des vendeurs' : 'Liste des livreurs'}
            </Text>
            <Text style={styles.listSubtitle}>
              Sélectionnez un partenaire pour effectuer un paiement
            </Text>
          </View>

          {activeTab === 'merchants'
            ? filterPartners(merchants).map(renderPartnerCard)
            : filterPartners(drivers).map(renderPartnerCard)}

          {((activeTab === 'merchants' && filterPartners(merchants).length === 0) ||
            (activeTab === 'drivers' && filterPartners(drivers).length === 0)) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'Aucun résultat trouvé' : `Aucun ${activeTab === 'merchants' ? 'vendeur' : 'livreur'} trouvé`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!processingPayment) { setShowPaymentModal(false); setConfirmingPayment(false); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Effectuer un paiement</Text>
              {!processingPayment && (
                <TouchableOpacity onPress={() => { setShowPaymentModal(false); setConfirmingPayment(false); }} style={styles.closeButton}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {selectedPartner && (
              <>
                <View style={styles.modalPartnerInfo}>
                  <View style={styles.modalPartnerAvatar}>
                    {(selectedPartner.user_profiles as any).profile_photo_url ? (
                      <Image
                        source={{ uri: (selectedPartner.user_profiles as any).profile_photo_url }}
                        style={styles.modalPartnerAvatarImage}
                      />
                    ) : (
                      <Text style={styles.modalPartnerAvatarText}>
                        {getPartnerName(selectedPartner).charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.modalPartnerDetails}>
                    <Text style={styles.modalPartnerName}>{getPartnerName(selectedPartner)}</Text>
                    <Text style={styles.modalPartnerPhone}>
                      {(selectedPartner.user_profiles as any).phone}
                    </Text>
                    {selectedPartner.orange_money_number ? (
                      <View style={styles.modalOMBlock}>
                        <View style={styles.modalOMRow}>
                          <CreditCard size={16} color="#f97316" />
                          <Text style={styles.modalOMNumber}>{selectedPartner.orange_money_number}</Text>
                        </View>
                        {selectedPartner.orange_money_name && (
                          <Text style={styles.modalOMName}>{selectedPartner.orange_money_name}</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.modalOMRow}>
                        <CreditCard size={16} color="#ef4444" />
                        <Text style={styles.modalOMNumberMissing}>Numéro OM non configuré</Text>
                      </View>
                    )}
                  </View>
                </View>

                {pendingPayoutDates.length > 0 && (
                  <View style={styles.payoutDatesBox}>
                    <Text style={styles.payoutDatesTitle}>
                      {pendingPayoutDates.length === 1 ? 'Chiffre d\'affaires du jour' : `Chiffres d'affaires (${pendingPayoutDates.length} jours)`}
                    </Text>
                    {pendingPayoutDates.map((d) => (
                      <Text key={d} style={styles.payoutDateRow}>
                        {formatPayoutDate(d)} — 00h à 24h
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.paymentAmountContainer}>
                  <Text style={styles.paymentAmountLabel}>Montant du paiement</Text>
                  <View style={styles.paymentAmountInputContainer}>
                    <TextInput
                      style={styles.paymentAmountInput}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                      placeholder="0"
                      editable={!processingPayment}
                    />
                    <Text style={styles.paymentAmountCurrency}>FCFA</Text>
                  </View>
                </View>

                <View style={styles.paymentInfoBox}>
                  <Text style={styles.paymentInfoTitle}>Code USSD Orange Money</Text>
                  <Text style={styles.paymentInfoCode}>
                    *144*2*1*{selectedPartner.orange_money_number?.replace(/\D/g, '')}*{paymentAmount}#
                  </Text>
                  <Text style={styles.paymentInfoDescription}>
                    Ce code sera composé automatiquement pour effectuer le transfert
                  </Text>
                </View>

                {confirmingPayment ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmTitle}>Paiement effectué ?</Text>
                    <Text style={styles.confirmSubtitle}>
                      Confirmez-vous avoir complété le virement Orange Money avec succès ?
                    </Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => setConfirmingPayment(false)}
                        disabled={processingPayment}
                      >
                        <Text style={styles.cancelButtonText}>Non</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.payButton]}
                        onPress={() => markPaymentAsCompleted(parseFloat(paymentAmount))}
                        disabled={processingPayment}
                      >
                        {processingPayment ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <CheckCircle size={18} color="#fff" />
                            <Text style={styles.payButtonText}>Oui, confirmer</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowPaymentModal(false)}
                      disabled={processingPayment}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.payButton]}
                      onPress={handlePayment}
                      disabled={processingPayment || !selectedPartner.orange_money_number}
                    >
                      <CreditCard size={18} color="#fff" />
                      <Text style={styles.payButtonText}>Payer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />

      <PaymentBulletin
        visible={showBulletin}
        bulletin={currentBulletin}
        onClose={() => setShowBulletin(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
  },
  tabBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#2563eb',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  partnerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  partnerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  partnerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  partnerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  partnerInfo: {
    flex: 1,
    gap: 4,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  partnerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerPhone: {
    fontSize: 13,
    color: '#64748b',
  },
  omNumber: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '500',
  },
  omInfoContainer: {
    gap: 2,
  },
  omName: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '600',
    marginLeft: 18,
  },
  omMissingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  omMissingText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  partnerCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  balanceContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  balanceAmountPositive: {
    color: '#2563eb',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
  },
  statusWarning: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalPartnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalPartnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  modalPartnerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  modalPartnerAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  modalPartnerDetails: {
    flex: 1,
    gap: 4,
  },
  modalPartnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalPartnerPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  modalOMRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalOMNumber: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  modalOMBlock: {
    gap: 2,
  },
  modalOMName: {
    fontSize: 13,
    color: '#9a3412',
    fontWeight: '700',
    marginLeft: 22,
  },
  modalOMNumberMissing: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  paymentAmountContainer: {
    marginBottom: 20,
  },
  paymentAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  paymentAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  paymentAmountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: 14,
    minWidth: 0,
  },
  paymentAmountCurrency: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    paddingLeft: 6,
    flexShrink: 0,
  },
  payoutDatesBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  payoutDatesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  payoutDateRow: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    paddingVertical: 2,
  },
  paymentInfoBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  paymentInfoCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350f',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  paymentInfoDescription: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  payButton: {
    backgroundColor: '#2563eb',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: '#166534',
    marginBottom: 14,
    lineHeight: 18,
  },
});

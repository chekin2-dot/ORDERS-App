import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, Plus, Search, X, Trash2, CreditCard as Edit, CreditCard } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/Toast';

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
  logo_url: string | null;
  payment_ussd: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onPay,
}: {
  expense: MonthlyExpense;
  onEdit: (e: MonthlyExpense) => void;
  onDelete: (e: MonthlyExpense) => void;
  onPay: (ussd: string | null) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseLogoContainer}>
          {expense.logo_url && !imgError ? (
            <Image
              source={{ uri: expense.logo_url }}
              style={styles.expenseLogo}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.expenseLogoPlaceholder}>
              <Text style={styles.expenseLogoLetter}>
                {expense.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseName}>{expense.name}</Text>
          {expense.description && (
            <Text style={styles.expenseDescription} numberOfLines={2}>
              {expense.description}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => onEdit(expense)}>
          <Edit size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.expenseFooter}>
        <View style={styles.expenseAmount}>
          <DollarSign size={18} color="#059669" />
          <Text style={styles.expenseAmountText}>{expense.amount.toFixed(2)} / mois</Text>
        </View>

        <View style={styles.expenseActions}>
          {expense.payment_ussd && (
            <TouchableOpacity style={styles.payButton} onPress={() => onPay(expense.payment_ussd)}>
              <CreditCard size={18} color="#fff" />
              <Text style={styles.payButtonText}>Payer</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(expense)}>
            <Trash2 size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function MonthlyExpensesScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<MonthlyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<MonthlyExpense | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    logo_url: '',
    payment_ussd: '',
    description: '',
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [searchQuery, expenses]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_expenses')
        .select('*')
        .order('name');

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    if (!searchQuery.trim()) {
      setFilteredExpenses(expenses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = expenses.filter(
      (expense) =>
        expense.name.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query) ||
        expense.amount.toString().includes(query)
    );
    setFilteredExpenses(filtered);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      logo_url: '',
      payment_ussd: '',
      description: '',
    });
  };

  const handleAddExpense = async () => {
    if (!formData.name.trim() || !formData.amount.trim()) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('monthly_expenses').insert({
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        logo_url: formData.logo_url.trim() || null,
        payment_ussd: formData.payment_ussd.trim() || null,
        description: formData.description.trim() || null,
      });

      if (error) throw error;

      showToast('Dépense ajoutée avec succès', 'success');
      setShowAddModal(false);
      resetForm();
      loadExpenses();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEditExpense = async () => {
    if (!selectedExpense || !formData.name.trim() || !formData.amount.trim()) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('monthly_expenses')
        .update({
          name: formData.name.trim(),
          amount: parseFloat(formData.amount),
          logo_url: formData.logo_url.trim() || null,
          payment_ussd: formData.payment_ussd.trim() || null,
          description: formData.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;

      showToast('Dépense modifiée avec succès', 'success');
      setShowEditModal(false);
      setSelectedExpense(null);
      resetForm();
      loadExpenses();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteExpense = async (expense: MonthlyExpense) => {
    try {
      const { error } = await supabase.from('monthly_expenses').delete().eq('id', expense.id);

      if (error) throw error;

      showToast('Dépense supprimée avec succès', 'success');
      loadExpenses();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handlePayment = (ussd: string | null) => {
    if (!ussd) {
      showToast('Code USSD non disponible', 'error');
      return;
    }

    const url = `tel:${encodeURIComponent(ussd)}`;
    Linking.openURL(url);
  };

  const openEditModal = (expense: MonthlyExpense) => {
    setSelectedExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      logo_url: expense.logo_url || '',
      payment_ussd: expense.payment_ussd || '',
      description: expense.description || '',
    });
    setShowEditModal(true);
  };

  const calculateTotal = () => {
    return filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  };

  const renderExpenseCard = (expense: MonthlyExpense) => (
    <ExpenseCard
      key={expense.id}
      expense={expense}
      onEdit={openEditModal}
      onDelete={handleDeleteExpense}
      onPay={handlePayment}
    />
  );

  const renderModal = (visible: boolean, onClose: () => void, onSave: () => void, title: string) => (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Nom <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ex: Bolt, AWS, etc."
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Montant mensuel (USD) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>URL du logo</Text>
              <TextInput
                style={styles.formInput}
                value={formData.logo_url}
                onChangeText={(text) => setFormData({ ...formData, logo_url: text })}
                placeholder="https://example.com/logo.png"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Code USSD de paiement</Text>
              <TextInput
                style={styles.formInput}
                value={formData.payment_ussd}
                onChangeText={(text) => setFormData({ ...formData, payment_ussd: text })}
                placeholder="*144*8*2*1*21466127*1974#"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Description de la dépense..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={onSave}>
              <Text style={styles.modalSaveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dépenses mensuelles</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Chargement des dépenses...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une dépense..."
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

          <View style={styles.totalCard}>
            <DollarSign size={32} color="#059669" />
            <View style={styles.totalInfo}>
              <Text style={styles.totalLabel}>Total mensuel</Text>
              <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.expensesList}>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map(renderExpenseCard)
            ) : (
              <View style={styles.emptyState}>
                <DollarSign size={48} color="#cbd5e1" />
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'Aucune dépense trouvée' : 'Aucune dépense enregistrée'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                  >
                    <Text style={styles.emptyStateButtonText}>Ajouter une dépense</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {renderModal(showAddModal, () => setShowAddModal(false), handleAddExpense, 'Nouvelle dépense')}
      {renderModal(showEditModal, () => setShowEditModal(false), handleEditExpense, 'Modifier la dépense')}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  totalInfo: {
    flex: 1,
    gap: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
  },
  expensesList: {
    gap: 16,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  expenseLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  expenseLogo: {
    width: '100%',
    height: '100%',
  },
  expenseLogoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  expenseLogoLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
  },
  expenseInfo: {
    flex: 1,
    gap: 4,
  },
  expenseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  expenseDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  expenseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  expenseAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expenseAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

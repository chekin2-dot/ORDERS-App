import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Clock, X, Check } from 'lucide-react-native';

interface WorkingHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface WorkingHoursEditorProps {
  workingHours: WorkingHours;
  onSave: (hours: WorkingHours) => Promise<void>;
}

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export default function WorkingHoursEditor({ workingHours, onSave }: WorkingHoursEditorProps) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<WorkingHours>(workingHours);
  const [saving, setSaving] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'open' | 'close'>('open');
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const handleOpen = () => {
    setEditing(workingHours);
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editing);
      Alert.alert('Succès', 'Horaires mis à jour');
      setVisible(false);
    } catch (error) {
      console.error('Error saving hours:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les horaires');
    } finally {
      setSaving(false);
    }
  };

  const toggleDayClosed = (day: string) => {
    setEditing((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day]?.closed,
      },
    }));
  };

  const openTimePicker = (day: string, type: 'open' | 'close') => {
    setSelectedDay(day);
    setSelectedType(type);
    const currentTime = editing[day]?.[type] || '09:00';
    const [hour, minute] = currentTime.split(':');
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setTimePickerVisible(true);
  };

  const handleTimeSelect = () => {
    if (!selectedDay) return;

    const time = `${selectedHour}:${selectedMinute}`;
    setEditing((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [selectedType]: time,
      },
    }));
    setTimePickerVisible(false);
  };

  const formatWorkingHoursDisplay = () => {
    const allDays = DAYS.map(day => editing[day.key]);
    const allClosed = allDays.every(day => day?.closed);

    if (allClosed) {
      return 'Non configuré';
    }

    const openDays = DAYS.filter(day => !editing[day.key]?.closed);
    if (openDays.length === 0) return 'Fermé';

    const firstOpenDay = openDays[0];
    const hours = editing[firstOpenDay.key];
    if (!hours) return 'Non configuré';

    return `${hours.open} - ${hours.close}`;
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={handleOpen}>
        <Clock size={20} color="#666" />
        <View style={styles.triggerContent}>
          <Text style={styles.triggerLabel}>Horaires d'ouverture</Text>
          <Text style={styles.triggerValue}>{formatWorkingHoursDisplay()}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Horaires d'ouverture</Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {DAYS.map((day) => {
                const hours = editing[day.key] || { open: '09:00', close: '18:00', closed: false };
                return (
                  <View key={day.key} style={styles.dayRow}>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <TouchableOpacity
                        style={[
                          styles.closedToggle,
                          hours.closed && styles.closedToggleActive,
                        ]}
                        onPress={() => toggleDayClosed(day.key)}
                      >
                        <Text
                          style={[
                            styles.closedToggleText,
                            hours.closed && styles.closedToggleTextActive,
                          ]}
                        >
                          {hours.closed ? 'Fermé' : 'Ouvert'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {!hours.closed && (
                      <View style={styles.timeRow}>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => openTimePicker(day.key, 'open')}
                        >
                          <Text style={styles.timeButtonText}>{hours.open}</Text>
                        </TouchableOpacity>
                        <Text style={styles.timeSeparator}>-</Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => openTimePicker(day.key, 'close')}
                        >
                          <Text style={styles.timeButtonText}>{hours.close}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleClose}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSave}
                disabled={saving}
              >
                <Check size={20} color="#fff" />
                <Text style={styles.buttonPrimaryText}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={timePickerVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedType === 'open' ? 'Heure d\'ouverture' : 'Heure de fermeture'}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickers}>
              <ScrollView style={styles.timePicker} showsVerticalScrollIndicator={false}>
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timeOption,
                      selectedHour === hour && styles.timeOptionActive,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedHour === hour && styles.timeOptionTextActive,
                      ]}
                    >
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.timeColon}>:</Text>

              <ScrollView style={styles.timePicker} showsVerticalScrollIndicator={false}>
                {MINUTES.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.timeOption,
                      selectedMinute === minute && styles.timeOptionActive,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedMinute === minute && styles.timeOptionTextActive,
                      ]}
                    >
                      {minute}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleTimeSelect}
              >
                <Check size={20} color="#fff" />
                <Text style={styles.buttonPrimaryText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  triggerContent: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  triggerValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
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
    maxHeight: '80%',
  },
  timePickerContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    margin: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalBody: {
    padding: 20,
  },
  dayRow: {
    marginBottom: 20,
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closedToggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  closedToggleActive: {
    backgroundColor: '#fee2e2',
  },
  closedToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  closedToggleTextActive: {
    color: '#dc2626',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  timePickers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  timePicker: {
    maxHeight: 200,
  },
  timeColon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeOptionActive: {
    backgroundColor: '#2563eb',
  },
  timeOptionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  timeOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

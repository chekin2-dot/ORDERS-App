import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

interface WorkingHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface WorkingHoursDisplayProps {
  workingHours: WorkingHours;
  compact?: boolean;
}

const DAYS = [
  { key: 'monday', label: 'Lundi', shortLabel: 'Lun' },
  { key: 'tuesday', label: 'Mardi', shortLabel: 'Mar' },
  { key: 'wednesday', label: 'Mercredi', shortLabel: 'Mer' },
  { key: 'thursday', label: 'Jeudi', shortLabel: 'Jeu' },
  { key: 'friday', label: 'Vendredi', shortLabel: 'Ven' },
  { key: 'saturday', label: 'Samedi', shortLabel: 'Sam' },
  { key: 'sunday', label: 'Dimanche', shortLabel: 'Dim' },
];

export default function WorkingHoursDisplay({ workingHours, compact = false }: WorkingHoursDisplayProps) {
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return (
      <View style={styles.container}>
        <Clock size={20} color="#666" />
        <View style={styles.content}>
          <Text style={styles.label}>Horaires</Text>
          <Text style={styles.value}>Non configuré</Text>
        </View>
      </View>
    );
  }

  const getCurrentDayStatus = () => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;
    const dayKey = DAYS[dayIndex].key;
    const hours = workingHours[dayKey];

    if (!hours || hours.closed) {
      return { status: 'Fermé aujourd\'hui', isOpen: false };
    }

    return {
      status: `Ouvert aujourd'hui: ${hours.open} - ${hours.close}`,
      isOpen: true,
    };
  };

  if (compact) {
    const { status, isOpen } = getCurrentDayStatus();
    return (
      <View style={styles.container}>
        <Clock size={20} color="#666" />
        <View style={styles.content}>
          <Text style={styles.label}>Horaires</Text>
          <Text style={[styles.value, { color: isOpen ? '#4caf50' : '#f44336' }]}>
            {status}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <View style={styles.header}>
        <Clock size={20} color="#666" />
        <Text style={styles.headerText}>Horaires d'ouverture</Text>
      </View>
      <View style={styles.daysList}>
        {DAYS.map((day) => {
          const hours = workingHours[day.key];
          const today = new Date().getDay();
          const dayIndex = today === 0 ? 6 : today - 1;
          const isToday = DAYS[dayIndex].key === day.key;

          return (
            <View
              key={day.key}
              style={[styles.dayRow, isToday && styles.dayRowToday]}
            >
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {day.label}
              </Text>
              <Text style={[styles.dayHours, isToday && styles.dayHoursToday]}>
                {!hours || hours.closed
                  ? 'Fermé'
                  : `${hours.open} - ${hours.close}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  fullContainer: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  daysList: {
    gap: 12,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  dayRowToday: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dayLabelToday: {
    color: '#2563eb',
    fontWeight: '600',
  },
  dayHours: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  dayHoursToday: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Store, Truck } from 'lucide-react-native';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setSelectedUserType } = useAuth();

  const handleUserTypeSelect = (type: 'client' | 'merchant' | 'driver') => {
    setSelectedUserType(type);
    router.push('/auth/phone');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>ORDERS App</Text>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Bienvenue sur ORDERS App </Text>
          <Text style={styles.titleEmoji}>👋</Text>
        </View>
        <Text style={styles.subtitle}>
          Choisissez votre profil pour commencer
        </Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleUserTypeSelect('client')}
        >
          <ShoppingBag size={48} color="#000" style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Je suis Client</Text>
          <Text style={styles.cardDescription}>
            Commander des produits et services
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => handleUserTypeSelect('merchant')}
        >
          <Store size={48} color="#000" style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Je suis Commerçant</Text>
          <Text style={styles.cardDescription}>
            Gérer ma boutique et mes commandes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => handleUserTypeSelect('driver')}
        >
          <Truck size={48} color="#000" style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Je suis Livreur</Text>
          <Text style={styles.cardDescription}>
            Effectuer des livraisons
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.push('/auth/phone')}
      >
        <Text style={styles.loginText}>Déjà inscrit ? Se connecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  titleEmoji: {
    fontSize: 30,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loginLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#007AFF',
  },
});

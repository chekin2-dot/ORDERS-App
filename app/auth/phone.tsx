import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Phone, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const { selectedUserType, refreshProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const userTypeLabel = selectedUserType === 'client' ? 'Client' : selectedUserType === 'merchant' ? 'Commerçant' : 'Livreur';

  const handleAuth = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const email = `${phone}@ordersapp.local`;

    setLoading(true);
    try {
      if (isSignUp) {
        console.log('Starting signup for phone:', phone);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: phone,
            },
            emailRedirectTo: undefined,
          },
        });

        if (error) {
          console.error('Signup error:', error);
          throw error;
        }

        if (data.user) {
          console.log('User created successfully:', data.user.id);

          try {
            const { data: existingProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profileError) {
              console.error('Error checking profile:', profileError);
            }

            if (!existingProfile) {
              console.log('No profile found, redirecting to registration');
              setLoading(false);
              switch (selectedUserType) {
                case 'client':
                  router.replace('/auth/register-client');
                  break;
                case 'merchant':
                  router.replace('/auth/register-merchant');
                  break;
                case 'driver':
                  router.replace('/auth/register-driver');
                  break;
                default:
                  router.replace('/onboarding');
                  break;
              }
            } else {
              console.log('Profile already exists, refreshing and redirecting to dashboard');
              await refreshProfile();

              // Check if user is an admin
              const { data: adminData } = await supabase
                .from('admin_users')
                .select('role, is_active')
                .eq('user_id', data.user.id)
                .eq('is_active', true)
                .maybeSingle();

              setLoading(false);

              if (adminData) {
                console.log('Admin user detected, redirecting to admin dashboard');
                router.replace('/(admin)/(tabs)');
                return;
              }

              switch (existingProfile.user_type) {
                case 'client':
                  router.replace('/(client)/(tabs)');
                  break;
                case 'merchant':
                  router.replace('/(merchant)/(tabs)');
                  break;
                case 'driver':
                  router.replace('/(driver)/(tabs)');
                  break;
                default:
                  router.replace('/onboarding');
                  break;
              }
            }
          } catch (profileCheckError) {
            console.error('Exception checking profile:', profileCheckError);
            setLoading(false);
            router.replace('/auth/register-client');
          }
        } else {
          console.error('No user returned from signup');
          setLoading(false);
          Alert.alert('Erreur', 'Impossible de créer le compte');
        }
      } else {
        console.log('Starting signin for phone:', phone);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Signin error:', error);
          throw error;
        }

        if (data.user) {
          console.log('User signed in successfully:', data.user.id);

          try {
            const { data: existingProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profileError) {
              console.error('Error fetching profile:', profileError);
            }

            if (existingProfile) {
              console.log('Profile found, refreshing and redirecting to dashboard:', existingProfile.user_type);
              await refreshProfile();

              // Check if user is an admin
              const { data: adminData } = await supabase
                .from('admin_users')
                .select('role, is_active')
                .eq('user_id', data.user.id)
                .eq('is_active', true)
                .maybeSingle();

              setLoading(false);

              if (adminData) {
                console.log('Admin user detected, redirecting to admin dashboard');
                router.replace('/(admin)/(tabs)');
                return;
              }

              switch (existingProfile.user_type) {
                case 'client':
                  router.replace('/(client)/(tabs)');
                  break;
                case 'merchant':
                  router.replace('/(merchant)/(tabs)');
                  break;
                case 'driver':
                  router.replace('/(driver)/(tabs)');
                  break;
                default:
                  router.replace('/onboarding');
                  break;
              }
            } else {
              console.log('No profile found, redirecting to registration');
              setLoading(false);
              switch (selectedUserType) {
                case 'client':
                  router.replace('/auth/register-client');
                  break;
                case 'merchant':
                  router.replace('/auth/register-merchant');
                  break;
                case 'driver':
                  router.replace('/auth/register-driver');
                  break;
                default:
                  router.replace('/onboarding');
                  break;
              }
            }
          } catch (profileFetchError) {
            console.error('Exception fetching profile:', profileFetchError);
            setLoading(false);
            Alert.alert('Erreur', 'Impossible de charger le profil. Veuillez réessayer.');
          }
        } else {
          console.error('No user returned from signin');
          setLoading(false);
          Alert.alert('Erreur', 'Connexion échouée');
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setLoading(false);

      const errorMessage = error?.message?.toLowerCase() || '';

      if (errorMessage.includes('invalid login credentials') ||
          errorMessage.includes('invalid credentials') ||
          errorMessage.includes('user not found')) {
        if (isSignUp) {
          Alert.alert('Erreur', 'Erreur lors de la création du compte. Veuillez réessayer.');
        } else {
          Alert.alert(
            'Compte inexistant',
            'Le compte n\'existe pas. Veuillez créer votre compte.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Créer un compte',
                style: 'default',
                onPress: () => setIsSignUp(true),
              },
            ]
          );
        }
      } else if (errorMessage.includes('user already registered') ||
                 errorMessage.includes('already registered')) {
        Alert.alert(
          'Compte existant',
          'Ce numéro est déjà enregistré. Veuillez vous connecter.',
          [
            { text: 'OK', onPress: () => setIsSignUp(false) }
          ]
        );
      } else {
        Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#000" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>
          {isSignUp ? 'Inscription' : 'Connexion'} {userTypeLabel}
        </Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Créez votre compte' : 'Connectez-vous à votre compte'}
        </Text>

        <View style={styles.inputContainer}>
          <Phone size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder="N° de téléphone WhatsApp (ex: +226...)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Mot de passe"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#666" />
            ) : (
              <Eye size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeTypeButton}
          onPress={() => router.replace('/onboarding')}
        >
          <Text style={styles.changeTypeText}>
            Changer de type (Client / Commerçant / Livreur)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
  changeTypeButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  changeTypeText: {
    color: '#666',
    fontSize: 14,
  },
});

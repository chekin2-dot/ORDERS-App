import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface DriverRatingProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  driverId: string;
  clientId: string;
  driverName: string;
  onRatingSubmitted?: () => void;
}

export function DriverRating({
  visible,
  onClose,
  orderId,
  driverId,
  clientId,
  driverName,
  onRatingSubmitted,
}: DriverRatingProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Évaluation requise', 'Veuillez sélectionner une note avant de soumettre.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('driver_ratings').insert({
        order_id: orderId,
        driver_id: driverId,
        client_id: clientId,
        rating: rating,
        comment: comment.trim(),
      });

      if (error) {
        console.error('Error submitting rating:', error);
        Alert.alert('Erreur', 'Impossible de soumettre votre évaluation. Veuillez réessayer.');
        return;
      }

      Alert.alert('Merci !', 'Votre évaluation a été enregistrée avec succès.');
      setRating(0);
      setComment('');
      onRatingSubmitted?.();
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Évaluez votre livreur</Text>
            <Text style={styles.subtitle}>{driverName}</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                  disabled={submitting}
                >
                  <Star
                    size={40}
                    color={star <= rating ? '#FFB800' : '#E0E0E0'}
                    fill={star <= rating ? '#FFB800' : 'transparent'}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && 'Très insatisfait'}
                {rating === 2 && 'Insatisfait'}
                {rating === 3 && 'Correct'}
                {rating === 4 && 'Satisfait'}
                {rating === 5 && 'Excellent'}
              </Text>
            )}

            <Text style={styles.commentLabel}>
              Commentaire (optionnel)
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Partagez votre expérience..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              editable={!submitting}
              textAlignVertical="top"
            />

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Plus tard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (rating === 0 || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Envoi...' : 'Envoyer'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
    textAlign: 'center',
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#F8F8F8',
    minHeight: 100,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#FF6B00',
  },
  submitButtonDisabled: {
    backgroundColor: '#FFB380',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

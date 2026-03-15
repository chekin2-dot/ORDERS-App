import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number;
  totalRatings?: number;
  size?: number;
  showNumber?: boolean;
}

export function StarRating({ rating, totalRatings, size = 16, showNumber = true }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, index) => (
          <Star key={`full-${index}`} size={size} color="#FFB800" fill="#FFB800" strokeWidth={2} />
        ))}
        {hasHalfStar && (
          <View style={styles.halfStarContainer}>
            <Star size={size} color="#FFB800" fill="#FFB800" strokeWidth={2} style={styles.halfStarFilled} />
            <Star size={size} color="#E0E0E0" fill="transparent" strokeWidth={2} style={styles.halfStarEmpty} />
          </View>
        )}
        {[...Array(emptyStars)].map((_, index) => (
          <Star key={`empty-${index}`} size={size} color="#E0E0E0" fill="transparent" strokeWidth={2} />
        ))}
      </View>
      {showNumber && (
        <View style={styles.textContainer}>
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          {totalRatings !== undefined && (
            <Text style={styles.countText}>({totalRatings})</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  halfStarContainer: {
    position: 'relative',
    width: 16,
    height: 16,
  },
  halfStarFilled: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  halfStarEmpty: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  countText: {
    fontSize: 12,
    color: '#666',
  },
});

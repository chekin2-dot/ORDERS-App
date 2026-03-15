import { View, Text, StyleSheet } from 'react-native';

export default function AppFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        <Text style={styles.designBy}>Design by</Text> <Text style={styles.footerBrand}>ODF BF</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  designBy: {
    fontStyle: 'italic',
  },
  footerBrand: {
    fontWeight: '600',
    fontStyle: 'normal',
    color: '#1f2937',
  },
});

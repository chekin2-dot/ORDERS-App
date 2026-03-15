import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react-native';

type Subcategory = {
  id: string;
  name: string;
  name_fr: string;
  icon: string;
};

export default function SubcategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.categoryId as string;
  const categoryName = params.categoryName as string;
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    fetchSubcategories();
  }, [categoryId]);

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', categoryId)
        .order('name_fr');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.subcategoriesGrid}>
          {subcategories.map((subcategory) => (
            <TouchableOpacity
              key={subcategory.id}
              style={styles.subcategoryCard}
              onPress={() => router.push(`/(client)/merchants?merchantCategory=${subcategory.id}`)}
            >
              {subcategory.name_fr === 'TAXI AUTO' ? (
                <Text style={styles.taxiAutoIcon}>🚗</Text>
              ) : subcategory.name_fr === 'TAXI MOTO' ? (
                <Text style={styles.taxiMotoIcon}>🏍️</Text>
              ) : (
                <Text style={styles.subcategoryIcon}>{subcategory.icon}</Text>
              )}
              <Text style={styles.subcategoryName}>{subcategory.name_fr}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  subcategoryCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  subcategoryIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  taxiAutoIcon: {
    fontSize: 105,
    marginBottom: 12,
  },
  taxiMotoIcon: {
    fontSize: 105,
    marginBottom: 12,
  },
  subcategoryImage: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
});

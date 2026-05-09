import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import AdminLostFoundScreen from './admin-lost-found';

const ORANGE = '#E05C04';

type LostFoundItem = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function UserLostFoundViewer() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lost_found')
        .select('id, title, description, image_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data ?? []);
    } catch (e) {
      console.error('fetchLostFound error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.title} ${item.description}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  const renderItem = ({ item }: { item: LostFoundItem }) => (
    <View style={styles.card}>
      {item.image_url && !failedImages[item.id] ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.itemImage}
          resizeMode="cover"
          onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
        />
      ) : (
        <View style={styles.imageFallback}>
          <Ionicons name="image-outline" size={42} color="#bbb" />
          <Text style={styles.imageFallbackText}>
            {item.image_url ? 'Image unavailable' : 'No image'}
          </Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jegans Liner</Text>
        <View style={styles.headerIconSpacer} />
      </View>

      <Text style={styles.title}>Lost & Found</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={22} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.cardRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="help-circle-outline" size={54} color="#ccc" />
              <Text style={styles.emptyText}>No lost and found items yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function LostFoundScreen() {
  const { userProfile } = useAuth();

  if (userProfile?.is_admin) {
    return <AdminLostFoundScreen />;
  }

  return <UserLostFoundViewer />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconSpacer: {
    width: 42,
  },
  headerTitle: {
    color: ORANGE,
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '800',
    color: '#333',
    marginTop: 30,
    marginBottom: 28,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 28,
    paddingHorizontal: 18,
    backgroundColor: '#f9fafb',
    height: 56,
  },
  searchInput: {
    flex: 1,
    fontSize: 20,
    color: '#111827',
    marginLeft: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  cardRow: {
    gap: 20,
  },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ORANGE,
    backgroundColor: '#fff',
    marginBottom: 20,
    minHeight: 330,
  },
  itemImage: {
    width: '100%',
    height: 165,
    backgroundColor: '#f3f4f6',
  },
  imageFallback: {
    width: '100%',
    height: 165,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  imageFallbackText: {
    fontSize: 12,
    color: '#999',
  },
  cardBody: {
    padding: 14,
  },
  itemTitle: {
    fontSize: 25,
    color: '#333',
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 17,
    color: '#333',
    marginTop: 6,
  },
  itemDescription: {
    fontSize: 19,
    color: '#444',
    lineHeight: 27,
    marginTop: 18,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

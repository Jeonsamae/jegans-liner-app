import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase';

const ORANGE = '#E05C04';
const LOST_FOUND_BUCKET = 'lost-found';

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

export default function AdminLostFoundScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lost_found')
        .select('id, title, description, image_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data ?? []);
    } catch (e) {
      console.error('fetchAdminLostFound error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageAsset(result.assets[0]);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const fileNameExt = asset.fileName?.split('.').pop()?.toLowerCase();
    const uriExt = asset.uri.split('.').pop()?.toLowerCase().split('?')[0];
    const mimeExt = asset.mimeType?.split('/')[1]?.toLowerCase();
    const rawExt = fileNameExt || mimeExt || uriExt || 'jpg';
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
    const fileName = `lost_found_${session!.user.id}_${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri: asset.uri, type: mimeType, name: fileName } as any);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${LOST_FOUND_BUCKET}/${fileName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentSession?.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'x-upsert': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return supabase.storage.from(LOST_FOUND_BUCKET).getPublicUrl(fileName).data.publicUrl;
  };

  const submitItem = async () => {
    if (!session?.user) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Please enter an item name and description.');
      return;
    }
    if (!imageAsset) {
      Alert.alert('Missing photo', 'Please add a photo of the lost and found item.');
      return;
    }

    setSubmitting(true);
    try {
      const image_url = await uploadImage(imageAsset);

      const { error } = await supabase.from('lost_found').insert({
        title: title.trim(),
        description: description.trim(),
        image_url,
        created_by: session.user.id,
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setImageAsset(null);
      await fetchItems();
      Alert.alert('Posted', 'Lost and found item is now visible to users.');
    } catch (e) {
      console.error('submitLostFound error:', e);
      Alert.alert('Unable to post', 'Please check that the lost_found table and lost-found bucket are ready.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: LostFoundItem }) => (
    <View style={styles.itemCard}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      ) : (
        <View style={styles.itemImageFallback}>
          <Ionicons name="image-outline" size={30} color="#aaa" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lost & Found</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={fetchItems}>
          <Ionicons name="refresh" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Post Item</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Item name"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description and where it was found"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageAsset ? (
                <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={34} color="#9ca3af" />
                  <Text style={styles.imageText}>Add photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {imageAsset && (
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageAsset(null)}>
                <Text style={styles.removeImageText}>Remove photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submitItem}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Post Lost & Found</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Posted Items</Text>
          {loading ? (
            <ActivityIndicator color={ORANGE} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No items posted yet.</Text>}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
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
    borderBottomColor: '#e4e6eb',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: ORANGE,
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    padding: 14,
    paddingBottom: 36,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  descriptionInput: {
    minHeight: 90,
    lineHeight: 21,
  },
  imagePicker: {
    height: 190,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 10,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  imageText: {
    color: '#6b7280',
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  removeImageText: {
    color: '#ef4444',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: ORANGE,
    borderRadius: 9,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    gap: 12,
    marginBottom: 10,
  },
  itemImage: {
    width: 86,
    height: 86,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  itemImageFallback: {
    width: 86,
    height: 86,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  itemDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  itemDescription: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
});

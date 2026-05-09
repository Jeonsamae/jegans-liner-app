import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';

const ORANGE = '#E05C04';

export default function AdminCreatePostScreen() {
  const { session, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = async () => {
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
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = `post_${session!.user.id}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri, type: mimeType, name: fileName } as any);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/post-images/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentSession?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );
      if (!response.ok) return null;
      return supabase.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
    } catch {
      return null;
    }
  };

  const handlePost = async () => {
    if (!session?.user) return;
    if (!content.trim() && !imageUri) {
      Alert.alert('Empty post', 'Please write something or pick an image.');
      return;
    }
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (imageUri) image_url = await uploadImage(imageUri);
      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: content.trim(),
        image_url,
      });
      if (error) throw error;
      setContent('');
      setImageUri(null);
      Alert.alert('Posted!', 'Your announcement has been posted to all users.');
    } catch {
      Alert.alert('Error', 'Could not create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = !submitting && (!!content.trim() || !!imageUri);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Admin Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin')}>
          <Ionicons name="home" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="megaphone" size={26} color={ORANGE} />
          <View style={styles.navActiveBar} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-users' as any)}>
          <Ionicons name="people" size={26} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Form Header */}
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Post Announcement</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost}
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* User Info */}
          <View style={styles.userRow}>
            {userProfile?.photo_url ? (
              <Image source={{ uri: userProfile.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.username}>{userProfile?.full_name ?? 'Admin'}</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin · Announcement</Text>
              </View>
            </View>
          </View>

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Write an announcement for all users..."
            placeholderTextColor="#bcc0c4"
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
          />

          {/* Image Area */}
          <TouchableOpacity
            style={styles.imageArea}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.pickedImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image" size={44} color="#bcc0c4" />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  navItemActive: {},
  navActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    backgroundColor: '#fff',
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#050505',
  },
  postBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#050505',
  },
  adminBadge: {
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  adminBadgeText: {
    color: ORANGE,
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    fontSize: 18,
    color: '#050505',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 26,
    padding: 0,
  },
  imageArea: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    height: 220,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedImage: {
    width: '100%',
    height: 300,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

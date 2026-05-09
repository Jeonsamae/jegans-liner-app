import React, { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';

const ORANGE = '#E05C04';

export default function ProfileScreen() {
  const { userProfile, refreshProfile } = useAuth();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const isViewingOtherUser = !!userId && userId !== userProfile?.id;
  const [viewedProfile, setViewedProfile] = useState<typeof userProfile>(null);
  const displayProfile = isViewingOtherUser ? viewedProfile : userProfile;

  const [fullName, setFullName] = useState(userProfile?.full_name ?? '');
  const [address, setAddress] = useState(userProfile?.address ?? '');
  const [workplace, setWorkplace] = useState(userProfile?.workplace ?? '');
  const [age, setAge] = useState(userProfile?.age?.toString() ?? '');
  const [birthday, setBirthday] = useState(userProfile?.birthday ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null); // local picked URI
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isViewingOtherUser || !userId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, photo_url, is_admin, address, workplace, age, birthday')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setViewedProfile(data);
        setFullName(data.full_name);
        setAddress(data.address ?? '');
        setWorkplace(data.workplace ?? '');
        setAge(data.age?.toString() ?? '');
        setBirthday(data.birthday ?? '');
      }
    };

    fetchProfile();
  }, [isViewingOtherUser, userId]);

  useEffect(() => {
    if (!isViewingOtherUser) {
      setFullName(userProfile?.full_name ?? '');
      setAddress(userProfile?.address ?? '');
      setWorkplace(userProfile?.workplace ?? '');
      setAge(userProfile?.age?.toString() ?? '');
      setBirthday(userProfile?.birthday ?? '');
    }
  }, [
    isViewingOtherUser,
    userProfile?.address,
    userProfile?.age,
    userProfile?.birthday,
    userProfile?.full_name,
    userProfile?.workplace,
  ]);

  const hasChanges =
    !isViewingOtherUser && (
      fullName.trim() !== (userProfile?.full_name ?? '') ||
      address.trim() !== (userProfile?.address ?? '') ||
      workplace.trim() !== (userProfile?.workplace ?? '') ||
      age.trim() !== (userProfile?.age?.toString() ?? '') ||
      birthday.trim() !== (userProfile?.birthday ?? '') ||
      photoUri !== null
    );

  const currentPhoto = photoUri ?? displayProfile?.photo_url ?? null;

  const handlePickPhoto = async () => {
    if (isViewingOtherUser) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = `avatar_${userProfile!.id}_${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', { uri, type: mimeType, name: fileName } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        console.error('Photo upload failed:', await response.text());
        return null;
      }

      return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
    } catch (e) {
      console.error('uploadPhoto error:', e);
      return null;
    }
  };

  const handleSave = async () => {
    if (!userProfile || isViewingOtherUser) return;
    if (!fullName.trim()) {
      Alert.alert('Validation', 'Full name cannot be empty.');
      return;
    }
    const parsedAge = age.trim() ? Number(age.trim()) : null;
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120)) {
      Alert.alert('Validation', 'Please enter a valid age.');
      return;
    }

    setSaving(true);
    try {
      let photo_url = userProfile.photo_url;

      if (photoUri) {
        const uploaded = await uploadPhoto(photoUri);
        if (uploaded) {
          photo_url = uploaded;
        } else {
          Alert.alert(
            'Photo upload failed',
            'Make sure the "profile-photos" bucket exists in Supabase Storage and is public. Other changes will still be saved.'
          );
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          photo_url,
          address: address.trim() || null,
          workplace: workplace.trim() || null,
          age: parsedAge,
          birthday: birthday.trim() || null,
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      await refreshProfile();
      setPhotoUri(null);
      Alert.alert('Saved!', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
      console.error('handleSave error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isViewingOtherUser ? 'User Profile' : 'Profile'}</Text>
        {isViewingOtherUser ? (
          <View style={styles.saveBtnSpacer} />
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges || saving}
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={handlePickPhoto} style={styles.photoWrapper} activeOpacity={0.8}>
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person" size={52} color="#aaa" />
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            {!isViewingOtherUser && (
              <TouchableOpacity onPress={handlePickPhoto}>
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#bcc0c4"
                autoCapitalize="words"
                returnKeyType="done"
                editable={!isViewingOtherUser}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValueReadOnly}>{displayProfile?.email ?? '-'}</Text>
              {!isViewingOtherUser && <Text style={styles.fieldNote}>Email cannot be changed here.</Text>}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={styles.fieldInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor="#bcc0c4"
                editable={!isViewingOtherUser}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Workplace</Text>
              <TextInput
                style={styles.fieldInput}
                value={workplace}
                onChangeText={setWorkplace}
                placeholder="Enter your workplace"
                placeholderTextColor="#bcc0c4"
                editable={!isViewingOtherUser}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.fieldInput}
                value={age}
                onChangeText={setAge}
                placeholder="Enter your age"
                placeholderTextColor="#bcc0c4"
                keyboardType="number-pad"
                editable={!isViewingOtherUser}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Birthday</Text>
              <TextInput
                style={styles.fieldInput}
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#bcc0c4"
                editable={!isViewingOtherUser}
              />
              {!isViewingOtherUser && <Text style={styles.fieldNote}>Use format YYYY-MM-DD.</Text>}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Account Type</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {displayProfile?.is_admin ? 'Admin' : 'User'}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button (alternate at bottom) */}
          {!isViewingOtherUser && (
            <TouchableOpacity
              style={[styles.saveBottomBtn, (!hasChanges || saving) && styles.saveBottomBtnDisabled]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBottomBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#050505',
  },
  saveBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnSpacer: {
    width: 60,
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  body: {
    padding: 20,
    paddingBottom: 140,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: ORANGE,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ccd0d5',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 15,
    color: ORANGE,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldBlock: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#65676b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    color: '#050505',
    padding: 0,
  },
  fieldValueReadOnly: {
    fontSize: 16,
    color: '#333',
  },
  fieldNote: {
    fontSize: 12,
    color: '#bcc0c4',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e6eb',
    marginHorizontal: 18,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff3ec',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f5c6a0',
  },
  roleBadgeText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBottomBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBottomBtnDisabled: {
    opacity: 0.35,
  },
  saveBottomBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

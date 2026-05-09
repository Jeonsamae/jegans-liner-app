import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import AdminReportsScreen from './admin-reports';

const ORANGE = '#E05C04';
const EVIDENCE_BUCKET = 'evidence-report';

function UserReportForm() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadEvidence = async (uri: string) => {
    const ext = uri.split('.').pop()?.toLowerCase().split('?')[0] ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const fileName = `evidence_${session!.user.id}_${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri, type: mimeType, name: fileName } as any);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${EVIDENCE_BUCKET}/${fileName}`, {
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

    return supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(fileName).data.publicUrl;
  };

  const submitReport = async () => {
    if (!session?.user) return;
    if (!title.trim() || !details.trim()) {
      Alert.alert('Missing details', 'Please enter a complaint title and complaint details.');
      return;
    }

    setSubmitting(true);
    try {
      let evidence_url: string | null = null;
      if (imageUri) {
        evidence_url = await uploadEvidence(imageUri);
      }

      const { error } = await supabase.from('reports').insert({
        user_id: session.user.id,
        title: title.trim(),
        details: details.trim(),
        evidence_url,
      });

      if (error) throw error;

      Alert.alert('Report submitted', 'Your complaint has been sent to the admin.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('submitReport error:', e);
      Alert.alert('Unable to submit', 'Please check that the reports table and evidence-report bucket are ready.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={styles.iconBtnSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Complaint Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter complaint title"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Complaint Details</Text>
          <TextInput
            style={[styles.input, styles.detailsInput]}
            value={details}
            onChangeText={setDetails}
            placeholder="Describe what happened"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Supporting Evidence</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="image-outline" size={42} color="#9ca3af" />
                <Text style={styles.uploadText}>Upload image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submitReport}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Complaint</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ReportScreen() {
  const { userProfile } = useAuth();

  if (userProfile?.is_admin) {
    return <AdminReportsScreen />;
  }

  return <UserReportForm />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    borderBottomColor: '#e5e7eb',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ORANGE,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  detailsInput: {
    minHeight: 150,
    lineHeight: 22,
  },
  uploadBox: {
    height: 230,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: {
    color: '#6b7280',
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

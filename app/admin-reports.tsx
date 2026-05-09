import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';

type ReportItem = {
  id: string;
  title: string;
  details: string;
  evidence_url: string | null;
  created_at: string;
  status?: string | null;
  profiles?: {
    full_name: string;
  } | null;
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

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, details, evidence_url, created_at, status, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data ?? []).map((r: any) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      })));
    } catch (e) {
      console.error('fetchReports error:', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const markAddressed = async (id: string) => {
    const { error } = await supabase.from('reports').update({ status: 'addressed' }).eq('id', id);
    if (error) {
      Alert.alert('Unable to update', 'Please make sure the reports table has a status column.');
      return;
    }
    setReports((prev) => prev.map((report) => (
      report.id === id ? { ...report, status: 'addressed' } : report
    )));
  };

  const renderReport = ({ item }: { item: ReportItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <Text style={styles.reportMeta}>
            {item.profiles?.full_name ?? 'Unknown user'} - {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'addressed' && styles.statusBadgeDone]}>
          <Text style={[styles.statusText, item.status === 'addressed' && styles.statusTextDone]}>
            {item.status === 'addressed' ? 'Addressed' : 'Pending'}
          </Text>
        </View>
      </View>

      <Text style={styles.details}>{item.details}</Text>
      {item.evidence_url && (
        <Image source={{ uri: item.evidence_url }} style={styles.evidenceImage} resizeMode="cover" />
      )}

      {item.status !== 'addressed' && (
        <TouchableOpacity style={styles.addressBtn} onPress={() => markAddressed(item.id)}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.addressText}>Mark Addressed</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={fetchReports}>
          <Ionicons name="refresh" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={54} color="#ccc" />
              <Text style={styles.emptyText}>No reports yet.</Text>
            </View>
          }
        />
      )}
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
    fontSize: 20,
    fontWeight: '800',
    color: ORANGE,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  reportMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusBadgeDone: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextDone: {
    color: '#15803d',
  },
  details: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 12,
  },
  evidenceImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#f3f4f6',
  },
  addressBtn: {
    marginTop: 12,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addressText: {
    color: '#fff',
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 90,
    gap: 10,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});

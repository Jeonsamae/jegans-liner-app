import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#E05C04';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By downloading, accessing, or using the Jegans Liner mobile application, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.',
  },
  {
    title: '2. Service Description',
    body: 'The Jegans Liner App provides bus schedule information, fare details, route maps, and trip updates for the Cebu City (South Bus Terminal) to Pinamungahan route. All information is provided for reference and convenience purposes only.',
  },
  {
    title: '3. Schedule Information',
    body: 'Bus schedules are subject to change without prior notice due to unforeseen circumstances, road conditions, weather, or special events. Jegans Liner strives to keep information accurate but cannot guarantee real-time accuracy at all times. Always check with terminal staff for the most current schedules.',
  },
  {
    title: '4. Fare Information',
    body: 'Fares displayed in this application are standard rates and may be subject to periodic adjustment in accordance with directives from the Land Transportation Franchising and Regulatory Board (LTFRB). Always confirm current fares with bus staff or the terminal before boarding.',
  },
  {
    title: '5. Passenger Conduct',
    body: 'All passengers are expected to observe proper conduct while using Jegans Liner services:\n\n• Follow all instructions from drivers and conductors\n• Keep the bus clean and free of litter\n• Refrain from smoking, drinking alcohol, or using prohibited substances\n• Respect fellow passengers and bus personnel\n• Report any suspicious activities to the driver or conductor immediately',
  },
  {
    title: '6. Lost and Found',
    body: 'Jegans Liner is not responsible for any personal belongings left inside the bus. Passengers are advised to keep their valuables secured at all times. For lost items, you may file a report through the app or visit the terminal office directly.',
  },
  {
    title: '7. Privacy Policy',
    body: 'We collect minimal personal information (such as your name and email address) solely for the purpose of providing and improving our services. We do not sell, rent, or share your personal data with third parties except as required by applicable law. Your data is stored securely in accordance with industry standards.',
  },
  {
    title: '8. Account Security',
    body: 'You are solely responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access or use of your account. Jegans Liner will not be held liable for any loss or damage arising from your failure to protect your account information.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'To the fullest extent permitted by law, Jegans Liner shall not be liable for any indirect, incidental, or consequential damages arising from the use of this application or our transportation services, including but not limited to delays, missed connections, or loss of personal property.',
  },
  {
    title: '10. Intellectual Property',
    body: 'All content within this application — including text, graphics, logos, icons, and images — is the exclusive property of Jegans Liner. Unauthorized reproduction, distribution, or use of any content is strictly prohibited without prior written consent.',
  },
  {
    title: '11. Amendments',
    body: 'Jegans Liner reserves the right to update or modify these Terms and Conditions at any time. Changes will be reflected in the app with an updated date. Continued use of the application after any changes constitutes your acceptance of the revised terms.',
  },
  {
    title: '12. Governing Law',
    body: 'These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from the use of this application or our services shall be subject to the jurisdiction of the appropriate courts in Cebu City, Philippines.',
  },
  {
    title: '13. Contact Us',
    body: 'For questions, concerns, or feedback regarding these Terms and Conditions or our services, please reach out through the "Contact Us" section in the app, or visit us at the Jegans Liner terminal offices in Cebu City or Pinamungahan.',
  },
];

export default function TermsConditionsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="document-text" size={44} color={ORANGE} />
          <Text style={styles.bannerTitle}>Jegans Liner</Text>
          <Text style={styles.bannerSubtitle}>Terms & Conditions</Text>
          <Text style={styles.bannerDate}>Last Updated: May 09, 2026</Text>
        </View>

        <Text style={styles.intro}>
          Please read these Terms and Conditions carefully before using the Jegans Liner application.
          These terms govern your use of our services and your rights and responsibilities as a passenger.
        </Text>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing to use the Jegans Liner app, you acknowledge that you have read,
            understood, and agree to these Terms and Conditions.
          </Text>
        </View>
      </ScrollView>
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
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: ORANGE,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginTop: 4,
  },
  bannerDate: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 8,
  },
  intro: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
    flex: 1,
  },
  sectionBody: {
    fontSize: 13,
    color: '#555',
    lineHeight: 21,
  },
  footer: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { height } = Dimensions.get('window');

export default function LandingScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../background.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.topSection}>
          <Image
            source={require('../logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.signUpBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signUpText}>SIGN UP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            activeOpacity={0.75}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginText}>ALREADY HAVE AN ACCOUNT?</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bg: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: height * 0.08,
  },
  logo: {
    width: 280,
    height: 280,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 16,
  },
  signUpBtn: {
    backgroundColor: '#3a8c3f',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  signUpText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  loginBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Original context and services
import { APP_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeCustomerProfile,
  updateCustomerProfile,
} from '../../services/customerService';

// Local theme object to replicate the target design's aesthetic
const theme = {
  surface: '#FFFFFF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F4F5F7',
  surfaceHigh: '#EAECEE',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#6C7278',
  primary: '#FF5700',
  primaryContainer: '#FF8A3D',
  success: '#22c55e',
};

export function AccountScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeCustomerProfile(
      user.uid,
      (data) => {
        setProfile(data);
        setPhoneDraft(data?.phone || '');
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  const bookingCount = profile?.totalBookings || 0;
  const savedAddressCount = useMemo(() => {
    if (Array.isArray(profile?.savedAddresses)) return profile.savedAddresses.length;
    return profile?.address ? 1 : 0;
  }, [profile?.savedAddresses, profile?.address]);

  const onSavePhone = async () => {
    if (!user?.uid) return;
    setSavingPhone(true);
    try {
      await updateCustomerProfile(user.uid, { phone: phoneDraft.trim() });
      setEditingPhone(false);
    } catch (e) {
      Alert.alert('Update failed', e?.message || 'Could not update phone number.');
    } finally {
      setSavingPhone(false);
    }
  };

  const onEditImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photos to change profile image.');
        return;
      }
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      Alert.alert('Coming soon', 'Profile image upload can be connected anytime.');
    } catch {
      Alert.alert('Unavailable', 'Image picker is not available right now.');
    }
  };

  const supportItems = [
    {
      id: 'chat',
      title: 'Chat Support',
      icon: 'chat',
      onPress: () => navigation.navigate('SupportChat'),
    },
    {
      id: 'call',
      title: 'Call Support',
      icon: 'phone',
      onPress: async () => {
        const url = 'tel:+911800000111';
        const can = await Linking.canOpenURL(url);
        if (!can) {
          Alert.alert('Not available', 'Calling is unavailable on this device.');
          return;
        }
        await Linking.openURL(url);
      },
    },
    {
      id: 'terms',
      title: 'Terms of Use',
      icon: 'description',
      onPress: () => navigation.navigate('TermsOfUse'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'security',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      id: 'about',
      title: 'About App',
      icon: 'info',
      onPress: () => navigation.navigate('AboutModal'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="build" size={24} color={theme.primary} />
          <Text style={styles.headerTitle}>{APP_NAME}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <MaterialIcons
            name="shopping-cart"
            size={22}
            color={theme.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.imageRing}>
              <Image
                source={{
                  uri: profile?.photoURL || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop",
                }}
                style={styles.profileImage}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.editImageBtnContainer}
              onPress={onEditImage}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryContainer]}
                style={styles.editImageBtn}
              >
                <MaterialIcons name="edit" size={18} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
            <Text style={styles.profileSubtitle}>
              {profile?.email || user?.email || 'Premium Member'}
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.goldBadge}>
                <Text style={styles.goldBadgeText}>VERIFIED</Text>
              </View>
              <View style={styles.serviceBadge}>
                <Text style={styles.serviceBadgeText}>
                  {bookingCount} SERVICES COMPLETED
                </Text>
              </View>
            </View>
          </View>
        </View>

        {loading && (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginBottom: 20 }} />
        )}

        {/* Info Cards Grid */}
        <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
          
          {/* Personal Details */}
          <View style={[styles.infoCard, isTablet && styles.cardHalf]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Details</Text>
              <MaterialIcons
                name="person"
                size={24}
                color={theme.onSurfaceVariant}
                style={{ opacity: 0.4 }}
              />
            </View>

            <InfoRow
              label="EMAIL ADDRESS"
              value={profile?.email || user?.email || 'Not set'}
              icon="mail"
            />
            <View style={styles.divider} />
            
            {editingPhone ? (
              <View style={styles.editPhoneContainer}>
                <Text style={styles.infoLabel}>PHONE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    style={styles.phoneInput}
                    value={phoneDraft}
                    onChangeText={setPhoneDraft}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                    placeholderTextColor={theme.onSurfaceVariant}
                    autoFocus
                  />
                  <TouchableOpacity 
                    style={styles.savePhoneBtn} 
                    onPress={onSavePhone}
                    disabled={savingPhone}
                  >
                    {savingPhone ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelPhoneBtn} 
                    onPress={() => {
                      setEditingPhone(false);
                      setPhoneDraft(profile?.phone || '');
                    }}
                  >
                    <MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <InfoRow 
                label="PHONE NUMBER" 
                value={profile?.phone || 'Not set'} 
                icon="edit" 
                onPress={() => setEditingPhone(true)}
              />
            )}
          </View>

          {/* Address Book */}
          <View style={[styles.infoCard, isTablet && styles.cardHalf]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Address Book</Text>
              <MaterialIcons
                name="location-city"
                size={24}
                color={theme.onSurfaceVariant}
                style={{ opacity: 0.4 }}
              />
            </View>

            <InfoRow
              label="SAVED LOCATIONS"
              value={`${savedAddressCount} Address(es)`}
              icon="chevron-right"
              onPress={() => navigation.navigate('Address')}
            />
            <View style={styles.divider} />
            <InfoRow
              label="CURRENT PRIMARY"
              value={profile?.address || "Not set"}
              icon="map"
              valueSpacing={false}
            />
          </View>

          {/* App & Support (Preferences Full Width) */}
          <View
            style={[styles.infoCard, { width: "100%", overflow: "hidden" }]}
          >
            <Text style={[styles.cardTitle, { marginBottom: 20 }]}>
              App & Support
            </Text>

            <View style={styles.preferencesGrid}>
              {supportItems.map((item) => (
                <PreferenceItem 
                  key={item.id}
                  icon={item.icon} 
                  label={item.title} 
                  onPress={item.onPress}
                />
              ))}
            </View>

            {/* Decorative background glow */}
            <View style={styles.decorativeGlow} />
          </View>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={["#FF5700", theme.primaryContainer]}
              style={styles.logoBox}
            >
              <Text style={styles.logoText}>{APP_NAME.charAt(0)}</Text>
            </LinearGradient>
            <Text style={styles.footerBrand}>{APP_NAME}</Text>
            <Text style={styles.footerVersion}>VERSION v1.0.0</Text>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const InfoRow = ({ label, value, icon, valueSpacing, iconColor, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container 
      style={styles.infoRow} 
      activeOpacity={0.7} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueSpacing && { letterSpacing: 4 }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <MaterialIcons
        name={icon}
        size={20}
        color={iconColor || theme.onSurfaceVariant}
      />
    </Container>
  );
};

const PreferenceItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.preferenceItem} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.preferenceIconBox}>
      <MaterialIcons name={icon} size={24} color={theme.primary} />
    </View>
    <Text style={styles.preferenceLabel}>{label}</Text>
  </TouchableOpacity>
);

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    // paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(245, 246, 247, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 227, 228, 0.5)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.onSurface,
    letterSpacing: -0.5,
  },
  headerButton: {
    padding: 10,
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 120, // Tab bar clearance
  },

  /* --- Profile Section --- */
  profileSection: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 40,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  imageRing: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: theme.surfaceLow,
    borderWidth: 4,
    borderColor: theme.surfaceLowest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  editImageBtnContainer: {
    position: "absolute",
    bottom: -4,
    right: -4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editImageBtn: {
    padding: 10,
    borderRadius: 16,
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 32,
    fontWeight: "900",
    color: theme.onSurface,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  profileSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.onSurfaceVariant,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  goldBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(165, 53, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(165, 53, 0, 0.2)",
    borderRadius: 20,
  },
  goldBadgeText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.surfaceHigh,
    borderRadius: 20,
  },
  serviceBadgeText: {
    color: theme.onSurface,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  /* --- Cards Grid --- */
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  cardsGridTablet: {
    justifyContent: "space-between",
  },
  cardHalf: {
    width: "48%", // For tablet view side-by-side
  },
  infoCard: {
    width: "100%",
    backgroundColor: theme.surfaceLowest,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(224, 227, 228, 0.5)",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.onSurface,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceLow,
    marginVertical: 16,
  },

  /* --- Editing Phone Styles --- */
  editPhoneContainer: {
    flexDirection: 'column',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: theme.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
    color: theme.onSurface,
    fontWeight: '600',
  },
  savePhoneBtn: {
    backgroundColor: theme.primary,
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  cancelPhoneBtn: {
    backgroundColor: theme.surfaceHigh,
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },

  /* --- Preferences / App & Support --- */
  preferencesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 2,
  },
  preferenceItem: {
    width: "48%", // 2 columns
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  preferenceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.onSurface,
    textAlign: "center",
  },
  decorativeGlow: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 200,
    height: 200,
    backgroundColor: "rgba(165, 53, 0, 0.05)",
    borderRadius: 100,
    zIndex: 1,
  },

  /* --- Footer --- */
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.onSurface,
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.onSurfaceVariant,
    letterSpacing: 2,
    opacity: 0.6,
  },
  signOutBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: theme.surfaceHigh,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "transparent",
  },
  signOutBtnText: {
    color: theme.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "bold",
  },
});
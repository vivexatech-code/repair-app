import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Original context and services
import { APP_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  useAppSettings,
  FALLBACK_SUPPORT_PHONE,
} from '../../context/AppSettingsContext';
import {
  subscribeCustomerProfile,
  updateCustomerProfile,
} from '../../services/customerService';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { uploadImageToCloudinary } from '../../services/mediaService';
import { openSupportEmail } from '../../utils/supportEmail';
import { openPhoneDialer } from '../../utils/phoneDial';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';
import { useGuestBrowse } from '../../context/GuestBrowseContext';
import { showAppToast } from '../../utils/appToast';
import { Button } from '../../components/Button';
import { Modal } from 'react-native';

const APP_LOGO = require('../../../assets/icon.png');

// Local theme object to replicate the target design's aesthetic
const theme = {
  surface: '#FFFFFF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F4F5F7',
  surfaceHigh: '#EAECEE',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#6C7278',
  primary: '#C45508',
  primaryContainer: '#FF8A3D',
  success: '#22c55e',
};

export function AccountScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { resolvedSupportEmail, resolvedSupportPhone } = useAppSettings();
  const { isGuestBrowse, promptLogin } = useGuestBrowse();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeCustomerProfile(
      user.uid,
      (data) => {
        setProfile(data);
        setNameDraft(data?.name || '');
        setEmailDraft(data?.email || '');
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  const bookingCount = profile?.totalBookings || 0;
  const savedAddressCount = useMemo(() => {
    const fromList = Array.isArray(profile?.addresses) ? profile.addresses.length : 0;
    if (fromList > 0) return fromList;
    const legacy = Array.isArray(profile?.savedAddresses)
      ? profile.savedAddresses.length
      : 0;
    if (legacy > 0) return legacy;
    const single = profile?.address != null && String(profile.address).trim() !== '';
    return single ? 1 : 0;
  }, [profile?.addresses, profile?.savedAddresses, profile?.address]);

  const onSaveName = async () => {
    if (!user?.uid) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSavingName(true);
    try {
      await updateCustomerProfile(user.uid, { name: trimmed });
      setProfile((prev) => ({ ...(prev || {}), name: trimmed }));
      setEditingName(false);
      showAppToast('Name saved');
    } catch (e) {
      Alert.alert('Update failed', e?.message || 'Could not update name.');
    } finally {
      setSavingName(false);
    }
  };

  const onSaveEmail = async () => {
    if (!user?.uid) return;
    const trimmed = emailDraft.trim().toLowerCase();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid email', 'Enter a valid email for invoices, or leave it blank.');
      return;
    }
    setSavingEmail(true);
    try {
      await updateCustomerProfile(user.uid, { email: trimmed });
      setProfile((prev) => ({ ...(prev || {}), email: trimmed }));
      setEditingEmail(false);
      showAppToast(trimmed ? 'Email saved' : 'Email removed');
    } catch (e) {
      Alert.alert('Update failed', e?.message || 'Could not update email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const onEditImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photos to change profile image.');
        return;
      }
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (pick.canceled || !pick.assets?.[0]?.uri) return;
      setUploadingImage(true);
      const imageUrl = await uploadImageToCloudinary(pick.assets[0].uri);
      if (!imageUrl) throw new Error('No image URL returned');
      await updateCustomerProfile(user.uid, { photoURL: imageUrl });
      setProfile((prev) => ({ ...(prev || {}), photoURL: imageUrl }));
    } catch {
      Alert.alert('Unavailable', 'Unable to upload profile image right now.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (!user && isGuestBrowse) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenContainer style={styles.screenInner}>
          <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons name="build" size={24} color={theme.primary} />
              <Text style={styles.headerTitle}>{APP_NAME}</Text>
            </View>
          </View>
          <View style={styles.guestBody}>
            <Image source={APP_LOGO} style={styles.guestLogo} resizeMode="contain" />
            <Text style={styles.guestTitle}>Sign in to manage your profile</Text>
            <Text style={styles.guestSubtitle}>
              You can browse services as a guest. Sign in to save addresses, book visits, and track
              appointments.
            </Text>
            <Button title="Sign in" onPress={() => promptLogin()} />
            <Text style={styles.guestHint}>
              New here? Sign in with your mobile number and OTP. A customer profile is created automatically.
            </Text>
          </View>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  const supportPhoneForDial = resolvedSupportPhone || FALLBACK_SUPPORT_PHONE;

  const supportItems = [
    {
      id: 'tickets',
      title: 'Help & Support',
      icon: 'support-agent',
      onPress: () => navigation.navigate('Support'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'email',
      title: 'Email Support',
      icon: 'email',
      onPress: async () => {
        const ok = await openSupportEmail({
          userName: profile?.name,
          userEmail: user?.email,
          supportAddress: resolvedSupportEmail,
        });
        if (!ok) {
          Alert.alert(
            'Email unavailable',
            `No mail app was found. Please email ${resolvedSupportEmail} from your browser.`,
          );
        }
      },
    },
    {
      id: 'call',
      title: 'Call Support',
      icon: 'phone',
      onPress: async () => {
        try {
          const result = await openPhoneDialer(supportPhoneForDial);
          if (!result?.ok) {
            Alert.alert(
              'Not available',
              'Calling is unavailable on this device.',
            );
          }
        } catch {
          Alert.alert(
            'Not available',
            `Could not open the phone app. Please call ${supportPhoneForDial}.`,
          );
        }
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenContainer style={styles.screenInner}>
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
        <SectionPromoBanner section="account" />

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.imageRing}>
              <Image
                source={
                  profile?.photoURL ? { uri: profile.photoURL } : APP_LOGO
                }
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
                {uploadingImage ? (
                  <SkeletonLoader width={16} height={16} borderRadius={8} />
                ) : (
                  <MaterialIcons name="edit" size={18} color="#ffffff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.name || 'User'}
            </Text>
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
          <View style={styles.profileLoading}>
            <SkeletonLoader width={140} height={14} borderRadius={999} />
          </View>
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

            {editingName ? (
              <View style={styles.editPhoneContainer}>
                <Text style={styles.infoLabel}>FULL NAME</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    style={styles.phoneInput}
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Your name"
                    placeholderTextColor={theme.onSurfaceVariant}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.savePhoneBtn}
                    onPress={onSaveName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <SkeletonLoader
                        width={16}
                        height={16}
                        borderRadius={8}
                        style={styles.phoneSaveLoading}
                      />
                    ) : (
                      <MaterialIcons name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelPhoneBtn}
                    onPress={() => {
                      setEditingName(false);
                      setNameDraft(profile?.name || '');
                    }}
                  >
                    <MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <InfoRow
                label="FULL NAME"
                value={profile?.name || 'Not set'}
                icon="edit"
                onPress={() => setEditingName(true)}
              />
            )}
            <View style={styles.divider} />

            {editingEmail ? (
              <View style={styles.editPhoneContainer}>
                <Text style={styles.infoLabel}>EMAIL ADDRESS</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    style={styles.phoneInput}
                    value={emailDraft}
                    onChangeText={setEmailDraft}
                    placeholder="For invoices (optional)"
                    placeholderTextColor={theme.onSurfaceVariant}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.savePhoneBtn}
                    onPress={onSaveEmail}
                    disabled={savingEmail}
                  >
                    {savingEmail ? (
                      <SkeletonLoader
                        width={16}
                        height={16}
                        borderRadius={8}
                        style={styles.phoneSaveLoading}
                      />
                    ) : (
                      <MaterialIcons name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelPhoneBtn}
                    onPress={() => {
                      setEditingEmail(false);
                      setEmailDraft(profile?.email || '');
                    }}
                  >
                    <MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <InfoRow
                label="EMAIL ADDRESS"
                value={profile?.email || user?.email || 'Not set'}
                icon="edit"
                onPress={() => setEditingEmail(true)}
              />
            )}
            <View style={styles.divider} />
            
            <InfoRow
              label="PHONE NUMBER"
              value={profile?.phone || user?.phoneNumber || 'Not set'}
            />
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
              onPress={() => {
                if (!user) {
                  promptLogin({ name: 'AddressList', params: { manageOnly: true } });
                  return;
                }
                navigation.navigate('AddressList', {
                  manageOnly: true,
                  addresses: Array.isArray(profile?.addresses) ? profile.addresses : [],
                });
              }}
            />
            <View style={styles.divider} />
            <InfoRow
              label="CURRENT LOCATION"
              value={profile?.address || "Not set"}
              icon="map"
              valueSpacing={false}
              multiline
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
            <Image source={APP_LOGO} style={styles.footerLogoImage} resizeMode="contain" />
            <Text style={styles.footerBrand}>{APP_NAME}</Text>
            <Text style={styles.footerVersion}>VERSION v1.0.0</Text>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const InfoRow = ({
  label,
  value,
  icon,
  valueSpacing,
  iconColor,
  onPress,
  multiline,
}) => {
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
        <Text
          style={[styles.infoValue, valueSpacing && { letterSpacing: 4 }]}
          numberOfLines={multiline ? 2 : 1}
        >
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
  screenInner: {
    flex: 1,
  },
  guestBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  guestLogo: {
    width: 88,
    height: 88,
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  guestSubtitle: {
    fontSize: 15,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  guestHint: {
    marginTop: 16,
    fontSize: 13,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
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
  },
  headerTitle: {
    fontSize: 20,
    marginLeft: 8,
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
    fontSize: 28,
    fontWeight: "900",
    color: theme.onSurface,
    marginBottom: 4,
    letterSpacing: -0.5,
    maxWidth: 280,
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
  },
  goldBadge: {
    marginRight: 8,
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
    marginLeft: 8,
  },
  cancelPhoneBtn: {
    backgroundColor: theme.surfaceHigh,
    marginLeft: 8,
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
  footerLogoImage: {
    width: 56,
    height: 56,
    marginBottom: 12,
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
  profileLoading: {
    marginBottom: 20,
    alignItems: 'center',
  },
  phoneSaveLoading: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
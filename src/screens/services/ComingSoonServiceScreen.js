import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';

import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';
import { db } from '../../services/firebase';
import { homeTheme } from '../../components/home/homeTheme';
import { bannerSectionsForComingSoon } from '../../constants/bannerSections';

export function ComingSoonServiceScreen({ route, navigation }) {
  const { serviceId } = route.params || {};
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!serviceId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'services', serviceId));
        if (active && snap.exists()) {
          setService({ id: snap.id, ...snap.data() });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [serviceId]);

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={homeTheme.primary} />
      </ScreenContainer>
    );
  }

  const img = service?.homeImage || service?.imageUrl || service?.image;
  const name = service?.name || service?.title || 'Service';

  return (
    <ScreenContainer style={styles.root}>
      <Header title="Coming Soon" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionPromoBanner section={bannerSectionsForComingSoon(service)} />
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            {img ? (
              <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="home-repair-service" size={48} color={homeTheme.primary} />
              </View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming Soon</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{name}</Text>

            <View style={styles.iconCircle}>
              <MaterialIcons name="schedule" size={48} color={homeTheme.primary} />
            </View>

            <Text style={styles.heading}>Coming Soon</Text>
            <Text style={styles.copy}>This service will be available soon.</Text>
            <Text style={styles.copy}>
              We&apos;re working hard to launch this service.{'\n'}
              Stay tuned for future updates.
            </Text>

            <Button title="Back to Home" onPress={() => navigation.navigate('MainTabs')} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: homeTheme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  imageWrap: { height: 220, backgroundColor: homeTheme.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: homeTheme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  body: { padding: 24, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: homeTheme.text, textAlign: 'center' },
  iconCircle: {
    marginTop: 24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: homeTheme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginTop: 20, fontSize: 18, fontWeight: '800', color: homeTheme.text },
  copy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: homeTheme.textMuted,
    textAlign: 'center',
  },
});

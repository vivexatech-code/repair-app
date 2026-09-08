import React, { useMemo } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { OptimizedImage } from '../OptimizedImage';
import { SkeletonLoader } from '../SkeletonLoader';
import { InlineSectionBanners } from '../InlineSectionBanners';
import { splitComingSoonByCategory } from '../../utils/comingSoonCategory';
import { getServicePriceListLabel } from '../../utils/serviceVariations';
import { DynamicHomeSections } from './DynamicHomeSections';
import { homeCardShadow, homeLayout, homeTheme } from './homeTheme';

const { pad, gap, sectionGap, categoryHeight, featuredCardW, featuredCardH } = homeLayout;

const WHY_CHOOSE = [
  { icon: 'verified-user', title: 'Verified Experts', desc: 'Background-checked professionals.' },
  { icon: 'schedule', title: 'On-Time Slots', desc: 'Book real-time availability.' },
  { icon: 'payments', title: 'Fair Pricing', desc: 'Upfront quotes, no surprises.' },
  { icon: 'support-agent', title: '24/7 Support', desc: 'Help whenever you need it.' },
];

const PROCESS_STEPS = [
  { step: '1', title: 'Choose', desc: 'Pick a service', icon: 'touch-app' },
  { step: '2', title: 'Schedule', desc: 'Select date & time', icon: 'event-available' },
  { step: '3', title: 'Relax', desc: 'Expert at your door', icon: 'home' },
  { step: '4', title: 'Pay & Rate', desc: 'Secure checkout', icon: 'star-rate' },
];

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CategoryCard({ cat, cardWidth, onPress }) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, friction: 7 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  };

  return (
    <Animated.View style={{ width: cardWidth, height: categoryHeight, transform: [{ scale }] }}>
      <Pressable
        style={[styles.cardBase, styles.categoryCard]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`Category ${cat.name}`}
      >
        <View style={styles.categoryImageWrap}>
          {cat.icon || cat.image ? (
            <OptimizedImage uri={cat.icon || cat.image} style={styles.imageFill} />
          ) : (
            <View style={styles.categoryPlaceholder}>
              <MaterialIcons name="home-repair-service" size={22} color={homeTheme.primary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(28,25,23,0.35)']}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        <View style={styles.categoryLabelWrap}>
          <Text style={styles.categoryLabel} numberOfLines={2}>
            {cat.name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function FeaturedCard({ svc, onPress }) {
  const priceLabel = getServicePriceListLabel(svc);
  return (
    <Pressable
      style={({ pressed }) => [styles.cardBase, styles.featuredCard, pressed && { opacity: 0.92 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Book ${svc.name}`}
    >
      <View style={styles.featuredImageWrap}>
        <OptimizedImage uri={svc.imageUrl || svc.image} style={styles.featuredImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.featuredGrad}
        />
        {priceLabel ? (
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{priceLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredName} numberOfLines={2}>
          {svc.name}
        </Text>
        <View style={styles.featuredCtaRow}>
          <Text style={styles.featuredCta}>Book now</Text>
          <MaterialIcons name="arrow-forward" size={14} color={homeTheme.primary} />
        </View>
      </View>
    </Pressable>
  );
}

function ComingSoonCard({ svc, onPress, badgeLabel = 'Coming Soon' }) {
  const image = svc.homeImage || svc.imageUrl || svc.image;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardBase,
        styles.featuredCard,
        styles.comingSoonCard,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.featuredImageWrap}>
        <OptimizedImage uri={image} style={styles.featuredImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.featuredGrad} />
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>{badgeLabel}</Text>
        </View>
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredName} numberOfLines={2}>
          {svc.name}
        </Text>
      </View>
    </Pressable>
  );
}

function catalogCols(width) {
  if (width < 420) return 2;
  if (width < 720) return 4;
  return 4;
}

function catalogColWidth(width) {
  const cols = catalogCols(width);
  return Math.max(0, Math.floor((width - pad * 2 - gap * (cols - 1)) / cols));
}

function HomeCatalogSkeleton({ width }) {
  const fourColWidth = catalogColWidth(width);
  return (
    <View style={styles.root}>
      <View style={styles.block}>
        <SkeletonLoader height={22} width="42%" borderRadius={8} style={{ marginBottom: 8 }} />
        <SkeletonLoader height={14} width="58%" borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={[styles.grid, { gap }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader
              key={`cat-sk-${i}`}
              height={categoryHeight}
              width={fourColWidth}
              borderRadius={14}
            />
          ))}
        </View>
      </View>
      <View style={styles.block}>
        <SkeletonLoader height={22} width="48%" borderRadius={8} style={{ marginBottom: 16 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader
              key={`svc-sk-${i}`}
              height={featuredCardH}
              width={featuredCardW}
              borderRadius={16}
              style={{ marginRight: gap }}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function HomeTrustFooter({ reviews, twoColWidth, onBookPress }) {
  return (
    <>
      <View style={styles.block}>
        <SectionHeader title="Why Repair Series" subtitle="Built for trust & convenience" />
        <View style={[styles.grid, { gap }]}>
          {WHY_CHOOSE.map((item) => (
            <View key={item.title} style={[styles.infoCard, { width: twoColWidth }]}>
              <View style={styles.infoIcon}>
                <MaterialIcons name={item.icon} size={20} color={homeTheme.primary} />
              </View>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="How It Works" subtitle="Book in under 2 minutes" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.processScroll}
        >
          {PROCESS_STEPS.map((p, i) => (
            <View key={p.step} style={styles.processCard}>
              <View style={styles.processIconWrap}>
                <MaterialIcons name={p.icon} size={20} color="#fff" />
              </View>
              <Text style={styles.processStep}>Step {p.step}</Text>
              <Text style={styles.processTitle}>{p.title}</Text>
              <Text style={styles.processDesc}>{p.desc}</Text>
              {i < PROCESS_STEPS.length - 1 ? (
                <MaterialIcons
                  name="arrow-forward"
                  size={16}
                  color={homeTheme.border}
                  style={styles.processArrow}
                />
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>

      {Array.isArray(reviews) && reviews.length > 0 && (
        <View style={styles.block}>
          <SectionHeader title="Customer Stories" subtitle="Real feedback from real homes" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reviewScroll}
          >
            {reviews.map((r, idx) => (
              <View key={`${r.name}-${idx}`} style={[styles.cardBase, styles.reviewCard]}>
                <View style={styles.reviewStars}>
                  {Array.from({ length: Math.min(5, Math.max(1, r.rating || 5)) }).map((_, i) => (
                    <MaterialIcons key={i} name="star" size={16} color={homeTheme.star} />
                  ))}
                </View>
                <Text style={styles.reviewText} numberOfLines={4}>
                  "{r.text}"
                </Text>
                <Text style={styles.reviewAuthor}>
                  {r.name}
                  {r.area ? ` · ${r.area}` : ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.ctaWrap}>
        <Pressable
          style={({ pressed }) => [styles.ctaCard, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={onBookPress}
        >
          <LinearGradient
            colors={homeTheme.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaIcon}>
              <MaterialIcons name="bolt" size={24} color="#fff" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.ctaTitle}>Ready to get started?</Text>
              <Text style={styles.ctaDesc}>Browse services and book your slot in minutes.</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={22} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );
}

export function HomePremiumSections({
  categories,
  services,
  comingSoon = [],
  reviews,
  loading = false,
  onCategoryPress,
  onServicePress,
  onBookPress,
  onSeeAllCategories,
  onSeeAllServices,
  onComingSoonPress,
  onOfferNavigate,
  onViewAllPath,
  sectionBanners = {},
  cmsSections = null,
  width,
}) {
  const fourColWidth = catalogColWidth(width);
  const twoColWidth = Math.max(0, Math.floor((width - pad * 2 - gap) / 2));

  const featured = useMemo(
    () => (services || []).filter((s) => s.featured || s.isFeatured).slice(0, 8),
    [services],
  );
  const popularServices = featured.length > 0 ? featured : (services || []).slice(0, 8);
  const trending = useMemo(() => (services || []).slice(0, 6), [services]);
  const popularCategories = (categories || []).slice(0, 8);
  const { main: comingSoonMain, commercial: comingSoonCommercial } = useMemo(
    () => splitComingSoonByCategory(comingSoon),
    [comingSoon],
  );

  if (loading) {
    return <HomeCatalogSkeleton width={width} />;
  }

  const useCms = Array.isArray(cmsSections) && cmsSections.length > 0;

  if (useCms) {
    return (
      <View style={styles.root}>
        <DynamicHomeSections
          sections={cmsSections}
          categories={categories}
          services={services}
          comingSoon={comingSoon}
          width={width}
          sectionBanners={sectionBanners}
          onOfferNavigate={onOfferNavigate}
          onCategoryPress={onCategoryPress}
          onServicePress={onServicePress}
          onComingSoonPress={onComingSoonPress}
          onSeeAllCategories={onSeeAllCategories}
          onSeeAllServices={onSeeAllServices}
          onViewAllPath={onViewAllPath}
        />
        <HomeTrustFooter
          reviews={reviews}
          twoColWidth={twoColWidth}
          onBookPress={onBookPress}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Categories */}
      {popularCategories.length > 0 && (
        <View style={styles.block}>
          <SectionHeader
            title="Browse Categories"
            subtitle="Find the right service for your home"
            actionLabel="See all"
            onAction={onSeeAllCategories}
          />
          <InlineSectionBanners
            banners={sectionBanners.categories}
            onNavigate={onOfferNavigate}
          />
          <View style={[styles.grid, { gap }]}>
            {popularCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                cardWidth={fourColWidth}
                onPress={() => onCategoryPress(cat)}
              />
            ))}
          </View>
        </View>
      )}

      {comingSoonMain.length > 0 && (
        <View style={styles.block}>
          <SectionHeader
            title="Coming Soon"
            subtitle="New home services launching shortly"
          />
          <InlineSectionBanners
            banners={[
              ...(sectionBanners.coming_soon_main || []),
              ...(sectionBanners.coming_soon || []),
            ]}
            onNavigate={onOfferNavigate}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
            decelerationRate="fast"
            snapToInterval={featuredCardW + gap}
            snapToAlignment="start"
          >
            {comingSoonMain.map((svc) => (
              <ComingSoonCard
                key={svc.id}
                svc={svc}
                badgeLabel="Coming Soon"
                onPress={() => onComingSoonPress?.(svc)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {comingSoonCommercial.length > 0 && (
        <View style={styles.block}>
          <SectionHeader
            title="Coming Soon for Business"
            subtitle="Business & commercial services launching soon"
          />
          <InlineSectionBanners
            banners={sectionBanners.coming_soon_commercial}
            onNavigate={onOfferNavigate}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
            decelerationRate="fast"
            snapToInterval={featuredCardW + gap}
            snapToAlignment="start"
          >
            {comingSoonCommercial.map((svc) => (
              <ComingSoonCard
                key={svc.id}
                svc={svc}
                badgeLabel="Coming Soon"
                onPress={() => onComingSoonPress?.(svc)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured — horizontal scroll */}
      {popularServices.length > 0 && (
        <View style={styles.block}>
          <SectionHeader
            title="Featured Services"
            subtitle="Hand-picked for quality & value"
            actionLabel="View all"
            onAction={onSeeAllServices}
          />
          <InlineSectionBanners
            banners={[
              ...(sectionBanners.featured || []),
              ...(sectionBanners.popular_services || []),
            ]}
            onNavigate={onOfferNavigate}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
            decelerationRate="fast"
            snapToInterval={featuredCardW + gap}
            snapToAlignment="start"
          >
            {popularServices.map((svc) => (
              <FeaturedCard key={svc.id} svc={svc} onPress={() => onServicePress(svc)} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <View style={styles.block}>
          <SectionHeader title="Trending Now" subtitle="Most booked this week" />
          <View style={styles.trendList}>
            {trending.map((svc, idx) => (
              <Pressable
                key={svc.id}
                style={({ pressed }) => [styles.trendRow, pressed && { opacity: 0.85 }]}
                onPress={() => onServicePress(svc)}
              >
                <View style={[styles.trendRank, idx < 3 && styles.trendRankTop]}>
                  <Text style={[styles.trendRankText, idx < 3 && styles.trendRankTextTop]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.trendThumb}>
                  <OptimizedImage uri={svc.imageUrl || svc.image} style={styles.imageFill} />
                </View>
                <View style={styles.trendInfo}>
                  <Text style={styles.trendName} numberOfLines={1}>
                    {svc.name}
                  </Text>
                  <Text style={styles.trendMeta} numberOfLines={1}>
                    {getServicePriceListLabel(svc) || 'View details'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={homeTheme.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <HomeTrustFooter
        reviews={reviews}
        twoColWidth={twoColWidth}
        onBookPress={onBookPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 24 },
  flex1: { flex: 1 },
  block: { marginBottom: sectionGap },

  trustStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: pad,
    marginBottom: sectionGap,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: homeTheme.surface,
    borderRadius: homeLayout.pad,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(2),
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: { fontSize: 12, fontWeight: '700', color: homeTheme.textSecondary },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: pad,
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: homeTheme.text,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 13,
    color: homeTheme.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: homeTheme.primary,
  },

  cardBase: {
    backgroundColor: homeTheme.surface,
    borderRadius: 16,
    ...homeCardShadow(2),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: pad },

  categoryCard: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
  },
  categoryImageWrap: { height: 56, backgroundColor: homeTheme.primarySoft },
  imageFill: { width: '100%', height: '100%' },
  categoryPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  categoryLabelWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: homeTheme.surface,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: homeTheme.text,
    textAlign: 'center',
    lineHeight: 14,
  },

  featuredScroll: { paddingHorizontal: pad, gap, paddingBottom: 4 },
  comingSoonCard: { opacity: 0.98 },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: homeTheme.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  comingSoonBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  featuredCard: {
    width: featuredCardW,
    height: featuredCardH,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    marginRight: gap,
  },
  featuredImageWrap: { height: 120, backgroundColor: homeTheme.surfaceMuted },
  featuredImage: { width: '100%', height: '100%' },
  featuredGrad: { ...StyleSheet.absoluteFillObject },
  pricePill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pricePillText: { fontSize: 11, fontWeight: '800', color: homeTheme.primary },
  featuredBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  featuredName: { fontSize: 14, fontWeight: '700', color: homeTheme.text, lineHeight: 18 },
  featuredCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  featuredCta: { fontSize: 12, fontWeight: '700', color: homeTheme.primary },

  trendList: { paddingHorizontal: pad, gap: 10 },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: homeTheme.surface,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(1),
  },
  trendRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: homeTheme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendRankTop: { backgroundColor: homeTheme.primarySoft },
  trendRankText: { fontSize: 13, fontWeight: '800', color: homeTheme.textMuted },
  trendRankTextTop: { color: homeTheme.primary },
  trendThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: homeTheme.surfaceMuted,
  },
  trendInfo: { flex: 1 },
  trendName: { fontSize: 15, fontWeight: '700', color: homeTheme.text },
  trendMeta: { fontSize: 12, color: homeTheme.textSecondary, marginTop: 2, fontWeight: '600' },

  infoCard: {
    backgroundColor: homeTheme.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(1),
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: homeTheme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: homeTheme.text, marginBottom: 4 },
  infoDesc: { fontSize: 12, color: homeTheme.textSecondary, lineHeight: 17 },

  processScroll: { paddingHorizontal: pad, gap: 12 },
  processCard: {
    width: 140,
    backgroundColor: homeTheme.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(1),
    marginRight: 12,
  },
  processIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: homeTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  processStep: { fontSize: 10, fontWeight: '700', color: homeTheme.primary, letterSpacing: 0.5 },
  processTitle: { fontSize: 14, fontWeight: '800', color: homeTheme.text, marginTop: 2 },
  processDesc: { fontSize: 11, color: homeTheme.textSecondary, marginTop: 4 },
  processArrow: { position: 'absolute', right: -18, top: '45%' },

  reviewScroll: { paddingHorizontal: pad, gap: 12 },
  reviewCard: {
    width: 280,
    padding: 18,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    marginRight: 12,
  },
  reviewStars: { flexDirection: 'row', gap: 2, marginBottom: 12 },
  reviewText: { fontSize: 14, color: homeTheme.text, lineHeight: 22, fontStyle: 'italic' },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: homeTheme.textSecondary, marginTop: 14 },

  ctaWrap: { paddingHorizontal: pad, marginTop: 8 },
  ctaCard: { borderRadius: 20, overflow: 'hidden', ...homeCardShadow(4) },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 22,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  ctaDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '500' },
});

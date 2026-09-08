import React, { useMemo } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { OptimizedImage } from '../OptimizedImage';
import { InlineSectionBanners } from '../InlineSectionBanners';
import { getServicePriceListLabel } from '../../utils/serviceVariations';
import { resolveHomeSectionItems } from '../../utils/homeSectionItems';
import {
  bannerSectionsForHomeCmsSection,
  bannersForSectionKeys,
} from '../../constants/bannerSections';
import { homeCardShadow, homeLayout, homeTheme } from './homeTheme';

const { pad, gap, sectionGap, categoryHeight, featuredCardW, featuredCardH } = homeLayout;

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
  return (
    <View style={{ width: cardWidth, height: categoryHeight }}>
      <Pressable
        style={[styles.cardBase, styles.categoryCard]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Category ${cat.name}`}
      >
        <View style={styles.categoryImageWrap}>
          {cat.icon || cat.image ? (
            <OptimizedImage uri={cat.icon || cat.image} style={styles.imageFill} />
          ) : (
            <View style={styles.categoryPlaceholder}>
              <MaterialIcons name="home-repair-service" size={20} color={homeTheme.primary} />
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
    </View>
  );
}

function ServiceSliderCard({ svc, onPress, badgeLabel }) {
  const priceLabel = getServicePriceListLabel(svc);
  const image = svc.homeImage || svc.imageUrl || svc.image;
  return (
    <Pressable
      style={({ pressed }) => [styles.cardBase, styles.featuredCard, pressed && { opacity: 0.92 }]}
      onPress={onPress}
    >
      <View style={styles.featuredImageWrap}>
        <OptimizedImage uri={image} style={styles.featuredImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.featuredGrad} />
        {badgeLabel ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
        {!badgeLabel && priceLabel ? (
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{priceLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredName} numberOfLines={2}>
          {svc.name}
        </Text>
        {!badgeLabel ? (
          <View style={styles.featuredCtaRow}>
            <Text style={styles.featuredCta}>Book now</Text>
            <MaterialIcons name="arrow-forward" size={14} color={homeTheme.primary} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function openLink(link) {
  const url = String(link || '').trim();
  if (!url) return;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    Linking.openURL(url).catch(() => {});
    return;
  }
}

function comingSoonBadge(section) {
  const mode = String(section.selectionMode || '');
  if (mode === 'coming_soon_main') return 'Coming Soon';
  if (mode === 'coming_soon_commercial') return 'Coming Soon';
  if (mode === 'coming_soon') return 'Coming Soon';
  return null;
}

function isComingSoonMode(section) {
  return String(section.selectionMode || '').startsWith('coming_soon');
}

export function DynamicHomeSections({
  sections = [],
  categories,
  services,
  comingSoon = [],
  width,
  onCategoryPress,
  onServicePress,
  onComingSoonPress,
  onSeeAllCategories,
  onSeeAllServices,
  onViewAllPath,
  onOfferNavigate,
  sectionBanners = {},
}) {
  const catalog = useMemo(
    () => ({ categories, services, comingSoon }),
    [categories, services, comingSoon],
  );

  if (!sections.length) return null;

  return (
    <View style={styles.root}>
      {sections.map((section) => {
        if (section.layout === 'static' || section.contentType === 'static') {
          return (
            <View key={section.id} style={styles.block}>
              <SectionHeader title={section.title} subtitle={section.subtitle} />
              <View style={styles.staticCard}>
                {section.staticImage ? (
                  <OptimizedImage uri={section.staticImage} style={styles.staticImage} />
                ) : null}
                {section.staticBody ? (
                  <Text style={styles.staticBody}>{section.staticBody}</Text>
                ) : null}
                {section.staticCtaLabel ? (
                  <Pressable
                    style={styles.staticCta}
                    onPress={() => {
                      const link = section.staticCtaLink || '';
                      if (link.startsWith('/')) onViewAllPath?.(link);
                      else openLink(link);
                    }}
                  >
                    <Text style={styles.staticCtaText}>{section.staticCtaLabel}</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }

        const items = resolveHomeSectionItems(section, catalog);
        if (!items.length) return null;

        const columns = Math.min(4, Math.max(1, Number(section.columns) || 4));
        const colGaps = Math.max(0, columns - 1);
        const cardWidth = Math.max(
          0,
          Math.floor((width - pad * 2 - gap * colGaps) / columns),
        );
        const badge = comingSoonBadge(section);
        const onItemPress = (item) => {
          if (section.contentType === 'categories') {
            onCategoryPress?.(item);
            return;
          }
          if (isComingSoonMode(section) || String(item.status) === 'Coming Soon') {
            onComingSoonPress?.(item);
            return;
          }
          onServicePress?.(item);
        };

        const onViewAll = () => {
          if (section.viewAllPath) {
            onViewAllPath?.(section.viewAllPath);
            return;
          }
          if (section.contentType === 'categories') onSeeAllCategories?.();
          else onSeeAllServices?.();
        };

        return (
          <View key={section.id} style={styles.block}>
            <SectionHeader
              title={section.title}
              subtitle={section.subtitle}
              actionLabel={section.showViewAll ? 'See all' : undefined}
              onAction={section.showViewAll ? onViewAll : undefined}
            />
            <InlineSectionBanners
              banners={bannersForSectionKeys(
                sectionBanners,
                bannerSectionsForHomeCmsSection(section),
              )}
              onNavigate={onOfferNavigate}
            />

            {section.layout === 'list' ? (
              <View style={styles.trendList}>
                {items.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.trendRow, pressed && { opacity: 0.85 }]}
                    onPress={() => onItemPress(item)}
                  >
                    <View style={[styles.trendRank, idx < 3 && styles.trendRankTop]}>
                      <Text style={[styles.trendRankText, idx < 3 && styles.trendRankTextTop]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={styles.trendThumb}>
                      <OptimizedImage
                        uri={
                          section.contentType === 'categories'
                            ? item.icon || item.image
                            : item.imageUrl || item.image
                        }
                        style={styles.imageFill}
                      />
                    </View>
                    <View style={styles.trendInfo}>
                      <Text style={styles.trendName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.trendMeta} numberOfLines={1}>
                        {section.contentType === 'services'
                          ? getServicePriceListLabel(item) || 'View details'
                          : 'Browse services'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={homeTheme.textMuted} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {section.layout === 'slider' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredScroll}
                decelerationRate="fast"
                snapToInterval={featuredCardW + gap}
                snapToAlignment="start"
              >
                {items.map((item) =>
                  section.contentType === 'categories' ? (
                    <View key={item.id} style={{ marginRight: gap }}>
                      <CategoryCard
                        cat={item}
                        cardWidth={Math.min(featuredCardW, cardWidth || featuredCardW)}
                        onPress={() => onItemPress(item)}
                      />
                    </View>
                  ) : (
                    <ServiceSliderCard
                      key={item.id}
                      svc={item}
                      badgeLabel={badge}
                      onPress={() => onItemPress(item)}
                    />
                  ),
                )}
              </ScrollView>
            ) : null}

            {section.layout === 'grid' ? (
              <View style={[styles.grid, { gap }]}>
                {items.map((item) =>
                  section.contentType === 'categories' ? (
                    <CategoryCard
                      key={item.id}
                      cat={item}
                      cardWidth={cardWidth}
                      onPress={() => onItemPress(item)}
                    />
                  ) : (
                    <Pressable
                      key={item.id}
                      style={[styles.cardBase, styles.gridServiceCard, { width: cardWidth }]}
                      onPress={() => onItemPress(item)}
                    >
                      <View style={styles.gridServiceImage}>
                        <OptimizedImage
                          uri={item.homeImage || item.imageUrl || item.image}
                          style={styles.imageFill}
                        />
                      </View>
                      <Text style={styles.gridServiceName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 8 },
  block: { marginBottom: sectionGap },
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
  sectionAction: { fontSize: 13, fontWeight: '700', color: homeTheme.primary },
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
  gridServiceCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    marginBottom: 2,
  },
  gridServiceImage: { height: 88, backgroundColor: homeTheme.surfaceMuted },
  gridServiceName: {
    fontSize: 12,
    fontWeight: '700',
    color: homeTheme.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  staticCard: {
    marginHorizontal: pad,
    backgroundColor: homeTheme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
    ...homeCardShadow(1),
    gap: 12,
  },
  staticImage: { width: '100%', height: 140, borderRadius: 12 },
  staticBody: { fontSize: 14, lineHeight: 21, color: homeTheme.textSecondary, fontWeight: '500' },
  staticCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: homeTheme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  staticCtaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

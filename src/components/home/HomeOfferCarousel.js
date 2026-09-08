import React, { memo, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
} from "react-native-reanimated";
import { OptimizedImage } from "../OptimizedImage";

import { homeTheme } from "./homeTheme";

const BANNER_HEIGHT = 188;
const INSET = 20;
const AUTO_PLAY_MS = 4000;
const SCROLL_MS = 500;
const DOT_ACTIVE = homeTheme.primary;
const DOT_INACTIVE = "#E7E5E4";

const springCfg = { damping: 18, stiffness: 220, mass: 0.45 };

function OfferDot({ index, activeIndexSV }) {
  const w = useSharedValue(index === 0 ? 24 : 6);
  const o = useSharedValue(index === 0 ? 1 : 0.4);

  useAnimatedReaction(
    () => activeIndexSV.value,
    (active) => {
      const on = index === active;
      w.value = withSpring(on ? 24 : 6, springCfg);
      o.value = withSpring(on ? 1 : 0.4, springCfg);
    },
    [index],
  );

  const style = useAnimatedStyle(
    () => ({
      width: w.value,
      opacity: o.value,
      backgroundColor: index === activeIndexSV.value ? DOT_ACTIVE : DOT_INACTIVE,
    }),
    [index],
  );
  return <Animated.View style={[styles.dotBase, style]} />;
}

const OfferBannerCard = memo(function OfferBannerCard({
  item,
  cardWidth,
  onPress,
}) {
  const image = item?.image || item?.imageUrl;

  return (
    <TouchableOpacity
      style={[styles.cardWrap, { width: cardWidth }]}
      activeOpacity={0.95}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Promotional banner"
    >
      <View style={styles.imageBox}>
        {image ? (
          <OptimizedImage
            uri={image}
            width={1000}
            height={500}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            priority="normal"
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: homeTheme.surfaceMuted }]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
});

/**
 * Parallax offer carousel: loop, built-in auto-play, scale on side slides, spring pagination dots.
 */
export const HomeOfferCarousel = memo(function HomeOfferCarousel({
  offers,
  width,
  onOfferNavigate,
}) {
  const cardW = Math.max(0, width - INSET * 2);
  const activeIndexSV = useSharedValue(0);
  const list = Array.isArray(offers)
    ? offers.filter((o) => o?.image || o?.imageUrl)
    : [];
  const realLen = list.length;

  useEffect(() => {
    activeIndexSV.value = 0;
  }, [activeIndexSV, realLen, width]);

  const onSnap = useCallback(
    (i) => {
      const len = list.length;
      if (len <= 0) return;
      const n = ((i % len) + len) % len;
      activeIndexSV.value = n;
    },
    [activeIndexSV, list.length],
  );

  const handlePress = useCallback(
    (item) => {
      const link = String(item?.redirectLink || item?.link || "").trim();
      if (link.startsWith("http")) {
        Linking.openURL(link).catch(() => {});
        return;
      }
      if (item?.serviceId) {
        onOfferNavigate("ServiceDetails", { serviceId: item.serviceId });
      } else {
        onOfferNavigate("Services");
      }
    },
    [onOfferNavigate],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View
        style={[styles.slide, { width }]}
        accessibilityLabel="Promotional banner"
      >
        <View
          style={{
            width,
            paddingHorizontal: INSET,
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <OfferBannerCard
            item={item}
            cardWidth={cardW}
            onPress={() => handlePress(item)}
          />
        </View>
      </View>
    ),
    [cardW, width, handlePress],
  );

  if (list.length === 0) {
    return null;
  }

  return (
    <View style={styles.section} accessibilityLabel="Promotional offers">
      <Carousel
        width={width}
        height={BANNER_HEIGHT + 2}
        data={list}
        loop={list.length > 1}
        autoPlay={list.length > 1}
        autoPlayInterval={AUTO_PLAY_MS}
        scrollAnimationDuration={SCROLL_MS}
        defaultIndex={0}
        withAnimation={{ type: "timing", config: { duration: SCROLL_MS } }}
        style={styles.carousel}
        windowSize={Math.min(7, list.length + 2)}
        pagingEnabled
        snapEnabled
        mode="parallax"
        modeConfig={{
          parallaxScrollingOffset: 56,
          parallaxScrollingScale: 0.92,
          parallaxAdjacentItemScale: 0.88,
        }}
        onSnapToItem={onSnap}
        onConfigurePanGesture={(g) => {
          "worklet";
          g.activeOffsetX([-10, 10]);
        }}
        renderItem={renderItem}
      />

      {list.length > 1 && (
        <View style={styles.dotsRow} accessibilityLabel="Offer pagination">
          {list.map((o, i) => (
            <OfferDot
              key={o?.id ?? `dot-${i}`}
              index={i}
              activeIndexSV={activeIndexSV}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    width: "100%",
    marginBottom: 10,
  },
  carousel: {
    alignSelf: "center",
  },
  slide: {
    flex: 1,
  },
  cardWrap: {
    height: BANNER_HEIGHT,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#080F1C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  imageBox: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: homeTheme.surface,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  dotBase: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
});

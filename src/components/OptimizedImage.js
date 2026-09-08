import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { optimizeCloudinaryUrl } from '../utils/cloudinary';

/**
 * Cached images with Cloudinary-friendly resizing. Shows a lightweight skeleton until load.
 */
export function OptimizedImage({
  uri,
  width,
  height,
  style,
  contentFit = 'cover',
  priority = 'normal',
  placeholderColor = '#e5e7eb',
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const optimized = uri ? optimizeCloudinaryUrl(uri, { width, height }) : null;

  if (!optimized) {
    return <View style={[style, { backgroundColor: placeholderColor }]} />;
  }

  return (
    <View style={style}>
      {!loaded ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: placeholderColor },
          ]}
        />
      ) : null}
      <Image
        source={{ uri: optimized }}
        style={[StyleSheet.absoluteFillObject, { opacity: loaded ? 1 : 0 }]}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        priority={priority}
        transition={180}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </View>
  );
}

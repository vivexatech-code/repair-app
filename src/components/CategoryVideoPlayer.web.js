import React from 'react';
import { StyleSheet, View } from 'react-native';
import { shouldShowCategoryVideo } from '../utils/categoryVideo';

export function CategoryVideoPlayer({ category }) {
  if (!shouldShowCategoryVideo(category)) return null;
  const uri = String(category.videoUrl || '').trim();
  if (!uri) return null;

  return (
    <View style={styles.wrap}>
      <video
        src={uri}
        style={styles.video}
        autoPlay
        muted
        loop
        playsInline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
});

import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { shouldShowCategoryVideo } from '../utils/categoryVideo';

let VideoCmp = null;
let ResizeMode = { COVER: 'cover' };
try {
  const av = require('expo-av');
  VideoCmp = av.Video;
  ResizeMode = av.ResizeMode || ResizeMode;
} catch {
  VideoCmp = null;
}

export function CategoryVideoPlayer({ category }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  if (!shouldShowCategoryVideo(category) || !VideoCmp || failed) return null;

  return (
    <View style={styles.wrap}>
      <VideoCmp
        ref={ref}
        source={{ uri: String(category.videoUrl).trim() }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        playsInSilentModeIOS
        onError={() => setFailed(true)}
        usePoster={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginBottom: 12,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

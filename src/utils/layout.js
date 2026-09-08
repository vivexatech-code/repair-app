import { Platform, useWindowDimensions } from 'react-native';

export const WEB_PAGE_BG = '#E8E4DF';
export const WEB_FRAME_MAX = 1100;
export const WEB_NARROW_MAX = 720;
export const WEB_BREAKPOINT = 768;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isNarrow = width < WEB_BREAKPOINT;
  const isWide = isWeb && width >= WEB_BREAKPOINT;
  const frameMax = isWide ? WEB_FRAME_MAX : isWeb ? Math.min(width, WEB_NARROW_MAX) : width;
  return { width, height, isWeb, isNarrow, isWide, frameMax };
}

export function injectWebDocumentStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('rs-web-root-css')) return;

  const style = document.createElement('style');
  style.id = 'rs-web-root-css';
  style.textContent = `
    html, body { height: 100%; margin: 0; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      background: ${WEB_PAGE_BG};
      overflow: auto;
    }
    #root, #main {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      min-height: 100dvh;
    }
    textarea, input, button { font-family: inherit; }
    * { box-sizing: border-box; }
    a, button, [role="button"], [tabindex="0"] { cursor: pointer; }
  `;
  document.head.appendChild(style);
  if (!document.title || document.title === 'repair-series') {
    document.title = 'Repair Series';
  }
}

import { useState, useCallback, useEffect } from 'react';

// Helper to detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOSKeyboardVisible, setIsIOSKeyboardVisible] = useState(false);

  // Handle iOS keyboard visibility
  useEffect(() => {
    if (isIOS && isFullscreen) {
      const handleResize = () => {
        const keyboardHeight = window.innerHeight - window.visualViewport?.height;
        setIsIOSKeyboardVisible(keyboardHeight > 100);
      };

      window.visualViewport?.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, [isFullscreen]);

  const handleFullscreenChange = useCallback(() => {
    if (!isIOS) {
      setIsFullscreen(document.fullscreenElement !== null);
    }
  }, []);

  useEffect(() => {
    if (!isIOS) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }
  }, [handleFullscreenChange]);

  const toggleFullscreen = useCallback(() => {
    if (isIOS) {
      // For iOS, just toggle the state
      setIsFullscreen(!isFullscreen);
    } else {
      // For other devices, use the Fullscreen API
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`);
        });
      }
    }
  }, [isFullscreen]);

  return { isFullscreen, toggleFullscreen, isIOS, isIOSKeyboardVisible };
}; 

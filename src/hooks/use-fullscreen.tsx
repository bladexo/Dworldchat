import { useState, useCallback, useEffect } from 'react';

// Helper to detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      // For iOS, we'll use our custom fullscreen mode
      setIsFullscreen(!isFullscreen);
      // Apply iOS-specific body styles
      if (!isFullscreen) {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.overflow = '';
      }
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

  return { isFullscreen, toggleFullscreen, isIOS };
}; 

import * as React from "react"

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`)
      })
    }
  }, [])

  // Update fullscreen state when it changes outside our control
  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  return {
    isFullscreen,
    toggleFullscreen
  }
}
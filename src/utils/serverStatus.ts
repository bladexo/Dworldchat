/**
 * Server Status Utility
 * Helps check if the chat server is online and responding correctly
 */

// Get the appropriate server URL from env or default to localhost
const SERVER_URL = import.meta.env.PROD 
  ? 'https://charming-romola-dinno-3c220cbb.koyeb.app'
  : (import.meta.env.VITE_SERVER_URL || 'http://localhost:8000');

// Define status result type for reuse
export type ServerStatusResult = {
  online: boolean;
  serverTime?: string;
  error?: string;
  latency?: number;
};

/**
 * Check if the server is online and responding
 * @returns Promise that resolves to a status object
 */
export async function checkServerStatus(): Promise<ServerStatusResult> {
  try {
    const startTime = Date.now();
    const response = await fetch(`${SERVER_URL}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Short timeout to avoid blocking the UI
      signal: AbortSignal.timeout(5000)
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        serverTime: data.serverTime || new Date().toISOString(),
        latency
      };
    } else {
      return {
        online: false,
        error: `Server responded with status ${response.status}`,
        latency
      };
    }
  } catch (error) {
    console.error('Server status check failed:', error);
    return {
      online: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a status check service that periodically checks if the server is up
 * @param intervalMs How often to check in milliseconds
 * @param callback Function to call with status results
 * @returns Control object with start/stop methods
 */
export function createStatusMonitor(
  intervalMs = 30000,
  callback: (status: ServerStatusResult) => void
) {
  let intervalId: number | null = null;
  
  const check = async (): Promise<ServerStatusResult> => {
    const status = await checkServerStatus();
    callback(status);
    return status;
  };
  
  return {
    start: () => {
      // Run once immediately
      check();
      // Then start interval
      intervalId = window.setInterval(check, intervalMs);
    },
    stop: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    checkNow: check
  };
} 

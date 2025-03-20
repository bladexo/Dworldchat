
// Prefixes, suffixes, and random words for username generation
const prefixes = [
  'cyber', 'hack', 'ghost', 'shadow', 'phantom', 'crypto', 'byte', 'data',
  'zero', 'glitch', 'pixel', 'neo', 'anon', 'binary', 'quantum', 'void',
  'stealth', 'wire', 'flux', 'virtual', 'cipher', 'dark', 'net', 'code',
  'matrix', 'pulse', 'system', 'rogue', 'tech', 'echo', 'proxy'
];

const suffixes = [
  'runner', 'hacker', 'agent', 'phantom', 'ninja', 'ghost', 'coder', 'mind',
  'wraith', 'shadow', 'walker', 'breaker', 'master', 'punk', 'script', 'ware',
  'byte', 'node', 'frame', 'hunter', 'reaper', 'protocol', 'net', 'dev',
  'wizard', 'bot', 'spark', 'logic', 'spec', 'riot'
];

// Get a random element from an array
const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate a random number between min and max (inclusive)
const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generates a hacker-style username
 */
export const generateUsername = (): string => {
  const usePrefix = Math.random() > 0.2; // 80% chance to use prefix
  const useSuffix = Math.random() > 0.3; // 70% chance to use suffix
  const useNumber = Math.random() > 0.5; // 50% chance to add a number
  
  let username = '';
  
  // Add prefix
  if (usePrefix) {
    username += getRandomElement(prefixes);
  } else {
    // If no prefix, force a suffix
    username += getRandomElement(suffixes);
  }
  
  // Add suffix if needed
  if (useSuffix && usePrefix) {
    username += getRandomElement(suffixes);
  }
  
  // Add random number
  if (useNumber) {
    username += getRandomNumber(0, 999);
  }
  
  return username;
};

/**
 * Generate a random hex color that's bright enough to be visible
 */
export const generateUserColor = (): string => {
  const colors = [
    '#39ff14', // neon green
    '#0ef',    // neon blue
    '#f0f',    // neon purple
    '#ff3636', // neon red
    '#ffde59', // neon yellow
    '#ff9f1c', // neon orange
    '#00e5ff', // cyan
    '#ff0080', // pink
  ];
  
  return getRandomElement(colors);
};

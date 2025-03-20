export const CHUNK_SIZE = 100000; // 100KB chunks

export const chunkImage = (base64: string): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

export const assembleImage = (chunks: string[]): string => {
  return chunks.join('');
}; 
import { Buffer } from 'buffer';

// Make Buffer globally available for ethers and other crypto libraries
if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
}

// Also make it available on window for web environments
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).Buffer = Buffer;
}
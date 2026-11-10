import PocketBase from 'pocketbase';

// Dynamically match the database host to the current browser hostname
// Map 'localhost' to '127.0.0.1' to avoid IPv6 [::1] connection issues on Windows
const hostname = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname)
  : '127.0.0.1';

const pbHost = `http://${hostname}:8090`;

const pb = new PocketBase(pbHost);

export default pb;
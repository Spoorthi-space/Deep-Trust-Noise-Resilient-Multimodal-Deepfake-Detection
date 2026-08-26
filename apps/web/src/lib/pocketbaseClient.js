import PocketBase from 'pocketbase';

// Dynamically match the database host to the current browser hostname
// This avoids CORS, IPv6 [::1], and local network access connection blocks.
const pbHost = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:8090`
  : 'http://127.0.0.1:8090';

const pb = new PocketBase(pbHost);

export default pb;
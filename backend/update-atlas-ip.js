/**
 * update-atlas-ip.js
 * ------------------
 * Automatically adds your current public IP to MongoDB Atlas IP Access List.
 *
 * SETUP:
 *   1. npm install axios
 *   2. Fill in the CONFIG section below
 *   3. Run:  node update-atlas-ip.js
 *
 * OPTIONAL - run automatically on system startup:
 *   Windows Task Scheduler → trigger: "At log on" → action: node path\to\update-atlas-ip.js
 */

import axios from 'axios';

// ═══════════════════════════════════════════════════════
//  CONFIG — fill these in once
// ═══════════════════════════════════════════════════════
const CONFIG = {
  // Atlas API public key  (Atlas UI → Access Manager → API Keys)
  publicKey:  'YOUR_ATLAS_PUBLIC_KEY',

  // Atlas API private key
  privateKey: 'YOUR_ATLAS_PRIVATE_KEY',

  // Your Atlas Project ID  (Atlas UI → Project Settings → Project ID)
  projectId:  'YOUR_PROJECT_ID',

  // Comment attached to the IP entry so you can identify it
  comment: 'Auto-added by update-atlas-ip script',

  // How many previous entries with this comment to clean up (0 = keep all)
  cleanupOldEntries: true,
};
// ═══════════════════════════════════════════════════════

const BASE_URL = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${CONFIG.projectId}/accessList`;

const auth = {
  username: CONFIG.publicKey,
  password: CONFIG.privateKey,
};

async function getCurrentIP() {
  const res = await axios.get('https://api.ipify.org?format=json');
  return res.data.ip;
}

async function getExistingEntries() {
  const res = await axios.get(BASE_URL, { auth, params: { itemsPerPage: 100 } });
  return res.data.results || [];
}

async function deleteEntry(cidrBlock) {
  const encoded = encodeURIComponent(cidrBlock);
  await axios.delete(`${BASE_URL}/${encoded}`, { auth });
  console.log(`🗑️  Deleted old entry: ${cidrBlock}`);
}

async function addIP(ip) {
  const entry = [{ ipAddress: ip, comment: CONFIG.comment }];
  await axios.post(BASE_URL, entry, { auth });
  console.log(`✅ Added IP: ${ip}`);
}

async function run() {
  try {
    console.log('🔍 Fetching current public IP...');
    const currentIP = await getCurrentIP();
    console.log(`📍 Current IP: ${currentIP}`);

    if (CONFIG.cleanupOldEntries) {
      console.log('🔍 Checking for old auto-added entries...');
      const existing = await getExistingEntries();
      const old = existing.filter(e => e.comment === CONFIG.comment && !e.ipAddress?.startsWith(currentIP));
      for (const entry of old) {
        await deleteEntry(entry.cidrBlock || entry.ipAddress + '/32');
      }
    }

    console.log('➕ Adding current IP to Atlas Access List...');
    await addIP(currentIP);
    console.log('🎉 Done! You can now connect to your Atlas cluster.');

  } catch (err) {
    const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
    if (err.response?.status === 409) {
      console.log(`ℹ️  IP already in access list — nothing to do.`);
    } else {
      console.error('❌ Error:', msg);
      process.exit(1);
    }
  }
}

run();
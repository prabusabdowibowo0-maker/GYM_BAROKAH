// ============================================================
//  SUPABASE CONFIG — Barokah GYM (Robust Version)
// ============================================================

const SUPABASE_URL = 'https://crvoayijouaekggqkeup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydm9heWlqb3VhZWtnZ3FrZXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzczNTEsImV4cCI6MjA5NjIxMzM1MX0.d3HvyUEk3d0vnDJOqIKE8eyAaX9_q_5n__hKNpQONUU';

let sb = null;

// Init with retry — wait for CDN to load
async function initSupabase(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Supabase] Connected!');
      return sb;
    }
    console.log(`[Supabase] Waiting for CDN... attempt ${i + 1}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.error('[Supabase] CDN failed to load after retries');
  return null;
}

// Fetch with timeout (5 seconds)
async function fetchWithTimeout(queryFn, timeoutMs = 5000) {
  if (!sb) return { data: null, error: 'Not connected' };
  return Promise.race([
    queryFn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
  ]).catch(err => ({ data: null, error: err.message }));
}

// ============================================================
//  DATA FETCHERS
// ============================================================

async function getPaketMembership() {
  const { data, error } = await fetchWithTimeout(() =>
    sb.from('paket_membership').select('*').eq('is_aktif', true).order('harga')
  );
  if (error || !data) { console.warn('[Supabase] Gagal ambil paket:', error); return null; }
  return data;
}

async function getTrainers() {
  const { data, error } = await fetchWithTimeout(() =>
    sb.from('personal_trainer').select('*').eq('is_tersedia', true).order('id_trainer')
  );
  if (error || !data) { console.warn('[Supabase] Gagal ambil trainer:', error); return null; }
  return data;
}

async function getJamOperasional() {
  const { data, error } = await fetchWithTimeout(() =>
    sb.from('jam_operasional').select('*').order('id')
  );
  if (error || !data) { console.warn('[Supabase] Gagal ambil jam:', error); return null; }
  return data;
}

async function getKelasGrup() {
  const { data, error } = await fetchWithTimeout(() =>
    sb.from('kelas_grup').select('*, personal_trainer(nama)').eq('is_aktif', true).order('jam_mulai')
  );
  if (error || !data) { console.warn('[Supabase] Gagal ambil kelas:', error); return null; }
  return data;
}

async function getStats() {
  if (!sb) return null;
  try {
    const [members, trainers] = await Promise.all([
      sb.from('member').select('id_member', { count: 'exact', head: true }).eq('status', 'aktif'),
      sb.from('personal_trainer').select('id_trainer', { count: 'exact', head: true }).eq('is_tersedia', true)
    ]);
    return { memberAktif: members.count || 0, jumlahTrainer: trainers.count || 0 };
  } catch (e) { return null; }
}

// ============================================================
//  DATA WRITERS
// ============================================================

async function simpanMemberBaru(data) {
  if (!sb) return null;
  const { data: result, error } = await sb.from('member').insert([data]).select();
  if (error) { console.error('Insert member error:', error); return null; }
  return result?.[0] || null;
}

async function simpanPendaftaran(data) {
  if (!sb) return null;
  const { data: result, error } = await sb.from('pendaftaran_membership').insert([data]).select();
  if (error) { console.error('Insert pendaftaran error:', error); return null; }
  return result?.[0] || null;
}

// ============================================================
//  UTILITIES
// ============================================================

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
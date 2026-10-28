import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #F7F3EC;
    --ink: #1A1A1A;
    --ink-soft: #4A4A4A;
    --ink-muted: #8A8A8A;
    --sage: #4A7C59;
    --sage-light: #EAF2ED;
    --sage-dark: #2F5239;
    --terracotta: #C0603A;
    --terracotta-light: #FAF0EB;
    --sky: #3A6B9F;
    --sky-light: #EAF1F8;
    --amber: #C08A2A;
    --amber-light: #FBF5E6;
    --border: #E2DDD4;
    --card-bg: #FFFFFF;
    --shadow: 0 2px 12px rgba(26,26,26,0.08);
    --shadow-lg: 0 8px 40px rgba(26,26,26,0.12);
    --radius: 12px;
    --radius-sm: 8px;
    font-family: 'DM Sans', sans-serif;
  }

  body {
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
  }

  /* ── NAV ── */
  .nav {
    background: var(--ink);
    padding: 0 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-logo {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--cream);
    letter-spacing: -0.3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nav-logo span { color: #7FC99A; }
  .nav-links { display: flex; gap: 4px; align-items: center; }
  .nav-btn {
    background: none;
    border: none;
    color: #AAAAAA;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.2px;
  }
  .nav-btn:hover { color: var(--cream); background: rgba(255,255,255,0.08); }
  .nav-btn.active { color: var(--cream); background: rgba(255,255,255,0.12); }

  /* ── HERO ── */
  .hero {
    background: var(--ink);
    padding: 80px 48px 72px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(127,201,154,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-eyebrow {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7FC99A;
    margin-bottom: 16px;
  }
  .hero-title {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(36px, 5vw, 58px);
    color: var(--cream);
    line-height: 1.08;
    letter-spacing: -1px;
    max-width: 640px;
    margin-bottom: 20px;
  }
  .hero-title em { font-style: italic; color: #7FC99A; }
  .hero-sub {
    color: #888888;
    font-size: 16px;
    font-weight: 300;
    max-width: 480px;
    line-height: 1.7;
    margin-bottom: 36px;
  }
  .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

  /* ── BUTTONS ── */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.18s;
    text-decoration: none;
    letter-spacing: 0.2px;
  }
  .btn-primary { background: #7FC99A; color: var(--ink); }
  .btn-primary:hover { background: #6DBD8A; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(127,201,154,0.4); }
  .btn-outline { background: transparent; color: var(--cream); border: 1.5px solid rgba(255,255,255,0.2); }
  .btn-outline:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }
  .btn-dark { background: var(--ink); color: var(--cream); }
  .btn-dark:hover { background: #2A2A2A; transform: translateY(-1px); }
  .btn-ghost { background: transparent; color: var(--ink-soft); border: 1.5px solid var(--border); }
  .btn-ghost:hover { background: var(--cream); border-color: var(--ink-muted); }
  .btn-danger { background: #FDECEA; color: #C0392B; border: 1.5px solid #F5C6C2; }
  .btn-danger:hover { background: #F5C6C2; }
  .btn-sm { padding: 7px 14px; font-size: 13px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  /* ── LAYOUT ── */
  .page { padding: 48px; max-width: 1200px; margin: 0 auto; }
  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 32px;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  .page-sub { color: var(--ink-muted); font-size: 15px; margin-bottom: 32px; font-weight: 300; }

  /* ── FILTER BAR ── */
  .filter-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 32px;
    background: white;
    padding: 12px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }
  .filter-chip {
    padding: 7px 18px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid var(--border);
    background: transparent;
    color: var(--ink-soft);
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .filter-chip:hover { border-color: var(--sage); color: var(--sage); }
  .filter-chip.active { background: var(--ink); color: white; border-color: var(--ink); }

  /* ── EVENT GRID ── */
  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  /* ── EVENT CARD ── */
  .event-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
    box-shadow: var(--shadow);
  }
  .event-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); border-color: #C8C2BA; }
  .card-header {
    height: 8px;
  }
  .card-body { padding: 20px; }
  .card-cause {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .card-title {
    font-family: 'DM Serif Display', serif;
    font-size: 19px;
    line-height: 1.3;
    margin-bottom: 10px;
    letter-spacing: -0.2px;
  }
  .card-desc {
    color: var(--ink-soft);
    font-size: 13.5px;
    line-height: 1.6;
    margin-bottom: 16px;
    font-weight: 300;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 16px;
  }
  .card-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--ink-muted);
  }
  .card-meta-row svg { flex-shrink: 0; }
  .card-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    background: #FAFAF8;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .capacity-bar {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
    flex: 1;
    margin: 0 12px;
  }
  .capacity-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .capacity-label { font-size: 12px; color: var(--ink-muted); white-space: nowrap; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(10,10,10,0.6);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    padding: 24px;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 80px rgba(0,0,0,0.25);
    animation: slideUp 0.25s ease;
  }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-header {
    height: 6px;
    border-radius: 16px 16px 0 0;
  }
  .modal-body { padding: 28px; }
  .modal-title {
    font-family: 'DM Serif Display', serif;
    font-size: 24px;
    margin-bottom: 4px;
    letter-spacing: -0.3px;
  }
  .modal-cause {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .modal-desc {
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 20px;
    font-weight: 300;
  }
  .modal-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
  .info-tile {
    background: var(--cream);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    border: 1px solid var(--border);
  }
  .info-tile-label { font-size: 11px; color: var(--ink-muted); font-weight: 500; margin-bottom: 4px; letter-spacing: 0.5px; }
  .info-tile-value { font-size: 14px; font-weight: 500; color: var(--ink); }

  /* ── FORM ── */
  .form-section {
    border-top: 1px solid var(--border);
    padding-top: 20px;
    margin-top: 4px;
  }
  .form-title { font-size: 14px; font-weight: 600; margin-bottom: 14px; }
  .input-group { margin-bottom: 14px; }
  .input-label { font-size: 12px; font-weight: 500; color: var(--ink-soft); margin-bottom: 6px; display: block; letter-spacing: 0.3px; }
  .input {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--ink);
    background: white;
    transition: border-color 0.15s;
    outline: none;
  }
  .input:focus { border-color: var(--sage); }
  select.input { cursor: pointer; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  /* ── TOAST ── */
  .toast {
    position: fixed;
    bottom: 32px; right: 32px;
    background: var(--ink);
    color: white;
    padding: 14px 20px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    z-index: 2000;
    animation: toastIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 320px;
    box-shadow: var(--shadow-lg);
  }
  .toast.success { background: var(--sage-dark); }
  .toast.error { background: #C0392B; }
  @keyframes toastIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* ── STATS BAR ── */
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 36px;
  }
  .stat-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
    box-shadow: var(--shadow);
  }
  .stat-num {
    font-family: 'DM Serif Display', serif;
    font-size: 36px;
    line-height: 1;
    margin-bottom: 4px;
    letter-spacing: -1px;
  }
  .stat-label { font-size: 13px; color: var(--ink-muted); font-weight: 400; }

  /* ── DASHBOARD TABLE ── */
  .table-wrap {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--ink-muted);
    padding: 14px 20px;
    background: var(--cream);
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 14px 20px;
    font-size: 14px;
    border-bottom: 1px solid var(--border);
    color: var(--ink-soft);
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #FAFAF8; }

  /* ── ADMIN ── */
  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
  .admin-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
  }
  .admin-card-title {
    font-family: 'DM Serif Display', serif;
    font-size: 17px;
    margin-bottom: 6px;
  }
  .admin-card-meta { font-size: 13px; color: var(--ink-muted); margin-bottom: 14px; }
  .admin-card-actions { display: flex; gap: 8px; }

  /* ── EMPTY STATE ── */
  .empty {
    text-align: center;
    padding: 64px 32px;
    color: var(--ink-muted);
  }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--ink); margin-bottom: 8px; }
  .empty-sub { font-size: 14px; font-weight: 300; }

  /* ── CAUSE COLORS ── */
  .cause-environment { color: var(--sage); }
  .cause-education { color: var(--sky); }
  .cause-community { color: var(--terracotta); }
  .cause-healthcare { color: #8B5CF6; }
  .cause-animal-welfare { color: var(--amber); }
  .cause-other { color: var(--ink-muted); }

  .bar-environment { background: var(--sage); }
  .bar-education { background: var(--sky); }
  .bar-community { background: var(--terracotta); }
  .bar-healthcare { background: #8B5CF6; }
  .bar-animal-welfare { background: var(--amber); }
  .bar-other { background: var(--ink-muted); }

  .header-environment { background: var(--sage); }
  .header-education { background: var(--sky); }
  .header-community { background: var(--terracotta); }
  .header-healthcare { background: #8B5CF6; }
  .header-animal-welfare { background: var(--amber); }
  .header-other { background: var(--ink-muted); }

  /* ── SEARCH ── */
  .search-input-wrap {
    position: relative;
    margin-bottom: 32px;
  }
  .search-input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    background: white;
    outline: none;
    transition: border-color 0.15s;
    box-shadow: var(--shadow);
  }
  .search-input:focus { border-color: var(--sage); }
  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-muted);
  }
`;

// ─── CAUSE CONFIG ────────────────────────────────────────────────────────────
const CAUSES = ['All', 'Environment', 'Education', 'Community', 'Healthcare', 'Animal Welfare', 'Other'];

function causeKey(cause) {
  return (cause || 'other').toLowerCase().replace(/\s+/g, '-');
}

// ─── ICONS ──────────────────────────────────────────────────────────────────
const Icon = {
  calendar: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  pin: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 21s-7-6.686-7-11A7 7 0 0 1 19 10c0 4.314-7 11-7 11z"/><circle cx="12" cy="10" r="2"/></svg>,
  clock: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  users: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  search: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  leaf: '🌿',
  check: '✓',
  plus: '+',
  edit: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  x: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function capacityPct(reg, max) {
  return Math.min(100, Math.round((reg / max) * 100));
}

function capColor(pct) {
  if (pct >= 90) return '#C0392B';
  if (pct >= 60) return '#C08A2A';
  return '#4A7C59';
}

// ─── TOAST ──────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return <div className={`toast ${type}`}><span>{type === 'success' ? '✓' : '✕'}</span>{msg}</div>;
}

// ─── REGISTER MODAL ─────────────────────────────────────────────────────────
function RegisterModal({ event, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const pct = capacityPct(event.registered_count, event.max_volunteers);
  const ck = causeKey(event.cause);

  async function submit() {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/events/${event.id}/register`, { employee_name: name, employee_email: email });
      onSuccess('Registered successfully! See you at the event.');
      onClose();
    } catch (e) {
      onSuccess(e.response?.data?.error || 'Something went wrong', 'error');
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className={`modal-header header-${ck}`} />
        <div className="modal-body">
          <div className={`modal-cause cause-${ck}`}>{event.cause}</div>
          <div className="modal-title">{event.title}</div>
          <p className="modal-desc">{event.description}</p>
          <div className="modal-info-grid">
            <div className="info-tile">
              <div className="info-tile-label">Date</div>
              <div className="info-tile-value">{formatDate(event.date)}</div>
            </div>
            <div className="info-tile">
              <div className="info-tile-label">Duration</div>
              <div className="info-tile-value">{event.duration_hours} hours</div>
            </div>
            <div className="info-tile" style={{ gridColumn: '1/-1' }}>
              <div className="info-tile-label">Location</div>
              <div className="info-tile-value">{event.location}</div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>
              <span>Capacity</span>
              <span>{event.registered_count} / {event.max_volunteers}</span>
            </div>
            <div className="capacity-bar" style={{ height: 6 }}>
              <div className="capacity-fill" style={{ width: `${pct}%`, background: capColor(pct) }} />
            </div>
          </div>
          <div className="form-section">
            <div className="form-title">Your Details</div>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Aarya Jindal" />
            </div>
            <div className="input-group">
              <label className="input-label">Work Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading || !name || !email}>
              {loading ? 'Registering…' : `Register for Event`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EVENT CARD ──────────────────────────────────────────────────────────────
function EventCard({ event, onClick }) {
  const pct = capacityPct(event.registered_count, event.max_volunteers);
  const ck = causeKey(event.cause);
  return (
    <div className="event-card" onClick={onClick}>
      <div className={`card-header header-${ck}`} />
      <div className="card-body">
        <div className={`card-cause cause-${ck}`}>{event.cause}</div>
        <div className="card-title">{event.title}</div>
        <div className="card-desc">{event.description}</div>
        <div className="card-meta">
          <div className="card-meta-row">{Icon.calendar} {formatDate(event.date)}</div>
          <div className="card-meta-row">{Icon.pin} {event.location}</div>
          <div className="card-meta-row">{Icon.clock} {event.duration_hours} hrs</div>
        </div>
      </div>
      <div className="card-footer">
        <span className="capacity-label">{event.registered_count}/{event.max_volunteers}</span>
        <div className="capacity-bar">
          <div className={`capacity-fill`} style={{ width: `${pct}%`, background: capColor(pct) }} />
        </div>
        <span className="capacity-label">{pct}%</span>
      </div>
    </div>
  );
}

// ─── EVENTS PAGE ─────────────────────────────────────────────────────────────
function EventsPage({ showToast }) {
  const [events, setEvents] = useState([]);
  const [cause, setCause] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    const { data } = await axios.get(`${API}/events`, { params: { cause } });
    setEvents(data);
  }

  useEffect(() => { load(); }, [cause]);

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h1 className="page-title">Volunteer Events</h1>
      <p className="page-sub">Find meaningful opportunities and make an impact.</p>

      <div className="search-input-wrap">
        <span className="search-icon">{Icon.search}</span>
        <input className="search-input" placeholder="Search by event name or location…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="filter-bar">
        {CAUSES.map(c => (
          <button key={c} className={`filter-chip${cause === c ? ' active' : ''}`} onClick={() => setCause(c)}>{c}</button>
        ))}
      </div>

      {filtered.length === 0
        ? <div className="empty"><div className="empty-icon">🔍</div><div className="empty-title">No events found</div><div className="empty-sub">Try a different filter or search term.</div></div>
        : <div className="events-grid">
            {filtered.map(ev => <EventCard key={ev.id} event={ev} onClick={() => setSelected(ev)} />)}
          </div>
      }

      {selected && (
        <RegisterModal
          event={selected}
          onClose={() => setSelected(null)}
          onSuccess={(msg, type = 'success') => { showToast(msg, type); load(); }}
        />
      )}
    </div>
  );
}

// ─── DASHBOARD PAGE ──────────────────────────────────────────────────────────
function DashboardPage({ showToast }) {
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data: d } = await axios.get(`${API}/dashboard`, { params: { email: query } });
      setData(d); setEmail(query);
    } catch { showToast('Could not load data', 'error'); }
    setLoading(false);
  }

  return (
    <div className="page">
      <h1 className="page-title">My Impact Dashboard</h1>
      <p className="page-sub">Track your volunteering history and hours contributed.</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 36, maxWidth: 480 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Enter your work email…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()} />
        <button className="btn btn-dark" onClick={lookup} disabled={loading}>{loading ? 'Loading…' : 'View My Impact'}</button>
      </div>

      {data && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--sage)' }}>{data.total_events}</div>
              <div className="stat-label">Events Joined</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--terracotta)' }}>{data.total_hours}</div>
              <div className="stat-label">Hours Volunteered</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: 'var(--sky)' }}>{data.total_events > 0 ? (data.total_hours / data.total_events).toFixed(1) : 0}</div>
              <div className="stat-label">Avg Hours / Event</div>
            </div>
          </div>

          {data.events.length === 0
            ? <div className="empty"><div className="empty-icon">🌱</div><div className="empty-title">No events yet</div><div className="empty-sub">Register for your first volunteering event to get started.</div></div>
            : <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Cause</th>
                      <th>Date</th>
                      <th>Location</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((ev, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{ev.title}</td>
                        <td><span className={`cause-${causeKey(ev.cause)}`} style={{ fontWeight: 500, fontSize: 13 }}>{ev.cause}</span></td>
                        <td>{formatDate(ev.date)}</td>
                        <td>{ev.location}</td>
                        <td style={{ fontWeight: 600 }}>{ev.duration_hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </>
      )}
    </div>
  );
}

// ─── ADMIN PAGE ──────────────────────────────────────────────────────────────
function AdminPage({ showToast }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | event obj
  const [form, setForm] = useState({ title: '', description: '', cause: 'Environment', location: '', date: '', duration_hours: 3, max_volunteers: 20 });

  async function load() {
    const [evs, st] = await Promise.all([
      axios.get(`${API}/events`),
      axios.get(`${API}/dashboard`)
    ]);
    setEvents(evs.data); setStats(st.data);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ title: '', description: '', cause: 'Environment', location: '', date: '', duration_hours: 3, max_volunteers: 20 });
    setModal('create');
  }

  function openEdit(ev) {
    setForm({ title: ev.title, description: ev.description || '', cause: ev.cause, location: ev.location, date: ev.date, duration_hours: ev.duration_hours, max_volunteers: ev.max_volunteers });
    setModal(ev);
  }

  async function save() {
    try {
      if (modal === 'create') {
        await axios.post(`${API}/events`, form);
        showToast('Event created!');
      } else {
        await axios.put(`${API}/events/${modal.id}`, form);
        showToast('Event updated!');
      }
      setModal(null); load();
    } catch { showToast('Error saving event', 'error'); }
  }

  async function del(id) {
    if (!window.confirm('Delete this event and all registrations?')) return;
    await axios.delete(`${API}/events/${id}`);
    showToast('Event deleted'); load();
  }

  const f = form;
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-sub">Manage events and monitor participation.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
      </div>

      {stats && (
        <div className="stats-bar" style={{ marginBottom: 36 }}>
          <div className="stat-card">
            <div className="stat-num">{stats.total_events}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{ color: 'var(--sage)' }}>{stats.total_registrations}</div>
            <div className="stat-label">Total Registrations</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{ color: 'var(--terracotta)' }}>{stats.total_volunteer_hours}</div>
            <div className="stat-label">Total Hours Pledged</div>
          </div>
        </div>
      )}

      <div className="admin-grid">
        {events.map(ev => (
          <div key={ev.id} className="admin-card">
            <div className={`card-cause cause-${causeKey(ev.cause)}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>{ev.cause}</div>
            <div className="admin-card-title">{ev.title}</div>
            <div className="admin-card-meta">{formatDate(ev.date)} · {ev.registered_count}/{ev.max_volunteers} registered</div>
            <div className="admin-card-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ev)}>{Icon.edit} Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(ev.id)}>{Icon.trash} Delete</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className={`modal-header header-${causeKey(f.cause)}`} />
            <div className="modal-body">
              <div className="modal-title" style={{ marginBottom: 20 }}>{modal === 'create' ? 'Create Event' : 'Edit Event'}</div>
              <div className="input-group">
                <label className="input-label">Title</label>
                <input className="input" value={f.title} onChange={e => setF('title', e.target.value)} placeholder="Beach Cleanup Drive" />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input" rows={3} value={f.description} onChange={e => setF('description', e.target.value)} placeholder="What will volunteers be doing?" style={{ resize: 'vertical' }} />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Cause</label>
                  <select className="input" value={f.cause} onChange={e => setF('cause', e.target.value)}>
                    {CAUSES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input className="input" type="date" value={f.date} onChange={e => setF('date', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
                <input className="input" value={f.location} onChange={e => setF('location', e.target.value)} placeholder="Cubbon Park, Bengaluru" />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Duration (hours)</label>
                  <input className="input" type="number" min={1} max={12} value={f.duration_hours} onChange={e => setF('duration_hours', +e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Max Volunteers</label>
                  <input className="input" type="number" min={1} value={f.max_volunteers} onChange={e => setF('max_volunteers', +e.target.value)} />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>{modal === 'create' ? 'Create Event' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function HeroSection({ onBrowse }) {
  return (
    <div className="hero">
      <div className="hero-eyebrow">Employee Volunteering Platform</div>
      <h1 className="hero-title">Give your time.<br /><em>Grow your impact.</em></h1>
      <p className="hero-sub">Browse curated volunteering opportunities, register for events, and track the hours you've contributed to causes that matter.</p>
      <div className="hero-actions">
        <button className="btn btn-primary" onClick={onBrowse}>Browse Events</button>
        <button className="btn btn-outline" onClick={onBrowse}>Track My Hours →</button>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home');
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
  }

  return (
    <>
      <style>{styles}</style>

      <nav className="nav">
        <div className="nav-logo" onClick={() => setPage('home')}>
          Good<span>Volunteer</span>
        </div>
        <div className="nav-links">
          <button className={`nav-btn${page === 'events' ? ' active' : ''}`} onClick={() => setPage('events')}>Events</button>
          <button className={`nav-btn${page === 'dashboard' ? ' active' : ''}`} onClick={() => setPage('dashboard')}>My Dashboard</button>
          <button className={`nav-btn${page === 'admin' ? ' active' : ''}`} onClick={() => setPage('admin')}>Admin</button>
        </div>
      </nav>

      {page === 'home' && <HeroSection onBrowse={() => setPage('events')} />}
      {page === 'events' && <EventsPage showToast={showToast} />}
      {page === 'dashboard' && <DashboardPage showToast={showToast} />}
      {page === 'admin' && <AdminPage showToast={showToast} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}

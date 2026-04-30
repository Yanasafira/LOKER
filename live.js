/* ═══════════════════════════════════════
    LIVE CCTV — Logic
  ═══════════════════════════════════════ */

  'use strict';

  const SRV      = 'https://coasting-pursuable-stapling.ngrok-free.dev';
  const STREAM   = 'https://coasting-pursuable-stapling.ngrok-free.dev/video';
  const THRESHOLD = 45;
  const MAX_CONF  = 150;

  // ── Clock ──
  setInterval(() => {
    document.getElementById('clock').textContent =
      new Date().toTimeString().slice(0, 8);
  }, 1000);

  // ── Stream ──
  function startStream() {
    document.getElementById('cctvImg').src = `${STREAM}?t=${Date.now()}`;
  }

  function streamOk() {
    document.getElementById('streamStatus').textContent = '● Terhubung';
    document.getElementById('streamStatus').style.color = 'rgba(48,209,88,0.9)';
    addLog('Stream terhubung', 'ok');
  }

  function streamErr() {
    document.getElementById('streamStatus').textContent = 'Stream terputus — mencoba ulang…';
    document.getElementById('streamStatus').style.color = 'rgba(255,59,48,0.9)';
    addLog('Stream terputus, mencoba ulang…', 'err');
    setTimeout(startStream, 3000);
  }

  startStream();

  // ── Log ──
  function addLog(msg, type = 'info') {
    const list = document.getElementById('logList');
    const time = new Date().toTimeString().slice(0, 8);
    const el   = document.createElement('div');
    el.className = `log-item ${type}`;
    el.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${msg}</span>`;
    list.insertBefore(el, list.firstChild);
    while (list.children.length > 60) list.removeChild(list.lastChild);
  }

  // ── Result ──
  function setResult(type, data) {
    const card   = document.getElementById('resultCard');
    const status = document.getElementById('resultStatus');

    card.className = 'card result-card ' + (type || '');

    if (type === 'success') {
      status.className   = 'result-status success';
      status.textContent = '✓ Akses Diterima';
      document.getElementById('rNama').textContent  = data.nama     || '—';
      document.getElementById('rKelas').textContent = data.kelas    || '—';
      document.getElementById('rSem').textContent   = data.semester || '—';
      document.getElementById('rLoker').textContent = 'Loker ' + (data.loker || '—');
      document.getElementById('rJam').textContent   = data.jam      || new Date().toTimeString().slice(0, 8);
    } else if (type === 'danger') {
      status.className   = 'result-status danger';
      status.textContent = '✗ Akses Ditolak';
      document.getElementById('rNama').textContent  = 'Tidak dikenal';
      document.getElementById('rKelas').textContent = '—';
      document.getElementById('rSem').textContent   = '—';
      document.getElementById('rLoker').textContent = '—';
      document.getElementById('rJam').textContent   = new Date().toTimeString().slice(0, 8);
    } else {
      status.className   = 'result-status idle';
      status.textContent = 'Standby';
    }
  }

  // ── Confidence ──
  function setConf(conf) {
    const fill = document.getElementById('confFill');
    const val  = document.getElementById('confValue');
    const note = document.getElementById('confNote');

    if (conf == null) {
      fill.style.width      = '0%';
      fill.style.background = 'var(--text-tertiary)';
      val.textContent       = '—';
      note.textContent      = 'Tidak ada wajah terdeteksi';
      return;
    }

    const pct   = Math.min((conf / MAX_CONF) * 100, 100);
    const match = conf <= THRESHOLD;

    fill.style.width      = pct + '%';
    fill.style.background = match ? '#30d158' : '#ff3b30';
    val.textContent       = conf.toFixed(1);
    note.textContent      = match
      ? `✓ Cocok — score ${conf.toFixed(1)} ≤ ${THRESHOLD}`
      : `✗ Tidak cocok — score ${conf.toFixed(1)} > ${THRESHOLD}`;
  }

  // ── SSE ──
  function connectSSE() {
    const es = new EventSource(`${SRV}/events`);

    es.onopen = () => {
      document.getElementById('srvDot').className   = 'status-dot online';
      document.getElementById('srvLabel').textContent = 'Server';
      addLog('Terhubung ke server', 'ok');
    };

    es.onmessage = (e) => {
      try {
        const { tipe, data } = JSON.parse(e.data);
        if (tipe === 'ping' || tipe === 'init') return;

        if (tipe === 'akses_berhasil') {
          setResult('success', data);
          setConf(data.confidence);
          addLog(`✓ ${data.nama} · Loker ${data.loker} · Score: ${data.confidence}`, 'ok');
        }

        if (tipe === 'akses_ditolak') {
          setResult('danger', data);
          setConf(data.confidence);
          addLog(`✗ Ditolak · Score: ${data.confidence}`, 'err');
        }

        if (tipe === 'daftar_proses') {
          addLog(`◎ Daftar: ${data.nama} — foto ${data.nomor_foto}/5`, 'info');
        }

        if (tipe === 'daftar_selesai') {
          addLog(`✓ ${data.nama} berhasil terdaftar`, 'ok');
        }

        if (tipe === 'pengguna_dihapus') {
          addLog(`⊗ ${data.nama} dihapus dari sistem`, 'warn');
        }

      } catch (_) {}
    };

    es.onerror = () => {
      document.getElementById('srvDot').className   = 'status-dot offline';
      document.getElementById('srvLabel').textContent = 'Server ✗';
      addLog('Koneksi SSE terputus, mencoba ulang…', 'err');
      es.close();
      setTimeout(connectSSE, 4000);
    };
  }

  connectSSE();
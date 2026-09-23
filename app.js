/* BK Predictor — 100% client-side untuk GitHub Pages */

const API_BASE = 'https://newapi.55lottertttapi.com/api/webapi';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIxNzU4MTkwNjczIiwibmJmIjoiMTc1ODE5MDY3MyIsImV4cCI6IjE3NTgxOTI0NzMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiI5LzE4LzIwMjUgNTo0Nzo1MyBQTSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFjY2Vzc19Ub2tlbiIsIlVzZXJJZCI6IjQ4MDEiLCJVc2VyTmFtZSI6IjYyODU4MTM2Njg1MTQiLCJVc2VyUGhvdG8iOiIyIiwiTmlja05hbWUiOiJCaXNtaWxhaCIsIkFtb3VudCI6IjY0LjAwIiwiSW50ZWdyYWwiOiIwIiwiTG9naW5NYXJrIjoiSDUiLCJMb2dpblRpbWUiOiI5LzE4LzIwMjUgNToxNzo1MyBQTSIsIkxvZ2luSVBBZGRyZXNzIjoiMTE0LjEwLjExNC4yMTIiLCJEYk51bWJlciI6IjAiLCJJc3ZhbGlkYXRvciI6IjAiLCJLZXlDb2RlIjoiNDMxMiIsIlRva2VuVHlwZSI6IkFjY2Vzc19Ub2tlbiIsIlBob25lVHlwZSI6IjAiLCJVc2VyVHlwZSI6IjAiLCJVc2VyTmFtZTIiOiIiLCJpc3MiOiJqd3RJc3N1ZXIiLCJhdWQiOiJsb3R0ZXJ5VGlja2V0In0.HKoQE36HtLF5197bKMEQxNCRg85tBk5mcLUj99nPoxTR';

const CORS_PROXY = 'https://corsproxy.io/?url=';

const BETS = [1000,3000,6000,16000,32000,80000,160000,350000,800000,1700000,4000000,8000000,18000000,50000000];
const STORAGE_KEY = 'bk_state_v1';

function randomBK() { return Math.random() < 0.5 ? 'B' : 'K'; }

function defaultState() {
  return { balance:1000000, currentBet:1000, betIndex:0, isLoss:false, nextBetType:randomBK(),
    nextIssue:'-', countdown:60, history:[], lastUpdate:null, totalWin:0, totalLoss:0, streak:0, lastMinute:-1 };
}

let state = loadState();
function loadState() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { ...defaultState(), ...JSON.parse(r) }; } catch(e){}
  return defaultState();
}
function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){} }

function calculateBet(isLoss) {
  if (isLoss) state.betIndex++; else state.betIndex = 0;
  if (state.betIndex >= BETS.length) state.betIndex = BETS.length - 1;
  return BETS[state.betIndex];
}

async function apiPost(endpoint, body) {
  const url = CORS_PROXY + encodeURIComponent(API_BASE + endpoint);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json; charset=UTF-8',
      'authorization': AUTH_TOKEN
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function getNoaverageEmerdList() {
  return apiPost('/GetNoaverageEmerdList', { pageSize:10, pageNo:1, typeId:1, language:0,
    random:'fbebaad75dd54f24907640d422b6f9a4', signature:'01FBE30E784D82C256D204C784CF3790',
    timestamp: Math.floor(Date.now()/1000) });
}
function getGameIssue() {
  return apiPost('/GetGameIssue', { typeId:1, language:0,
    random:'4431ad57be4f4c3b9e2fcaedd064bdba', signature:'ABC935D9B1AF1DA76F556AF81737E834',
    timestamp: Math.floor(Date.now()/1000) });
}

let running = false;
async function runRound() {
  if (running) return;
  running = true;
  setStatus('loading…', '');
  try {
    const [d1, d2] = await Promise.all([getNoaverageEmerdList(), getGameIssue()]);
    const list = d1?.data?.list;
    if (!Array.isArray(list) || !list.length) throw new Error('List kosong');

    const latest = list[0];
    const number = parseInt(latest.number, 10);
    const issueNumber = latest.issueNumber;
    const isBig = number >= 5;
    const prevType = state.nextBetType;

    let result, isLoss;
    if (prevType === 'B') {
      if (isBig) { isLoss=false; state.balance+=state.currentBet; result='WIN'; state.totalWin++; state.streak = state.streak>=0?state.streak+1:1; }
      else { isLoss=true; state.balance-=state.currentBet; result='LOSS'; state.totalLoss++; state.streak = state.streak<=0?state.streak-1:-1; }
    } else {
      if (!isBig) { isLoss=false; state.balance+=state.currentBet; result='WIN'; state.totalWin++; state.streak = state.streak>=0?state.streak+1:1; }
      else { isLoss=true; state.balance-=state.currentBet; result='LOSS'; state.totalLoss++; state.streak = state.streak<=0?state.streak-1:-1; }
    }

    const previousBet = state.currentBet;
    state.currentBet = calculateBet(isLoss);
    state.isLoss = isLoss;

    state.history.unshift({
      period: issueNumber, prediction: prevType, bet: previousBet,
      number, numberType: isBig ? 'B' : 'K', result,
      time: new Date().toLocaleTimeString('id-ID')
    });
    if (state.history.length > 20) state.history.pop();

    state.nextIssue = d2?.data?.issueNumber ?? '-';
    state.nextBetType = randomBK();
    state.lastUpdate = new Date().toISOString();

    saveState(); render();
    setStatus('online', 'ok');
    document.getElementById('errorMsg').textContent = '';
    console.log(`[ROUND] ${issueNumber} | angka=${number} | ${prevType} -> ${result}`);
  } catch (err) {
    console.error('[ROUND ERROR]', err);
    setStatus('error', 'err');
    document.getElementById('errorMsg').textContent = 'Error: ' + err.message;
  } finally { running = false; }
}

setInterval(() => {
  const now = new Date();
  state.countdown = 60 - now.getSeconds();
  document.getElementById('countdown').textContent = state.countdown;
  if (now.getMinutes() !== state.lastMinute) {
    state.lastMinute = now.getMinutes();
    saveState(); runRound();
  }
}, 1000);

function fmt(n) { return new Intl.NumberFormat('id-ID').format(n); }

function render() {
  document.getElementById('balance').textContent = fmt(state.balance);
  document.getElementById('currentBet').textContent = fmt(state.currentBet);
  document.getElementById('nextBetType').textContent = state.nextBetType;
  document.getElementById('nextIssue').textContent = state.nextIssue;
  document.getElementById('streak').textContent = state.streak;
  document.getElementById('wl').textContent = `${state.totalWin} / ${state.totalLoss}`;
  document.getElementById('lastUpdate').textContent = state.lastUpdate ? new Date(state.lastUpdate).toLocaleString('id-ID') : '—';

  const tbody = document.getElementById('history');
  tbody.innerHTML = '';
  for (const h of state.history) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${h.time}</td><td>${h.period}</td><td>${h.prediction}</td>
      <td>${fmt(h.bet)}</td><td>${h.number}</td><td>${h.numberType}</td>
      <td class="${h.result==='WIN'?'win':'loss'}">${h.result}</td>`;
    tbody.appendChild(tr);
  }
}

function setStatus(t, c) {
  const el = document.getElementById('status');
  el.textContent = t;
  el.className = 'status' + (c ? ' ' + c : '');
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset semua state?')) {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState(); saveState(); render();
  }
});

render();
setStatus('online', 'ok');
runRound();

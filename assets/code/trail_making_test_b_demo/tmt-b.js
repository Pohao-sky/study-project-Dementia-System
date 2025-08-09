const canvas = document.getElementById('tmt-canvas');
const ctx = canvas.getContext('2d');

const RADIUS = 29;
const orderList = [
  {type: 'num', label: '1'},  {type: 'char', label: 'A'},
  {type: 'num', label: '2'},  {type: 'char', label: 'B'},
  {type: 'num', label: '3'},  {type: 'char', label: 'C'},
  {type: 'num', label: '4'},  {type: 'char', label: 'D'},
  {type: 'num', label: '5'},  {type: 'char', label: 'E'},
  {type: 'num', label: '6'},  {type: 'char', label: 'F'},
  {type: 'num', label: '7'},  {type: 'char', label: 'G'},
  {type: 'num', label: '8'},  {type: 'char', label: 'H'},
  {type: 'num', label: '9'},  {type: 'char', label: 'I'},
  {type: 'num', label: '10'}, {type: 'char', label: 'J'},
  {type: 'num', label: '11'}, {type: 'char', label: 'K'},
  {type: 'num', label: '12'}, {type: 'char', label: 'L'},
  {type: 'num', label: '13'}
];

const NODES = [];
const LINES = [];

let dragging = false;
let lastNode = null;
let currentPath = [];

let startTime = null;
let endTime = null;
let timerInterval = null;
let errorCount = 0;
let started = false;

// ===== UI helpers =====
function updateTimerDisplay() {
  const el = document.getElementById('tmt-timer');
  if (startTime && !endTime) {
    el.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
  } else if (startTime && endTime) {
    el.textContent = ((endTime - startTime) / 1000).toFixed(1);
  } else {
    el.textContent = '0.0';
  }
}
function updateErrorDisplay() {
  document.getElementById('tmt-errors').textContent = errorCount;
}
function showPopup(msg) {
  document.getElementById('popup-msg').innerHTML = msg.replace(/\n/g, '<br>');
  document.getElementById('popup').style.display = 'block';
  document.body.style.pointerEvents = 'none';
  document.getElementById('popup').style.pointerEvents = 'auto';
}
function hidePopup() {
  document.getElementById('popup').style.display = 'none';
  document.body.style.pointerEvents = 'auto';
}

// ===== core =====
function randomCoords(count) {
  const coords = [];
  while (coords.length < count) {
    const x = Math.random() * (canvas.width - RADIUS * 2) + RADIUS;
    const y = Math.random() * (canvas.height - RADIUS * 2) + RADIUS;
    const ok = coords.every(pt => (pt.x - x) ** 2 + (pt.y - y) ** 2 > (RADIUS * 3) ** 2);
    if (ok) coords.push({ x, y });
  }
  return coords;
}

function setupNodes() {
  NODES.length = 0;
  const coords = randomCoords(orderList.length);
  for (let i = 0; i < orderList.length; i++) {
    const node = { ...orderList[i], x: coords[i].x, y: coords[i].y };
    NODES.push(node);
  }
}

function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // lines
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2186f6';
  LINES.forEach(l => {
    ctx.beginPath();
    ctx.moveTo(l.from.x, l.from.y);
    ctx.lineTo(l.to.x, l.to.y);
    ctx.stroke();
  });
  ctx.restore();

  // nodes
  NODES.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#222';
    ctx.stroke();

    ctx.fillStyle = n.type === 'num' ? '#222' : '#1e50a2';
    ctx.font = '19px bold sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y);
  });

  // dragging line
  if (dragging && lastNode && currentPath.length > 0) {
    ctx.save();
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lastNode.x, lastNode.y);
    ctx.lineTo(currentPath[0], currentPath[1]);
    ctx.stroke();
    ctx.restore();
  }
}

function getNodeAt(x, y) {
  return NODES.find(n => (n.x - x) ** 2 + (n.y - y) ** 2 <= RADIUS ** 2) || null;
}

function resetTest() {
  NODES.length = 0;
  LINES.length = 0;
  dragging = false;
  lastNode = null;
  currentPath = [];
  startTime = null;
  endTime = null;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  errorCount = 0;
  started = false;

  setupNodes();
  drawAll();
  updateTimerDisplay();
  updateErrorDisplay();
}

// ===== init =====
document.addEventListener('DOMContentLoaded', () => {
  showPopup(
    '【遊戲規則】\n' +
    '1. 依序點擊並連線「1→A→2→B→3→C→...→13→L」，只能照順序交錯連線。\n' +
    '2. 拖曳錯誤會彈窗提醒並記錯誤次數。\n' +
    '3. 按「開始連線測驗」後開始計時，全部完成即顯示用時與錯誤數。\n\n' +
    '請點擊下方「開始連線測驗」按鈕開始！'
  );

  const btn = document.createElement('button');
  btn.textContent = '開始連線測驗';
  btn.className = 'tmt-restart';
  document.body.insertBefore(btn, document.getElementById('popup'));
  btn.onclick = () => {
    resetTest();
    hidePopup();
    btn.style.display = 'none';
    started = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimerDisplay, 100);
    updateTimerDisplay();
  };

  drawAll();
  updateTimerDisplay();
  updateErrorDisplay();
});

// ===== events =====
canvas.addEventListener('mousedown', e => {
  if (!started) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const node = getNodeAt(mx, my);

  if (LINES.length === 0 && node && node.type === 'num' && node.label === '1') {
    dragging = true;
    lastNode = node;
  } else if (LINES.length > 0) {
    const exp = orderList[LINES.length];
    if (node && node.type === exp.type && node.label === exp.label) {
      dragging = true;
      lastNode = node;
    }
  }
  drawAll();
});

canvas.addEventListener('mousemove', e => {
  if (!dragging || !lastNode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  currentPath = [mx, my];
  drawAll();
});

canvas.addEventListener('mouseup', e => {
  if (!dragging || !lastNode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const next = getNodeAt(mx, my);
  const expected = orderList[LINES.length + 1];

  if (next && expected && next.type === expected.type && next.label === expected.label && next !== lastNode) {
    LINES.push({ from: lastNode, to: next });
    lastNode = next;

    if (LINES.length === orderList.length - 1) {
      dragging = false;
      endTime = Date.now();
      updateTimerDisplay();
      clearInterval(timerInterval);
      setTimeout(() => {
        showPopup(
          '完成！總花費時間：' +
          ((endTime - startTime) / 1000).toFixed(1) +
          ' 秒\n錯誤次數：' + errorCount
        );
      }, 100);
    }
  } else if (next && next !== lastNode) {
    errorCount += 1;
    updateErrorDisplay();
    const curr = orderList[LINES.length];
    const nextTypeLabel = curr.type === 'num' ? '字母' : '數字';
    showPopup(`你剛連到 ${lastNode.label}，下一個${nextTypeLabel}是什麼？`);
  }

  dragging = false;
  currentPath = [];
  drawAll();
});

// 讓 HTML 內聯的 onclick 可以找到 hidePopup
window.hidePopup = hidePopup;

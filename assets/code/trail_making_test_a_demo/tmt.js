const canvas = document.getElementById('tmt-canvas');
const ctx = canvas.getContext('2d');
const N = 24;
const RADIUS = 22;
const nodes = [];
const lines = [];
let dragging = false;
let lastNode = null;
let currentPath = [];
let startTime = null, endTime = null;
let timerInterval = null;
let errorCount = 0;
let started = false;

// 定時器與錯誤顯示
function updateTimerDisplay() {
  const el = document.getElementById('tmt-timer');
  if (startTime && !endTime) {
    el.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
  } else if (startTime && endTime) {
    el.textContent = ((endTime - startTime) / 1000).toFixed(1);
  } else {
    el.textContent = "0.0";
  }
}
function updateErrorDisplay() {
  document.getElementById('tmt-errors').textContent = errorCount;
}

// 彈跳提示
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

// 產生隨機座標
function randomNodes(n) {
  const arr = [];
  let count = 0;
  while(arr.length < n && count < 3000) {
    let x = Math.random() * (canvas.width - RADIUS * 2) + RADIUS;
    let y = Math.random() * (canvas.height - RADIUS * 2) + RADIUS;
    if(arr.every(pt => (pt.x - x)**2 + (pt.y - y)**2 > RADIUS*2.8*RADIUS*2.8)) {
      arr.push({x, y});
    }
    count++;
  }
  return arr;
}
// 初始化節點，編號隨機
function setupNodes() {
  let coords = randomNodes(N);
  let nums = Array.from({length:N}, (_,i)=>i+1);
  nums.sort(()=>Math.random()-0.5);
  for(let i=0;i<N;i++){
    nodes.push({num:nums[i], x:coords[i].x, y:coords[i].y});
  }
  nodes.sort((a,b)=>a.num-b.num);
}

function drawAll() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#2186f6";
  lines.forEach(l=>{
    ctx.beginPath();
    ctx.moveTo(l.from.x, l.from.y);
    ctx.lineTo(l.to.x, l.to.y);
    ctx.stroke();
  });
  ctx.restore();
  nodes.forEach((n, i) => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, RADIUS, 0, Math.PI*2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#222";
    ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.font = "18px bold sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.num, n.x, n.y);
  });
  if(dragging && lastNode && currentPath.length > 0) {
    ctx.save();
    ctx.strokeStyle = "#ff8800";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lastNode.x, lastNode.y);
    ctx.lineTo(currentPath[0], currentPath[1]);
    ctx.stroke();
    ctx.restore();
  }
}

function getNodeAt(x, y) {
  for(let i=0;i<nodes.length;i++){
    let n = nodes[i];
    if((n.x-x)**2 + (n.y-y)**2 <= RADIUS*RADIUS) return n;
  }
  return null;
}

function resetTest() {
  nodes.length = 0;
  lines.length = 0;
  dragging = false;
  lastNode = null;
  currentPath = [];
  startTime = null;
  endTime = null;
  timerInterval && clearInterval(timerInterval);
  timerInterval = null;
  errorCount = 0;
  started = false;
  setupNodes();
  drawAll();
  updateTimerDisplay();
  updateErrorDisplay();
}

window.onload = function() {
  showPopup(`【遊戲規則】
1. 請依序由小到大，點擊畫面上數字圓圈並拖曳連線。
2. 只能依序連線，錯誤連線會有提醒，並記錄錯誤次數。
3. 點擊「開始連線測驗」後開始計時，完成全部連線即結束並顯示用時與錯誤數。

請點擊下方「開始連線測驗」按鈕開始遊戲！`);
};

// 新增開始連線測驗按鈕
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

canvas.addEventListener('mousedown', (e)=>{
  if (!started) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let node = getNodeAt(mx, my);
  if(!node) return;
  if(lines.length===0 && node.num===1) {
    dragging = true;
    lastNode = node;
  }
  else if(lines.length>0 && node.num === lines.length+1) {
    dragging = true;
    lastNode = node;
  }
  drawAll();
});

canvas.addEventListener('mousemove', (e)=>{
  if(!dragging || !lastNode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  currentPath = [mx, my];
  drawAll();
});

canvas.addEventListener('mouseup', (e)=>{
  if(!dragging || !lastNode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let next = getNodeAt(mx, my);
  let expectedNum = (lines.length+2);
  if(next && next.num === expectedNum && next !== lastNode) {
    lines.push({from:lastNode, to:next});
    lastNode = next;
    if(next.num===N) {
      dragging = false;
      endTime = Date.now();
      updateTimerDisplay();
      clearInterval(timerInterval);
      setTimeout(()=>{
        showPopup("完成！總花費時間：" + ((endTime-startTime)/1000).toFixed(1) + " 秒\n錯誤次數：" + errorCount);
      }, 100);
    }
  } else if(next && next !== lastNode) {
    errorCount += 1;
    updateErrorDisplay();
    showPopup(`你剛連到 ${lastNode.num}，下一個數字是什麼？`);
  }
  dragging = false;
  currentPath = [];
  drawAll();
});

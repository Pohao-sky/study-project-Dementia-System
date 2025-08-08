const canvas = document.getElementById('tmt-canvas');
const ctx = canvas.getContext('2d');
const RADIUS = 29;
const orderList = [
  {type: 'num', label: '1'}, {type: 'char', label: 'A'},
  {type: 'num', label: '2'}, {type: 'char', label: 'B'},
  {type: 'num', label: '3'}, {type: 'char', label: 'C'},
  {type: 'num', label: '4'}, {type: 'char', label: 'D'},
  {type: 'num', label: '5'}, {type: 'char', label: 'E'},
  {type: 'num', label: '6'}, {type: 'char', label: 'F'},
  {type: 'num', label: '7'}, {type: 'char', label: 'G'},
  {type: 'num', label: '8'}, {type: 'char', label: 'H'},
  {type: 'num', label: '9'}, {type: 'char', label: 'I'},
  {type: 'num', label: '10'}, {type: 'char', label: 'J'},
  {type: 'num', label: '11'}, {type: 'char', label: 'K'},
  {type: 'num', label: '12'}, {type: 'char', label: 'L'},
  {type: 'num', label: '13'}
];
const nodeCoords = [
  {x:115,y:85},    //1
  {x:320,y:100},   //A
  {x:95,y:480},    //2
  {x:520,y:150},   //B
  {x:205,y:205},   //3
  {x:620,y:320},   //C
  {x:735,y:145},   //4
  {x:950,y:160},   //D
  {x:890,y:245},   //5
  {x:1020,y:480},  //E
  {x:650,y:555},   //6
  {x:295,y:560},   //F
  {x:300,y:320},   //7
  {x:590,y:370},   //G
  {x:150,y:330},   //8
  {x:355,y:230},   //H
  {x:390,y:435},   //9
  {x:850,y:70},    //I
  {x:1010,y:90},   //10
  {x:860,y:355},   //J
  {x:935,y:560},   //11
  {x:610,y:65},    //K
  {x:205,y:420},   //12
  {x:470,y:500},   //L
  {x:650,y:185}    //13
];
const NODES = [];
const LINES = [];
let dragging = false, lastNode = null, currentPath = [];
let startTime = null, endTime = null, timerInterval = null;
let errorCount = 0, started = false;

function setupNodes() {
  NODES.length = 0;
  for(let i=0;i<orderList.length;i++) {
    let node = Object.assign({}, orderList[i]);
    node.x = nodeCoords[i].x;
    node.y = nodeCoords[i].y;
    NODES.push(node);
  }
}
function drawAll() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#2186f6";
  LINES.forEach(l=>{
    ctx.beginPath();
    ctx.moveTo(l.from.x, l.from.y);
    ctx.lineTo(l.to.x, l.to.y);
    ctx.stroke();
  });
  ctx.restore();
  NODES.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, RADIUS, 0, Math.PI*2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#222";
    ctx.stroke();
    ctx.fillStyle = n.type === 'num' ? "#222" : "#1e50a2";
    ctx.font = "19px bold sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.label, n.x, n.y);
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
  for (let n of NODES) {
    if ((n.x-x)**2 + (n.y-y)**2 <= RADIUS*RADIUS) return n;
  }
  return null;
}
function updateTimerDisplay() {
  const el = document.getElementById('tmt-timer');
  if (startTime && !endTime) el.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
  else if (startTime && endTime) el.textContent = ((endTime - startTime) / 1000).toFixed(1);
  else el.textContent = "0.0";
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
function resetTest() {
  NODES.length = 0; LINES.length = 0;
  dragging = false; lastNode = null; currentPath = [];
  startTime = null; endTime = null;
  timerInterval && clearInterval(timerInterval); timerInterval = null;
  errorCount = 0; started = false;
  setupNodes(); drawAll();
  updateTimerDisplay(); updateErrorDisplay();
}

// 保證一載入就彈窗規則！
document.addEventListener('DOMContentLoaded', function() {
  showPopup(`【遊戲規則】<br>
1. 依序點擊並連線「1→A→2→B→3→C→...→13→L」，只能照順序交錯連線。<br>
2. 拖曳錯誤會彈窗提醒並記錯誤次數。<br>
3. 按「開始連線測驗」後開始計時，全部完成即顯示用時與錯誤數。<br><br>請點擊下方「開始連線測驗」按鈕開始！`);

  const btn = document.createElement('button');
  btn.textContent = '開始連線測驗';
  btn.className = 'tmt-restart';
  document.body.insertBefore(btn, document.getElementById('popup'));
  btn.onclick = () => {
    resetTest(); hidePopup(); btn.style.display = 'none'; started = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimerDisplay, 100);
    updateTimerDisplay();
  };
  setupNodes(); drawAll(); updateTimerDisplay(); updateErrorDisplay();
});

canvas.addEventListener('mousedown', (e)=>{
  if (!started) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  let node = getNodeAt(mx, my);
  if(LINES.length===0 && node && node.type==='num' && node.label==='1') {
    dragging = true; lastNode = node;
  }
  else if (LINES.length>0) {
    let exp = orderList[LINES.length];
    if(node && node.type === exp.type && node.label === exp.label) {
      dragging = true; lastNode = node;
    }
  }
  drawAll();
});
canvas.addEventListener('mousemove', (e)=>{
  if(!dragging || !lastNode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  currentPath = [mx, my];
  drawAll();
});
canvas.addEventListener('mouseup', (e)=>{
  if(!dragging || !lastNode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  let next = getNodeAt(mx, my);
  let expected = orderList[LINES.length+1];
  if (next && expected && next.type === expected.type && next.label === expected.label && next !== lastNode) {
    LINES.push({from: lastNode, to: next});
    lastNode = next;
    if(LINES.length === orderList.length - 1) {
      dragging = false;
      endTime = Date.now();
      updateTimerDisplay();
      clearInterval(timerInterval);
      setTimeout(()=>{
        showPopup("完成！總花費時間：" + ((endTime-startTime)/1000).toFixed(1) + " 秒<br>錯誤次數：" + errorCount);
      }, 100);
    }
  } else if(next && next !== lastNode) {
    errorCount += 1; updateErrorDisplay();
    let curr = orderList[LINES.length];
    let nextType = curr.type==='num' ? '字母' : '數字';
    showPopup(`你剛連到 ${lastNode.label}，下一個${nextType}是什麼？`);
  }
  dragging = false; currentPath = []; drawAll();
});

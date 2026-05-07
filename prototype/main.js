/* ═══════════════════════════════════════════════════════════════
   TextDiff — Main Application Logic
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// State Management
// ═══════════════════════════════════════════════════════════════

const state = {
  theme: localStorage.getItem('theme') || 'light',
  viewMode: 'split',
  currentTab: 0,
  tabs: [
    { left: MOCK_FILES.left, right: MOCK_FILES.right, diffResult: null }
  ],
  currentChunk: 0,
  totalChunks: 0,
  isCollapsed: false,
  scrollSyncEnabled: true
};

// ═══════════════════════════════════════════════════════════════
// Diff Algorithm (Myers-style)
// ═══════════════════════════════════════════════════════════════

function computeDiff(leftLines, rightLines, options = {}) {
  const { ignoreWhitespace = 'none', ignoreCase = false, ignoreLineEndings = true } = options;
  
  const processedLeft = leftLines.map(line => preprocessLine(line, { ignoreWhitespace, ignoreCase, ignoreLineEndings }));
  const processedRight = rightLines.map(line => preprocessLine(line, { ignoreWhitespace, ignoreCase, ignoreLineEndings }));
  
  const lcs = computeLCS(processedLeft, processedRight);
  const diffLines = [];
  const chunks = [];
  
  let leftIdx = 0, rightIdx = 0, lcsIdx = 0;
  let chunkStart = null;
  let lineNo = 0;
  
  while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
    if (lcsIdx < lcs.length && leftIdx < leftLines.length && rightIdx < rightLines.length) {
      const leftMatch = processedLeft[leftIdx] === lcs[lcsIdx];
      const rightMatch = processedRight[rightIdx] === lcs[lcsIdx];
      
      if (leftMatch && rightMatch) {
        if (chunkStart !== null) {
          chunks.push({
            startIndex: chunkStart,
            endIndex: lineNo - 1,
            type: 'change'
          });
          chunkStart = null;
        }
        
        diffLines.push({
          leftLineNo: leftIdx + 1,
          rightLineNo: rightIdx + 1,
          type: 'equal',
          leftContent: leftLines[leftIdx],
          rightContent: rightLines[rightIdx]
        });
        leftIdx++; rightIdx++; lcsIdx++; lineNo++;
        continue;
      }
    }
    
    if (chunkStart === null) chunkStart = lineNo;
    
    if (leftIdx < leftLines.length && (lcsIdx >= lcs.length || processedLeft[leftIdx] !== lcs[lcsIdx])) {
      const rightContent = (rightIdx < rightLines.length && processedRight[rightIdx] !== (lcs[lcsIdx] || '')) 
        ? rightLines[rightIdx] : '';
      
      if (rightContent && processedRight[rightIdx] !== (lcs[lcsIdx] || '')) {
        const inlineDiff = computeInlineDiff(leftLines[leftIdx], rightLines[rightIdx]);
        diffLines.push({
          leftLineNo: leftIdx + 1,
          rightLineNo: rightIdx + 1,
          type: 'replace',
          leftContent: leftLines[leftIdx],
          rightContent: rightLines[rightIdx],
          inlineDiff
        });
        leftIdx++; rightIdx++; lineNo++;
      } else {
        diffLines.push({
          leftLineNo: leftIdx + 1,
          rightLineNo: null,
          type: 'delete',
          leftContent: leftLines[leftIdx],
          rightContent: ''
        });
        leftIdx++; lineNo++;
      }
    } else if (rightIdx < rightLines.length) {
      diffLines.push({
        leftLineNo: null,
        rightLineNo: rightIdx + 1,
        type: 'insert',
        leftContent: '',
        rightContent: rightLines[rightIdx]
      });
      rightIdx++; lineNo++;
    }
  }
  
  if (chunkStart !== null) {
    chunks.push({
      startIndex: chunkStart,
      endIndex: lineNo - 1,
      type: 'change'
    });
  }
  
  const stats = {
    totalLines: diffLines.length,
    equalLines: diffLines.filter(l => l.type === 'equal').length,
    insertedLines: diffLines.filter(l => l.type === 'insert').length,
    deletedLines: diffLines.filter(l => l.type === 'delete').length,
    modifiedLines: diffLines.filter(l => l.type === 'replace').length,
    chunkCount: chunks.length
  };
  
  return { lines: diffLines, chunks, stats, computedAt: Date.now() };
}

function preprocessLine(line, options) {
  let processed = line;
  
  if (options.ignoreLineEndings) {
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
  
  if (options.ignoreWhitespace === 'leading-trailing') {
    processed = processed.trim();
  } else if (options.ignoreWhitespace === 'all') {
    processed = processed.replace(/\s+/g, '');
  }
  
  if (options.ignoreCase) {
    processed = processed.toLowerCase();
  }
  
  return processed;
}

function computeLCS(left, right) {
  const m = left.length, n = right.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      lcs.unshift(left[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

function computeInlineDiff(leftLine, rightLine) {
  const left = leftLine.split('');
  const right = rightLine.split('');
  
  const leftSegments = [];
  const rightSegments = [];
  
  const lcs = computeCharLCS(left, right);
  
  let leftIdx = 0, rightIdx = 0, lcsIdx = 0;
  
  while (leftIdx < left.length || rightIdx < right.length) {
    if (lcsIdx < lcs.length && leftIdx < left.length && left[leftIdx] === lcs[lcsIdx]) {
      if (rightIdx < right.length && right[rightIdx] === lcs[lcsIdx]) {
        leftSegments.push({ text: left[leftIdx], type: 'equal' });
        rightSegments.push({ text: right[rightIdx], type: 'equal' });
        leftIdx++; rightIdx++; lcsIdx++;
        continue;
      }
    }
    
    if (leftIdx < left.length && (lcsIdx >= lcs.length || left[leftIdx] !== lcs[lcsIdx])) {
      leftSegments.push({ text: left[leftIdx], type: 'delete' });
      leftIdx++;
    }
    
    if (rightIdx < right.length && (lcsIdx >= lcs.length || right[rightIdx] !== lcs[lcsIdx])) {
      rightSegments.push({ text: right[rightIdx], type: 'insert' });
      rightIdx++;
    }
  }
  
  return { left: mergeSegments(leftSegments), right: mergeSegments(rightSegments) };
}

function computeCharLCS(left, right) {
  const m = left.length, n = right.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      lcs.unshift(left[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

function mergeSegments(segments) {
  if (segments.length === 0) return [];
  
  const merged = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type === merged[merged.length - 1].type) {
      merged[merged.length - 1].text += segments[i].text;
    } else {
      merged.push(segments[i]);
    }
  }
  return merged;
}

// ═══════════════════════════════════════════════════════════════
// Render Functions
// ═══════════════════════════════════════════════════════════════

function renderDiffView() {
  console.log('renderDiffView called');
  const tab = state.tabs[state.currentTab];
  if (!tab) return;
  
  const leftLines = tab.left.content.split('\n');
  const rightLines = tab.right.content.split('\n');
  
  tab.diffResult = computeDiff(leftLines, rightLines, {
    ignoreWhitespace: 'leading-trailing',
    ignoreLineEndings: true
  });
  
  const { lines, chunks, stats } = tab.diffResult;
  
  state.totalChunks = chunks.length;
  state.currentChunk = 0;
  
  updateStats(stats);
  updateChunkCounter();
  
  const leftEditor = document.getElementById('left-editor');
  const rightEditor = document.getElementById('right-editor');
  
  if (!leftEditor || !rightEditor) {
    console.error('Editor elements not found');
    return;
  }
  
  leftEditor.innerHTML = '';
  rightEditor.innerHTML = '';
  
  let collapsedCount = 0;
  let inCollapsedSection = false;
  
  lines.forEach((line, idx) => {
    if (state.isCollapsed && line.type === 'equal') {
      if (!inCollapsedSection) {
        collapsedCount = 1;
        inCollapsedSection = true;
      } else {
        collapsedCount++;
      }
      return;
    }
    
    if (inCollapsedSection && line.type !== 'equal') {
      if (collapsedCount > 3) {
        leftEditor.appendChild(createFoldedLine(collapsedCount, 'left'));
        rightEditor.appendChild(createFoldedLine(collapsedCount, 'right'));
      }
      inCollapsedSection = false;
      collapsedCount = 0;
    }
    
    const leftEl = createDiffLine(line, 'left', idx);
    const rightEl = createDiffLine(line, 'right', idx);
    
    leftEditor.appendChild(leftEl);
    rightEditor.appendChild(rightEl);
  });
  
  renderMinimap();
}

function createDiffLine(line, side, idx) {
  const div = document.createElement('div');
  div.className = 'diff-line';
  div.dataset.index = idx;
  
  if (line.type === 'insert') div.classList.add('added');
  if (line.type === 'delete') div.classList.add('deleted');
  if (line.type === 'replace') div.classList.add('modified');
  
  const lineNo = document.createElement('div');
  lineNo.className = 'line-number';
  lineNo.textContent = side === 'left' ? (line.leftLineNo || '') : (line.rightLineNo || '');
  
  const gutter = document.createElement('div');
  gutter.className = 'line-gutter';
  
  if (line.type === 'insert') gutter.textContent = '+';
  if (line.type === 'delete') gutter.textContent = '-';
  if (line.type === 'replace') gutter.textContent = '~';
  
  const content = document.createElement('div');
  content.className = 'line-content';
  
  const text = side === 'left' ? line.leftContent : line.rightContent;
  
  if (line.inlineDiff && line.type === 'replace') {
    const segments = side === 'left' ? line.inlineDiff.left : line.inlineDiff.right;
    content.innerHTML = renderInlineDiff(segments);
  } else {
    content.textContent = text || '\u00A0';
  }
  
  div.appendChild(lineNo);
  div.appendChild(gutter);
  div.appendChild(content);
  
  return div;
}

function renderInlineDiff(segments) {
  return segments.map(seg => {
    const escaped = escapeHtml(seg.text);
    if (seg.type === 'delete') return `<span class="deleted-chunk">${escaped}</span>`;
    if (seg.type === 'insert') return `<span class="added-chunk">${escaped}</span>`;
    return escaped;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createFoldedLine(count, side) {
  const div = document.createElement('div');
  div.className = 'diff-line folded';
  div.onclick = () => {
    state.isCollapsed = false;
    renderDiffView();
  };
  
  const lineNo = document.createElement('div');
  lineNo.className = 'line-number';
  lineNo.textContent = '...';
  
  const gutter = document.createElement('div');
  gutter.className = 'line-gutter';
  
  const content = document.createElement('div');
  content.className = 'folded-placeholder';
  content.innerHTML = `<span class="folded-count">${count} 行相同</span> — 点击展开`;
  
  div.appendChild(lineNo);
  div.appendChild(gutter);
  div.appendChild(content);
  
  return div;
}

function renderMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  const container = document.getElementById('diff-editor-container');
  const tab = state.tabs[state.currentTab];
  
  if (!canvas || !container || !tab || !tab.diffResult) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const { lines } = tab.diffResult;
  const height = container.clientHeight - 20;
  
  canvas.height = height;
  canvas.width = 28;
  
  const scale = Math.max(1, Math.floor(height / lines.length));
  const gap = Math.max(0, (height - lines.length * scale) / 2);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const colors = {
    light: {
      equal: '#e9ecef',
      insert: '#acf2bd',
      delete: '#fdb8c0',
      replace: '#ffdf5d'
    },
    dark: {
      equal: '#333333',
      insert: '#2ea043',
      delete: '#f85149',
      replace: '#d4a017'
    }
  };
  
  const themeColors = colors[state.theme] || colors.light;
  
  lines.forEach((line, idx) => {
    const y = gap + idx * scale;
    const h = Math.max(1, scale - 0.5);
    
    ctx.fillStyle = themeColors[line.type] || themeColors.equal;
    ctx.fillRect(4, y, 20, h);
  });
}

function renderUnifiedView() {
  console.log('renderUnifiedView called');
  const tab = state.tabs[state.currentTab];
  console.log('tab:', tab);
  if (!tab) return;
  
  if (!tab.diffResult) {
    console.log('Computing diff...');
    const leftLines = tab.left.content.split('\n');
    const rightLines = tab.right.content.split('\n');
    tab.diffResult = computeDiff(leftLines, rightLines, {
      ignoreWhitespace: 'leading-trailing',
      ignoreLineEndings: true
    });
    console.log('diffResult:', tab.diffResult);
  }
  
  const { lines } = tab.diffResult;
  console.log('lines count:', lines.length);
  const container = document.getElementById('unified-content');
  console.log('container:', container);
  
  if (!container) {
    console.error('unified-content not found');
    return;
  }
  
  container.innerHTML = '';
  
  lines.forEach((line, idx) => {
    const div = document.createElement('div');
    div.className = 'unified-line';
    div.dataset.index = idx;
    
    if (line.type === 'insert') div.classList.add('unified-added');
    if (line.type === 'delete') div.classList.add('unified-deleted');
    
    const gutter = document.createElement('div');
    gutter.className = 'unified-gutter';
    
    if (line.type === 'insert') gutter.textContent = '+';
    if (line.type === 'delete') gutter.textContent = '-';
    
    const lineNums = document.createElement('div');
    lineNums.className = 'unified-line-nums';
    lineNums.innerHTML = `<span>${line.leftLineNo || ''}</span><span>${line.rightLineNo || ''}</span>`;
    
    const content = document.createElement('div');
    content.className = 'line-content';
    
    if (line.inlineDiff && line.type === 'replace') {
      const segments = line.type === 'delete' ? line.inlineDiff.left : line.inlineDiff.right;
      content.innerHTML = renderInlineDiff(segments);
    } else {
      content.textContent = (line.type === 'delete' ? line.leftContent : line.rightContent) || '\u00A0';
    }
    
    div.appendChild(gutter);
    div.appendChild(lineNums);
    div.appendChild(content);
    container.appendChild(div);
  });
}

function renderDirectoryView() {
  console.log('renderDirectoryView called');
  const container = document.getElementById('dir-tree');
  console.log('container:', container);
  
  if (!container) {
    console.error('dir-tree not found');
    return;
  }
  
  console.log('DIRECTORY_DATA:', typeof DIRECTORY_DATA !== 'undefined' ? DIRECTORY_DATA : 'undefined');
  container.innerHTML = '';
  
  if (typeof DIRECTORY_DATA !== 'undefined') {
    DIRECTORY_DATA.forEach(node => {
      container.appendChild(createTreeNode(node, 0));
    });
  }
  console.log('Directory view rendered');
}

function createTreeNode(node, depth) {
  const div = document.createElement('div');
  div.className = 'tree-node';
  
  const header = document.createElement('div');
  header.className = 'tree-node-header';
  header.style.paddingLeft = (depth * 16 + 8) + 'px';
  
  const toggle = document.createElement('div');
  toggle.className = 'tree-node-toggle' + (node.type === 'directory' ? '' : ' hidden');
  toggle.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;
  
  if (node.type === 'directory') {
    toggle.onclick = (e) => {
      e.stopPropagation();
      toggle.classList.toggle('expanded');
      const children = div.querySelector('.tree-node-children');
      if (children) children.style.display = toggle.classList.contains('expanded') ? 'block' : 'none';
    };
  }
  
  const icon = document.createElement('div');
  icon.className = 'tree-node-icon ' + (node.type === 'directory' ? 'folder' : 'file');
  icon.innerHTML = node.type === 'directory' 
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
  
  const name = document.createElement('div');
  name.className = 'tree-node-name';
  name.textContent = node.name;
  
  header.appendChild(toggle);
  header.appendChild(icon);
  header.appendChild(name);
  
  if (node.status !== 'equal') {
    const status = document.createElement('div');
    status.className = 'tree-node-status ' + node.status;
    status.textContent = {
      'modified': '修改',
      'left-only': '左侧',
      'right-only': '右侧'
    }[node.status] || '';
    header.appendChild(status);
  }
  
  header.onclick = () => {
    document.querySelectorAll('.tree-node-header.selected').forEach(el => el.classList.remove('selected'));
    header.classList.add('selected');
  };
  
  div.appendChild(header);
  
  if (node.children && node.children.length > 0) {
    const children = document.createElement('div');
    children.className = 'tree-node-children';
    children.style.display = 'none';
    node.children.forEach(child => {
      children.appendChild(createTreeNode(child, depth + 1));
    });
    div.appendChild(children);
  }
  
  return div;
}

// ═══════════════════════════════════════════════════════════════
// UI Interactions
// ═══════════════════════════════════════════════════════════════

function updateStats(stats) {
  const elChunks = document.getElementById('stat-chunks');
  const elAdded = document.getElementById('stat-added');
  const elDeleted = document.getElementById('stat-deleted');
  const elModified = document.getElementById('stat-modified');
  const elLeftLines = document.getElementById('left-lines');
  const elRightLines = document.getElementById('right-lines');
  
  if (elChunks) elChunks.textContent = stats.chunkCount + ' 块';
  if (elAdded) elAdded.textContent = '+' + stats.insertedLines + ' 行';
  if (elDeleted) elDeleted.textContent = '-' + stats.deletedLines + ' 行';
  if (elModified) elModified.textContent = '~' + stats.modifiedLines + ' 行';
  
  const tab = state.tabs[state.currentTab];
  if (elLeftLines && tab) elLeftLines.textContent = tab.left.content.split('\n').length;
  if (elRightLines && tab) elRightLines.textContent = tab.right.content.split('\n').length;
}

function updateChunkCounter() {
  const elCurrent = document.getElementById('current-chunk');
  const elTotal = document.getElementById('total-chunks');
  if (elCurrent) elCurrent.textContent = state.currentChunk + 1;
  if (elTotal) elTotal.textContent = state.totalChunks;
}

function setViewMode(mode) {
  console.log('setViewMode called with mode:', mode);
  state.viewMode = mode;
  
  document.querySelectorAll('.view-mode-btn').forEach(btn => btn.classList.remove('active'));
  
  const btnId = mode === 'directory' ? 'btn-dir' : 'btn-' + mode;
  const btn = document.getElementById(btnId);
  console.log('btnId:', btnId, 'btn:', btn);
  if (btn) btn.classList.add('active');
  
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  
  if (mode === 'split') {
    document.getElementById('view-split').classList.add('active');
    renderDiffView();
  } else if (mode === 'unified') {
    const viewUnified = document.getElementById('view-unified');
    console.log('view-unified:', viewUnified);
    viewUnified.classList.add('active');
    renderUnifiedView();
  } else if (mode === 'directory') {
    const viewDirectory = document.getElementById('view-directory');
    console.log('view-directory:', viewDirectory);
    viewDirectory.classList.add('active');
    renderDirectoryView();
  }
}

function navigateDiff(direction) {
  const tab = state.tabs[state.currentTab];
  if (!tab || !tab.diffResult || tab.diffResult.chunks.length === 0) return;
  
  const chunks = tab.diffResult.chunks;
  
  switch (direction) {
    case 'first':
      state.currentChunk = 0;
      break;
    case 'prev':
      state.currentChunk = Math.max(0, state.currentChunk - 1);
      break;
    case 'next':
      state.currentChunk = Math.min(chunks.length - 1, state.currentChunk + 1);
      break;
    case 'last':
      state.currentChunk = chunks.length - 1;
      break;
  }
  
  updateChunkCounter();
  scrollToChunk(chunks[state.currentChunk]);
}

function scrollToChunk(chunk) {
  const leftEditor = document.getElementById('left-editor');
  const rightEditor = document.getElementById('right-editor');
  
  const leftLines = leftEditor.querySelectorAll('.diff-line');
  const rightLines = rightEditor.querySelectorAll('.diff-line');
  
  leftLines.forEach(el => el.classList.remove('active'));
  rightLines.forEach(el => el.classList.remove('active'));
  
  const targetLine = chunk.startIndex;
  
  if (leftLines[targetLine]) {
    leftLines[targetLine].classList.add('active');
    leftLines[targetLine].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (rightLines[targetLine]) {
    rightLines[targetLine].classList.add('active');
  }
}

function syncScroll(source) {
  if (!state.scrollSyncEnabled) return;
  
  const leftScroll = document.getElementById('left-scroll');
  const rightScroll = document.getElementById('right-scroll');
  
  if (source === 'left') {
    rightScroll.scrollTop = leftScroll.scrollTop;
  } else {
    leftScroll.scrollTop = rightScroll.scrollTop;
  }
}

function toggleCollapse() {
  state.isCollapsed = !state.isCollapsed;
  renderDiffView();
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  
  document.getElementById('icon-sun').style.display = state.theme === 'light' ? 'block' : 'none';
  document.getElementById('icon-moon').style.display = state.theme === 'dark' ? 'block' : 'none';
  
  renderMinimap();
}

function toggleIgnorePanel() {
  const overlay = document.getElementById('overlay-ignore');
  overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
}

function toggleSearch() {
  const searchBox = document.getElementById('search-box');
  const input = document.getElementById('search-input');
  
  if (searchBox.style.display === 'none') {
    searchBox.style.display = 'flex';
    input.focus();
  } else {
    closeSearch();
  }
}

function closeSearch() {
  document.getElementById('search-box').style.display = 'none';
  document.getElementById('search-input').value = '';
}

function openPasteDialog() {
  document.getElementById('overlay-paste').style.display = 'flex';
}

function closePasteDialog() {
  document.getElementById('overlay-paste').style.display = 'none';
}

function comparePastedText() {
  const leftText = document.getElementById('paste-left').value;
  const rightText = document.getElementById('paste-right').value;
  
  if (!leftText && !rightText) return;
  
  state.tabs[state.currentTab] = {
    left: { ...MOCK_FILES.left, content: leftText, path: null },
    right: { ...MOCK_FILES.right, content: rightText, path: null },
    diffResult: null
  };
  
  closePasteDialog();
  setViewMode('split');
}

function addTab() {
  const newTab = {
    left: { ...MOCK_FILES.left, content: '' },
    right: { ...MOCK_FILES.right, content: '' },
    diffResult: null
  };
  
  state.tabs.push(newTab);
  state.currentTab = state.tabs.length - 1;
  
  updateTabBar();
  setViewMode('split');
  
  document.getElementById('view-welcome').style.display = 'flex';
  document.getElementById('view-split').classList.remove('active');
}

function closeTab(event, idx) {
  event.stopPropagation();
  
  if (state.tabs.length <= 1) return;
  
  state.tabs.splice(idx, 1);
  
  if (state.currentTab >= state.tabs.length) {
    state.currentTab = state.tabs.length - 1;
  }
  
  updateTabBar();
  renderDiffView();
}

function switchTab(idx) {
  state.currentTab = idx;
  
  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === idx);
  });
  
  renderDiffView();
}

function updateTabBar() {
  const tabBar = document.querySelector('.tab-bar');
  const existingTabs = tabBar.querySelectorAll('.tab');
  existingTabs.forEach(tab => tab.remove());
  
  state.tabs.forEach((tab, idx) => {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab' + (idx === state.currentTab ? ' active' : '');
    tabEl.id = 'tab-' + idx;
    tabEl.setAttribute('role', 'tab');
    tabEl.setAttribute('aria-selected', idx === state.currentTab);
    
    const name = tab.left.path && tab.right.path
      ? `${tab.left.path.split('/').pop()} vs ${tab.right.path.split('/').pop()}`
      : '新对比';
    
    const badge = tab.diffResult ? `<span class="tab-badge">${tab.diffResult.stats.chunkCount}</span>` : '';
    
    tabEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
      <span class="tab-title">${name}</span>
      ${badge}
      <button class="tab-close" onclick="closeTab(event, ${idx})" aria-label="关闭标签">×</button>
    `;
    
    tabEl.onclick = () => switchTab(idx);
    
    tabBar.insertBefore(tabEl, tabBar.querySelector('.tab-add'));
  });
}

function swapFiles() {
  const tab = state.tabs[state.currentTab];
  [tab.left, tab.right] = [tab.right, tab.left];
  
  [document.getElementById('file-info-left').querySelector('.file-path').textContent,
   document.getElementById('file-info-right').querySelector('.file-path').textContent] =
  [document.getElementById('file-info-right').querySelector('.file-path').textContent,
   document.getElementById('file-info-left').querySelector('.file-path').textContent];
  
  renderDiffView();
}

function openFileDialog(side) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.js,.ts,.json,.yml,.yaml,.md,.html,.css,.py,.go,.rs,.c,.cpp,.h,.java';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const tab = state.tabs[state.currentTab];
      const fileInfo = {
        path: file.name,
        content: ev.target.result,
        encoding: 'UTF-8',
        lineEnding: ev.target.result.includes('\r\n') ? 'crlf' : 'lf',
        language: detectLanguage(file.name)
      };
      
      if (side === 'left' || side === 'both') {
        tab.left = fileInfo;
        document.getElementById('file-info-left').querySelector('.file-path').textContent = file.name;
      }
      if (side === 'right' || side === 'both') {
        tab.right = fileInfo;
        document.getElementById('file-info-right').querySelector('.file-path').textContent = file.name;
      }
      
      document.getElementById('view-welcome').style.display = 'none';
      setViewMode('split');
    };
    reader.readAsText(file);
  };
  
  input.click();
}

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'html': 'html',
    'css': 'css',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'java': 'java',
    'xml': 'xml',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell'
  };
  return langMap[ext] || 'plaintext';
}

function addRegexRule() {
  const list = document.getElementById('regex-list');
  const item = document.createElement('div');
  item.className = 'regex-item';
  item.innerHTML = `
    <input type="text" class="regex-input" placeholder="例：^\\s*#.*$">
    <button class="regex-remove" onclick="this.parentElement.remove()" aria-label="删除规则">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;
  list.appendChild(item);
}

function applyIgnoreRules() {
  toggleIgnorePanel();
  renderDiffView();
}

function resetIgnoreRules() {
  document.getElementById('ign-ws').checked = true;
  document.getElementById('ign-case').checked = false;
  document.getElementById('ign-eol').checked = true;
  document.querySelectorAll('input[name="ws"]')[1].checked = true;
  document.querySelector('input[name="algo"][value="myers"]').checked = true;
}

// ═══════════════════════════════════════════════════════════════
// Drag & Drop
// ═══════════════════════════════════════════════════════════════

function setupDragDrop() {
  const app = document.getElementById('app');
  const overlay = document.getElementById('drop-overlay');
  
  let dragCounter = 0;
  
  app.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    overlay.style.display = 'flex';
  });
  
  app.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      overlay.style.display = 'none';
    }
  });
  
  app.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  app.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    overlay.style.display = 'none';
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const tab = state.tabs[state.currentTab];
    
    if (files.length >= 1) {
      readFileAsText(files[0], (content) => {
        tab.left = {
          path: files[0].name,
          content,
          encoding: 'UTF-8',
          lineEnding: content.includes('\r\n') ? 'crlf' : 'lf',
          language: detectLanguage(files[0].name)
        };
        
        if (files.length >= 2) {
          readFileAsText(files[1], (content2) => {
            tab.right = {
              path: files[1].name,
              content: content2,
              encoding: 'UTF-8',
              lineEnding: content2.includes('\r\n') ? 'crlf' : 'lf',
              language: detectLanguage(files[1].name)
            };
            setViewMode('split');
          });
        } else {
          setViewMode('split');
        }
      });
    }
  });
}

function readFileAsText(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => callback(e.target.result);
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════════════════════════════

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'o':
          e.preventDefault();
          openFileDialog('both');
          break;
        case 'l':
          e.preventDefault();
          openFileDialog('left');
          break;
        case 'r':
          e.preventDefault();
          openFileDialog('right');
          break;
        case 'f':
          e.preventDefault();
          toggleSearch();
          break;
        case 't':
          if (e.shiftKey) {
            e.preventDefault();
            toggleTheme();
          } else {
            e.preventDefault();
            addTab();
          }
          break;
        case 'w':
          e.preventDefault();
          closeTab(new Event('click'), state.currentTab);
          break;
        case 's':
          e.preventDefault();
          saveSession();
          break;
        case '1':
          e.preventDefault();
          setViewMode('split');
          break;
        case '2':
          e.preventDefault();
          setViewMode('unified');
          break;
        case '3':
          e.preventDefault();
          setViewMode('directory');
          break;
      }
    }
    
    if (e.shiftKey && e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      toggleCollapse();
    }
    
    if (e.shiftKey && e.ctrlKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      setViewMode(state.viewMode === 'split' ? 'unified' : 'split');
    }
    
    if (!e.ctrlKey && !e.metaKey) {
      switch (e.key) {
        case 'F7':
          e.preventDefault();
          navigateDiff('next');
          break;
        case 'F6':
          e.preventDefault();
          navigateDiff('prev');
          break;
        case 'Home':
          if (e.altKey) {
            e.preventDefault();
            navigateDiff('first');
          }
          break;
        case 'End':
          if (e.altKey) {
            e.preventDefault();
            navigateDiff('last');
          }
          break;
        case 'ArrowDown':
          if (e.altKey) {
            e.preventDefault();
            navigateDiff('next');
          }
          break;
        case 'ArrowUp':
          if (e.altKey) {
            e.preventDefault();
            navigateDiff('prev');
          }
          break;
        case 'Escape':
          closeSearch();
          toggleIgnorePanel();
          closePasteDialog();
          break;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// Recent Sessions
// ═══════════════════════════════════════════════════════════════

function renderRecentSessions() {
  const list = document.getElementById('session-list');
  if (!list) return;
  list.innerHTML = '';
  
  RECENT_SESSIONS.forEach(session => {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
      <span class="session-item-name">${session.name}</span>
      <span class="session-item-time">${session.time}</span>
    `;
    item.onclick = () => {
      console.log('Load session:', session.id);
    };
    list.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════

function init() {
  console.log('TextDiff init started');
  document.documentElement.setAttribute('data-theme', state.theme);
  
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  if (state.theme === 'dark') {
    if (iconSun) iconSun.style.display = 'none';
    if (iconMoon) iconMoon.style.display = 'block';
  }
  
  setupDragDrop();
  setupKeyboardShortcuts();
  renderRecentSessions();
  renderDiffView();
  
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', toggleTheme);
  }
  
  window.addEventListener('resize', () => {
    renderMinimap();
  });
  
  console.log('TextDiff init completed');
}

function saveSession() {
  console.log('Save session');
  alert('会话已保存');
}

function closeCurrentTab() {
  if (state.tabs.length <= 1) return;
  closeTab(new Event('click'), state.currentTab);
}

function showSessionList() {
  console.log('Show session list');
  alert('会话历史功能');
}

function showSettings() {
  console.log('Show settings');
  alert('首选项功能');
}

function showShortcuts() {
  const shortcuts = `快捷键列表:
  
Ctrl+O     打开文件对
Ctrl+L     打开左侧文件
Ctrl+R     打开右侧文件
Ctrl+S     保存会话
Ctrl+T     新建对比标签
Ctrl+W     关闭当前标签
Ctrl+F     搜索
Ctrl+1     双栏视图
Ctrl+2     统一视图
Ctrl+3     目录视图
Ctrl+Shift+C  折叠相同区域
Ctrl+Shift+T  切换主题
F6         上一处差异
F7         下一处差异
Alt+↑      上一处差异
Alt+↓      下一处差异
Alt+Home   第一处差异
Alt+End    最后一处差异`;
  alert(shortcuts);
}

function showAbout() {
  alert('TextDiff v1.0.0\n\n专业文本对比工具\n\n支持行级/字符级差异高亮\n支持目录对比\n支持三路合并');
}

document.addEventListener('DOMContentLoaded', init);

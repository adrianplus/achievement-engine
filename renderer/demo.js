(function () {
  'use strict';
  const config = window.DEMO_ACHIEVEMENT_CONFIG;
  const $ = id => document.getElementById(id);
  const engine = new AchievementEngine({ config, onUnlock: render });
  let message = '依序完成關卡，逐步喚醒這座迷宮世界。';
  let revealFinalWorld = false;

  const imagePaths = {
    initial: 'assets/world/001.jpg',
    sky: 'assets/world/002.jpg',
    maze: 'assets/world/003.jpg',
    final: 'assets/world/004.jpg'
  };

  function unlockedStageCount() {
    return engine.getProgress().completed;
  }

  function renderWorld() {
    const count = unlockedStageCount();
    let src = imagePaths.initial;
    let caption = '初始世界｜探險者帶著數獨地圖，進入沉睡的迷宮';
    if (count >= 45 && revealFinalWorld) {
      src = imagePaths.final;
      caption = '世界完全甦醒｜45 個里程碑全部完成';
    } else if (count >= 45) {
      src = imagePaths.maze;
      caption = '迷宮恢復色彩｜最後的世界即將揭曉';
    } else if (count >= 44) {
      src = imagePaths.sky;
      caption = '天空恢復色彩';
    }
    $('world-image').src = src;
    $('world-image').alt = caption;
    $('world-caption').textContent = caption;
    $('world-image').classList.toggle('final-reveal', count >= 45 && revealFinalWorld);
    $('reveal-final').hidden = !(count >= 45) || revealFinalWorld;
    // 1～43 的透明物件圖層由 manifest 自動載入；尚未提供的圖層會略過，不影響進度資料。
    const layerHost = $('object-layers');
    layerHost.replaceChildren();
    for (let n = 1; n <= Math.min(count, 43); n++) {
      const id = `object-${String(n).padStart(2, '0')}`;
      const img = document.createElement('img');
      img.src = `assets/layers/${id}.png`;
      img.alt = '';
      img.dataset.layer = id;
      img.onerror = () => img.remove();
      layerHost.appendChild(img);
    }
  }

  function render() {
    const progress = engine.getProgress();
    $('completed').textContent = progress.completed;
    $('total').textContent = progress.total;
    $('percent').textContent = progress.percent + '%';
    $('progress-fill').style.width = progress.percent + '%';
    $('message').textContent = message;
    $('reward-count').textContent = progress.unlockedCount;
    $('next-stage').textContent = progress.completed >= 45 ? '全部完成' : `下一關：第 ${progress.completed + 1} 關`;
    $('stage-input').value = Math.min(45, progress.completed + 1);
    renderWorld();
    document.querySelectorAll('[data-stage]').forEach(button => {
      const stage = Number(button.dataset.stage);
      button.classList.toggle('done', engine.getState().completedEvents.includes(`level-${stage}-completed`));
    });
  }

  function completeStage(stage) {
    const result = engine.record({ gameId: config.gameId, eventId: `level-${stage}-completed`, eventType: 'level_completed' });
    message = result.duplicate ? `第 ${stage} 關已經領取過，不會重複發放。` : result.unknownEvent ? '找不到這個任務的設定。' : `第 ${stage} 關完成，成就紀錄已保存。`;
    render();
  }

  $('reveal-final').addEventListener('click', () => { revealFinalWorld = true; message = '最終完整世界已揭曉！'; render(); });
  $('complete-next').addEventListener('click', () => {
    const next = engine.getProgress().completed + 1;
    if (next <= 45) completeStage(next);
  });
  $('complete-selected').addEventListener('click', () => completeStage(Number($('stage-input').value)));
  $('export').addEventListener('click', () => {
    const blob = new Blob([engine.exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'achievement-world-progress.json'; a.click(); URL.revokeObjectURL(url);
    message = '已產生成就進度備份檔。'; render();
  });
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { engine.importProgress(await file.text()); message = '進度匯入成功。'; }
    catch (error) { message = '匯入失敗：' + error.message; }
    event.target.value = ''; render();
  });
  $('reset').addEventListener('click', () => {
    if (!confirm('確定清除這個迷宮世界的成就進度？')) return;
    engine.resetProgress(); revealFinalWorld = false; message = '示範進度已清除。'; render();
  });
  render();
})();

(function () {
  'use strict';
  const config = window.DEMO_ACHIEVEMENT_CONFIG;
  const $ = id => document.getElementById(id);
  const engine = new AchievementEngine({ config, onUnlock: render });
  let message = '依序完成關卡，逐步喚醒這座迷宮世界。';
  let hasInitializedWorld = false;
  let lastRenderedCount = unlockedStageCount();
  let finalRevealStep = Number(localStorage.getItem('achievement-engine:maze-world-demo:final-reveal-step') || 0);
  if (![0, 1, 2].includes(finalRevealStep)) finalRevealStep = 0;

  const imagePaths = {
    initial: 'assets/world/001.jpg',
    sky: 'assets/world/002.jpg',
    maze: 'assets/world/003.jpg',
    finalUnsolved: 'assets/world/004.jpg',
    finalSolved: 'assets/world/005.jpg'
  };

  function unlockedStageCount() {
    return engine.getProgress().completed;
  }

  function renderWorld() {
    const count = unlockedStageCount();
    const caption = count === 0 ? '初始世界｜空白迷宮，等待第一隻蝴蝶出現' : '第1步完成｜蝴蝶已出現，並留在迷宮裡';
    $('world-image').src = imagePaths.initial;
    $('world-image').alt = caption;
    $('world-caption').textContent = caption;
    $('reveal-final').hidden = true;
    const solutionButton = $('reveal-solution');
    if (solutionButton) solutionButton.hidden = true;

    // 只有本次遊玩剛解鎖時播放出現動畫；重新整理不會重播。
    const shouldAnimate = hasInitializedWorld && count > lastRenderedCount;
    const host = $('object-layers');
    if (count !== lastRenderedCount || !hasInitializedWorld) {
      host.replaceChildren();
      if (count >= 1) {
        const flash = document.createElement('div');
        flash.className = shouldAnimate ? 'event-flash play' : 'event-flash';
        flash.setAttribute('aria-hidden', 'true');
        flash.style.left = '21.9%'; flash.style.top = '60.7%';
        flash.style.width = '8.4%'; flash.style.height = '11.5%';
        host.appendChild(flash);

        const img = document.createElement('img');
        img.src = 'assets/layers/object-01.png';
        img.alt = '第1步解鎖的蝴蝶';
        img.dataset.layer = 'object-01';
        img.style.left = '23.193%'; img.style.top = '62.012%';
        img.style.width = '5.762%'; img.style.height = '8.934%';
        if (shouldAnimate) img.classList.add('butterfly-appear');
        host.appendChild(img);
      }
    }
    lastRenderedCount = count;
    hasInitializedWorld = true;
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

  $('reveal-final').addEventListener('click', () => {
    finalRevealStep = 1;
    localStorage.setItem('achievement-engine:maze-world-demo:final-reveal-step', '1');
    message = '完整彩色世界已揭曉，接下來可以查看數獨答案。';
    render();
  });
  $('reveal-solution').addEventListener('click', () => {
    finalRevealStep = 2;
    localStorage.setItem('achievement-engine:maze-world-demo:final-reveal-step', '2');
    message = '數獨最終答案揭曉！45 個里程碑全部完成。';
    render();
  });
  $('complete-next').addEventListener('click', () => {
    // 僅允許依序完成下一個里程碑，避免示範介面跳關造成進度與關卡順序不一致。
    const completed = engine.getState().completedEvents.length;
    const next = completed + 1;
    if (next <= config.totalMilestones) completeStage(next);
    else {
      message = '45 個里程碑已全部完成。';
      render();
    }
  });
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
    engine.resetProgress();
    finalRevealStep = 0;
    localStorage.removeItem('achievement-engine:maze-world-demo:final-reveal-step');
    message = '示範進度已清除。';
    render();
  });
  render();
})();

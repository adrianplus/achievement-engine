// V1.1：45 個里程碑示範設定。1～43 為物件圖層插槽；44、45 為環境階段。
window.DEMO_ACHIEVEMENT_CONFIG = {
  gameId: 'maze-world-demo',
  worldId: 'renaissance-maze',
  totalMilestones: 45,
  milestones: Array.from({ length: 45 }, (_, index) => {
    const n = index + 1;
    const id = String(n).padStart(2, '0');
    let rewards;
    if (n <= 43) {
      rewards = [{ rewardId: `object-${id}`, rewardType: 'object', layerId: `object-${id}` }];
    } else if (n === 44) {
      rewards = [{ rewardId: 'environment-sky', rewardType: 'environment', layerId: 'sky' }];
    } else {
      rewards = [
        { rewardId: 'environment-maze', rewardType: 'environment', layerId: 'maze' },
        { rewardId: 'final-world', rewardType: 'environment', layerId: 'final-world' }
      ];
    }
    return { milestoneId: `milestone-${id}`, eventId: `level-${n}-completed`, eventType: 'level_completed', rewards };
  })
};

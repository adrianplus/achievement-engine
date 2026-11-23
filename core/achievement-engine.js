(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AchievementEngine = api.AchievementEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const DEFAULT_STORAGE = typeof localStorage !== 'undefined' ? localStorage : null;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function assert(condition, message) { if (!condition) throw new Error(message); }

  class AchievementEngine {
    constructor(options) {
      const opts = options || {};
      this.config = opts.config;
      this.storage = opts.storage === undefined ? DEFAULT_STORAGE : opts.storage;
      this.onUnlock = typeof opts.onUnlock === 'function' ? opts.onUnlock : function () {};
      assert(this.config && this.config.gameId, '設定缺少 gameId');
      assert(this.config.worldId, '設定缺少 worldId');
      assert(Array.isArray(this.config.milestones), '設定缺少 milestones 陣列');
      this._validateConfig();
      this.state = this._load();
    }

    _validateConfig() {
      const seenEvents = new Set();
      const seenRewards = new Set();
      for (const milestone of this.config.milestones) {
        assert(milestone.eventId, '每個 milestone 都必須有 eventId');
        assert(Array.isArray(milestone.rewards), 'milestone rewards 必須是陣列');
        assert(!seenEvents.has(milestone.eventId), 'eventId 重複：' + milestone.eventId);
        seenEvents.add(milestone.eventId);
        for (const reward of milestone.rewards) {
          assert(reward.rewardId && reward.rewardType, '每個 reward 都必須有 rewardId 與 rewardType');
          seenRewards.add(reward.rewardId);
        }
      }
    }

    _storageKey() { return 'achievement-engine:' + this.config.gameId; }

    _emptyState() {
      return {
        schemaVersion: 1,
        engineVersion: VERSION,
        gameId: this.config.gameId,
        worldId: this.config.worldId,
        completedEvents: [],
        unlockedRewards: [],
        updatedAt: null
      };
    }

    _load() {
      if (!this.storage) return this._emptyState();
      try {
        const raw = this.storage.getItem(this._storageKey());
        if (!raw) return this._emptyState();
        const parsed = JSON.parse(raw);
        this._validateState(parsed);
        return parsed;
      } catch (error) {
        console.warn('[AchievementEngine] 進度讀取失敗，使用空白紀錄：', error);
        return this._emptyState();
      }
    }

    _validateState(state) {
      assert(state && state.schemaVersion === 1, '不支援的進度格式');
      assert(state.gameId === this.config.gameId, '進度所屬遊戲不一致');
      assert(state.worldId === this.config.worldId, '進度所屬世界不一致');
      assert(Array.isArray(state.completedEvents), 'completedEvents 格式錯誤');
      assert(Array.isArray(state.unlockedRewards), 'unlockedRewards 格式錯誤');
    }

    _save() {
      this.state.updatedAt = new Date().toISOString();
      if (this.storage) this.storage.setItem(this._storageKey(), JSON.stringify(this.state));
      return this.getProgress();
    }

    record(event) {
      assert(event && event.gameId, '事件缺少 gameId');
      assert(event.gameId === this.config.gameId, '事件 gameId 不符合目前引擎');
      assert(event.eventId, '事件缺少 eventId');
      assert(event.eventType, '事件缺少 eventType');

      if (this.state.completedEvents.includes(event.eventId)) {
        return { accepted: false, duplicate: true, unlocked: [], progress: this.getProgress() };
      }

      const milestone = this.config.milestones.find(item => item.eventId === event.eventId);
      if (!milestone || (milestone.eventType && milestone.eventType !== event.eventType)) {
        return { accepted: false, duplicate: false, unknownEvent: true, unlocked: [], progress: this.getProgress() };
      }

      this.state.completedEvents.push(event.eventId);
      const newlyUnlocked = [];
      for (const reward of milestone.rewards) {
        if (!this.state.unlockedRewards.includes(reward.rewardId)) {
          this.state.unlockedRewards.push(reward.rewardId);
          newlyUnlocked.push(clone(reward));
        }
      }
      const progress = this._save();
      if (newlyUnlocked.length) this.onUnlock(clone(newlyUnlocked), progress);
      return { accepted: true, duplicate: false, unlocked: newlyUnlocked, progress };
    }

    isUnlocked(rewardId) { return this.state.unlockedRewards.includes(rewardId); }
    getUnlockedRewards() { return this.state.unlockedRewards.slice(); }
    getProgress() {
      const total = Number.isInteger(this.config.totalMilestones) ? this.config.totalMilestones : this.config.milestones.length;
      const completed = this.state.completedEvents.length;
      return { gameId: this.config.gameId, worldId: this.config.worldId, completed, total, remaining: Math.max(0, total - completed), percent: total ? Math.round(completed / total * 100) : 0, unlockedCount: this.state.unlockedRewards.length };
    }
    getState() { return clone(this.state); }

    exportProgress() {
      return JSON.stringify({ exportFormat: 'achievement-engine-progress', exportVersion: 1, exportedAt: new Date().toISOString(), state: this.getState() }, null, 2);
    }

    importProgress(jsonText) {
      const payload = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
      assert(payload && payload.exportFormat === 'achievement-engine-progress' && payload.exportVersion === 1, '不是支援的成就備份檔');
      this._validateState(payload.state);
      const knownEvents = new Set(this.config.milestones.map(item => item.eventId));
      const knownRewards = new Set(this.config.milestones.flatMap(item => item.rewards.map(reward => reward.rewardId)));
      assert(payload.state.completedEvents.every(id => knownEvents.has(id)), '備份包含目前設定不存在的事件');
      assert(payload.state.unlockedRewards.every(id => knownRewards.has(id)), '備份包含目前設定不存在的獎勵');
      this.state = clone(payload.state);
      this._save();
      return this.getProgress();
    }

    resetProgress() {
      this.state = this._emptyState();
      if (this.storage) this.storage.removeItem(this._storageKey());
      return this.getProgress();
    }
  }

  return { AchievementEngine, VERSION };
});

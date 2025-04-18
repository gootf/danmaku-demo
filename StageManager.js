// StageManager.js
export default class StageManager {
  constructor(scene) {
    this.scene = scene;
    this.maxStage = 6;
    this.currentStage = 0;
    this.toSpawn = 0;
    this.killed = 0;
    this.spawnTimer = null;
    this.stageCleared = false;
    // 每关敌人配置
    this.stageConfigs = [
      [ { type: 'normal', count: 10 } ],
      [ { type: 'normal', count: 8 }, { type: 'aim', count: 2 } ],
      [ { type: 'normal', count: 5 }, { type: 'aim', count: 3 }, { type: 'multi', count: 2 } ],
      [ { type: 'normal', count: 4 }, { type: 'aim', count: 4 }, { type: 'multi', count: 2 } ],
      [ { type: 'aim', count: 5 }, { type: 'multi', count: 5 } ],
      [ { type: 'multi', count: 10 } ]
    ];
  }

  startGame() {
    this.currentStage = 1;
    this.killed = 0;
    this.stageCleared = false;
    this.scene.events.emit('UI:updateStage', this.currentStage, this.maxStage);
    this.spawnStage();
  }

  nextStage() {
    this.currentStage++;
    this.killed = 0;
    this.stageCleared = false;
    this.scene.events.emit('UI:updateStage', this.currentStage, this.maxStage);
    this.spawnStage();
  }

  spawnStage() {
    this.stageCleared = false;
    const config = this.stageConfigs[this.currentStage - 1] || [ { type: 'normal', count: 10 } ];
    this.spawnQueue = [];
    config.forEach(item => {
      for (let i = 0; i < item.count; i++) {
        this.spawnQueue.push(item.type);
      }
    });
    this.toSpawn = this.spawnQueue.length;
    if (this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: this.spawnEnemy,
      callbackScope: this
    });
  }

  spawnEnemy() {
    if (!this.spawnQueue || this.spawnQueue.length === 0) {
      if (this.spawnTimer) this.spawnTimer.remove();
      return;
    }
    const type = this.spawnQueue.shift();
    if (!type) return;
    const x = Phaser.Math.Between(50, 750);
    // 生成敌机并设置较慢的下落速度
    const e = this.scene.enemies.create(x, -32, 'enemy');
    e.setVelocityY(60);
    e.hp = 2;
    e.body.setSize(16, 16).setOffset(8, 8);
    e.type = type;
    e.isRetreating = false;

    if (type === 'normal') {
      e.shotCount = 0;
      e.maxShots = 6;
      const fireTimer = this.scene.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => {
          if (!e.active) { fireTimer.remove(); return; }
          if (e.shotCount < e.maxShots) {
            const b = this.scene.enemyBullets.create(e.x, e.y + 20, 'bullet');
            b.body.velocity.y = 200;
            e.shotCount++;
          } else if (!e.isRetreating) {
            e.setVelocityY(-100);
            e.isRetreating = true;
            fireTimer.remove();
          }
        }
      });
    } else if (type === 'aim') {
      e.hasShot = false;
      e.update = () => {
        if (!e.active || e.isRetreating) return;
        if (!e.hasShot && e.y >= 120) {
          const player = this.scene.player;
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const len = Math.hypot(dx, dy);
          const vx = (dx / len) * 200;
          const vy = (dy / len) * 200;
          const b = this.scene.enemyBullets.create(e.x, e.y + 20, 'bullet');
          b.body.velocity.x = vx;
          b.body.velocity.y = vy;
          e.hasShot = true;
          e.setVelocityY(-100);
          e.isRetreating = true;
        }
      };
    } else if (type === 'multi') {
      e.hasShot = false;
      e.update = () => {
        if (!e.active || e.isRetreating) return;
        if (!e.hasShot && e.y >= 160) {
          [0,45,90,135,180,225,270,315].forEach(a => {
            const rad = Phaser.Math.DegToRad(a);
            const vx = Math.cos(rad) * 200;
            const vy = Math.sin(rad) * 200;
            const b = this.scene.enemyBullets.create(e.x, e.y + 20, 'bullet');
            b.body.velocity.x = vx;
            b.body.velocity.y = vy;
          });
          e.hasShot = true;
          e.setVelocityY(-100);
          e.isRetreating = true;
        }
      };
    }
  }

  recordKill() {
    this.killed++;
  }

  jumpTo(stageNumber) {
    if (stageNumber < 1 || stageNumber > this.maxStage) return;
    this.currentStage = stageNumber;
    this.killed = 0;
    this.scene.events.emit('UI:updateStage', this.currentStage, this.maxStage);
    if (this.spawnTimer) this.spawnTimer.remove();
    this.spawnStage();
  }
}
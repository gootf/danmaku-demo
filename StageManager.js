export default class StageManager {
    constructor(scene) {
      this.scene = scene;
      this.maxStage = 6;
      this.currentStage = 0;
      this.toSpawn = 0;
      this.killed = 0;
      this.spawnTimer = null;
    }
  
    startGame() {
      this.currentStage = 1;
      this.killed = 0;
      this.scene.events.emit('UI:updateStage', this.currentStage, this.maxStage);
      this.spawnStage();
    }
  
    nextStage() {
      this.currentStage++;
      this.killed = 0;
      this.scene.events.emit('UI:updateStage', this.currentStage, this.maxStage);
      this.spawnStage();
    }
  
    spawnStage() {
      this.toSpawn = this.currentStage * 100;
      if (this.spawnTimer) this.spawnTimer.remove();
      // callbackScope 为 this (StageManager 实例)，spawnEnemy 内可用 this.scene
      this.spawnTimer = this.scene.time.addEvent({
        delay: 400,
        loop: true,
        callback: this.spawnEnemy,
        callbackScope: this
      });
    }
  
    spawnEnemy() {
      const total = this.scene.enemies.getLength() + this.killed;
      if (total >= this.toSpawn) return;
  
      const x = Phaser.Math.Between(50,750);
      const e = this.scene.enemies.create(x,-32,'enemy').setVelocityY(100);
      e.hp = 2;
      e.body.setSize(16,16).setOffset(8,8);
  
      this.scene.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => {
          if (!e.active) return;
          const b = this.scene.enemyBullets.create(e.x, e.y+20, 'bullet');
          b.body.velocity.y = 200;
        }
      });
    }
  
    recordKill() {
      this.killed++;
      if (this.killed >= this.toSpawn) {
        this.spawnTimer.remove();
        if (this.currentStage < this.maxStage) {
          document.getElementById('next-btn').style.display = 'block';
        } else {
          alert('恭喜全部通关！');
        }
      }
    }
  
    /**
     * 直接跳转到指定关卡（测试用）。
     */
    jumpTo(stageNumber) {
      if (stageNumber < 1 || stageNumber > this.maxStage) return;
      this.currentStage = stageNumber;
      this.killed = 0;
      this.scene.events.emit('UI:updateStage', this.currentStage, this.maxStage);
      if (this.spawnTimer) this.spawnTimer.remove();
      this.spawnStage();
    }
  }
  
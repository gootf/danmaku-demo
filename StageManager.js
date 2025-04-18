export default class StageManager {
  constructor(scene) {
    this.scene = scene;
    this.maxStage = 6;
    this.currentStage = 0;
    this.toSpawn = 0;
    this.killed = 0;
    this.spawnTimer = null;
    this.stageCleared = false;

    // 敌机相关参数，方便统一调整
    this.enemyParams = {
      normal: {
        shotDelay: 1200,
        maxShots: 6,
        bulletSpeed: 200
      },
      aim: {
        speed: 200,
        delayStep: 80,
        offsetAngle: 10    // 每列之间的角度偏移
      },
      multi: {
        fireInterval: 80,       // 多方向发射间歇
        rotationStep: 5,        // 每排发射后旋转角度
        bulletSpeed: 200
      }
    };

    this.stageConfigs = [
      [{ type: 'normal', count: 15 }],
      [{ type: 'normal', count: 20 }, { type: 'aim1_1', count: 40 }],
      [{ type: 'normal', count: 20 }, { type: 'aim1_2', count: 30 }, { type: 'multi1_2', count: 20 }],
      [{ type: 'normal', count: 20 }, { type: 'aim2_1', count: 40 }, { type: 'multi2_2', count: 20 }],
      [{ type: 'aim2_2', count: 50 }, { type: 'multi1_3', count: 50 }, { type: 'multi2_3', count: 50 }],
      [{ type: 'aim5_3', count: 50 }, { type: 'multi3_1', count: 20 }, { type: 'multi2_4', count: 20 } ]
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
    const config = this.stageConfigs[this.currentStage - 1] || [{ type: 'normal', count: 10 }];
    this.spawnQueue = [];
    config.forEach(item => {
      for (let i = 0; i < item.count; i++) {
        this.spawnQueue.push(item.type);
      }
    });
    this.toSpawn = this.spawnQueue.length;
    if (this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.scene.time.addEvent({ delay: 400, loop: true, callback: this.spawnEnemy, callbackScope: this });
  }

  spawnEnemy() {
    if (!this.spawnQueue || this.spawnQueue.length === 0) {
      if (this.spawnTimer) this.spawnTimer.remove();
      return;
    }
    const type = this.spawnQueue.shift();
    if (!type) return;

    // 创建敌机基础
    const x = Phaser.Math.Between(50, 750);
    const key = type.startsWith('aim') ? 'enemy_aim' : type.startsWith('multi') ? 'enemy_multi' : 'enemy_normal';
    const e = this.scene.enemies.create(x, -32, key).setDisplaySize(32, 32);
    e.setVelocityY(60);
    e.hp = 2;
    e.body.setSize(16, 16).setOffset(8, 8);
    e.type = type;
    e.isRetreating = false;

    // 类型分发
    if (type === 'normal') {
      this._setupNormal(e);
    } else if (/^aim\d+(_\d+)?$/.test(type)) {
      const [, colStr, countStr] = type.match(/aim(\d+)(?:_(\d+))?/);
      const columns = parseInt(colStr, 10);
      const bulletsPerCol = countStr ? parseInt(countStr, 10) : 1;
      this._setupAim(e, columns, bulletsPerCol);
    } else if (/^multi\d+_\d+$/.test(type)) {
      const [, dirIdxStr, countStr] = type.match(/multi(\d+)_(\d+)/);
      const dirIdx = parseInt(dirIdxStr, 10);
      const countPerDir = parseInt(countStr, 10);
      const actualDirections = 8 * Math.pow(2, dirIdx - 1);
      const { fireInterval, rotationStep, bulletSpeed } = this.enemyParams.multi;
      this._setupMulti(e, actualDirections, countPerDir, fireInterval, rotationStep, bulletSpeed);
    }
  }

  _setupNormal(e) {
    const { shotDelay, maxShots, bulletSpeed } = this.enemyParams.normal;
    e.shotCount = 0;
    e.maxShots = maxShots;
    const fireTimer = this.scene.time.addEvent({
      delay: shotDelay,
      loop: true,
      callback: () => {
        if (!e.active) { fireTimer.remove(); return; }
        if (e.shotCount < e.maxShots) {
          const b = this.scene.enemyBullets.create(e.x, e.y + 20, 'bullet');
          b.body.velocity.y = bulletSpeed;
          e.shotCount++;
        } else if (!e.isRetreating) {
          e.setVelocityY(-100);
          e.isRetreating = true;
          fireTimer.remove();
        }
      }
    });
  }

  /**
 * Aim 类敌机支持多列发射：
 * - columns 列数
 * - bulletsPerCol 每列子弹数
 * 第一列对准玩家，中间及两侧列按 offsetAngle 偏移
 */
  _setupAim(e, columns, bulletsPerCol) {
    const { speed, delayStep, offsetAngle } = this.enemyParams.aim;
    e.hasShot = false;
    e.update = () => {
      if (!e.active || e.isRetreating) return;
      if (!e.hasShot && e.y >= 120) {
        e.hasShot = true;
        const player = this.scene.player;
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const baseAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
        let angles = [];

        if (columns === 1) {
          // 单列：bulletsPerCol 次重复发射
          for (let i = 0; i < bulletsPerCol; i++) {
            angles.push(baseAngle);
          }
        } else if (columns % 2 === 1) {
          // 奇数列：中间列 + 对称列
          angles.push(baseAngle);  // 中间列
          for (let i = 1; i <= Math.floor(columns / 2); i++) {
            angles.push(baseAngle - i * offsetAngle);
            angles.push(baseAngle + i * offsetAngle);
          }
        } else {
          // 偶数列：中间两列为 ±0.5 offsetAngle，然后对称扩展
          const half = columns / 2;
          for (let i = 0; i < half; i++) {
            const offset = (i + 0.5) * offsetAngle;
            angles.push(baseAngle - offset);
            angles.push(baseAngle + offset);
          }
        }

        // 依次发射
        angles.forEach((angle, colIdx) => {
          for (let k = 0; k < bulletsPerCol; k++) {
            this.scene.time.delayedCall(k * delayStep, () => {
              if (!e.active) return;
              const rad = Phaser.Math.DegToRad(angle);
              const vx = Math.cos(rad) * speed;
              const vy = Math.sin(rad) * speed;
              const b = this.scene.enemyBullets.create(e.x, e.y + 20, 'bullet');
              b.body.velocity.x = vx;
              b.body.velocity.y = vy;
            });
          }
        });

        // 发射完毕后撤退
        const maxDelay = angles.length * bulletsPerCol * delayStep;
        this.scene.time.delayedCall(maxDelay, () => {
          if (!e.active) return;
          e.setVelocityY(-100);
          e.isRetreating = true;
        });
      }
    };
  }

  _setupMulti(e, directions, countPerDir, fireInterval, rotationStep, bulletSpeed) {
    e.hasShot = false;
    e.rotationOffset = 0;
    e.update = () => {
      if (!e.active || e.isRetreating) return;
      if (!e.hasShot && e.y >= 160) {
        e.hasShot = true;
        this.scene.time.addEvent({
          delay: fireInterval,
          repeat: countPerDir - 1,
          callback: () => {
            for (let i = 0; i < directions; i++) {
              const angle = i * (360 / directions) + e.rotationOffset;
              const rad = Phaser.Math.DegToRad(angle);
              const vx = Math.cos(rad) * bulletSpeed;
              const vy = Math.sin(rad) * bulletSpeed;
              const b = this.scene.enemyBullets.create(e.x, e.y + 20, 'bullet');
              b.body.velocity.x = vx;
              b.body.velocity.y = vy;
            }
            e.rotationOffset = (e.rotationOffset + rotationStep) % 360;
          }
        });
        this.scene.time.delayedCall(fireInterval * countPerDir, () => {
          if (!e.active) return;
          e.setVelocityY(-100);
          e.isRetreating = true;
        });
      }
    };
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

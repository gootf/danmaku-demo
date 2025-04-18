// GameScene.js
import StageManager from './StageManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    /** 
     * 玩家相关默认配置 
     * 可在启动时通过 scene.start('GameScene', { player: { … } }) 覆盖
     */
    this.playerConfig = {
      hp: 4,            // 初始血量
      speed: 200,       // 移动速度（像素/秒）
      slowModeRatio: 0.5, // 减速模式的速度比例
      fireRate: 200,    // 射击间隔（毫秒）
      bulletSpeed: 300, // 子弹速度（像素/秒）
      maxPower: 7,      // 最大火力等级
      // 火力升级所需分值（每级）
      powerLevels: [
        { level: 1, threshold: 0 },    // 初始级别，无需升级
        { level: 2, threshold: 50 },   // 升到2级需要50分
        { level: 3, threshold: 50 },   // 升到3级需要50分
        { level: 4, threshold: 100 },  // 升到4级需要150分
        { level: 5, threshold: 150 },  // 升到5级需要150分
        { level: 6, threshold: 200 },  // 升到6级需要300分
        { level: 7, threshold: 300 }   // 升到7级需要300分
      ]
    };
  }

  /** 
   * 接收启动参数 
   * @param {object} data 启动时传入的数据，格式 { player: { hp, speed, fireRate, bulletSpeed, … } }
   */
  init(data) {
    if (data.player) {
      Object.assign(this.playerConfig, data.player);
    }
  }

  create() {
    // 动态生成贴图
    const g = this.add.graphics();
    g.fillStyle(0x00ff00).fillRect(0, 0, 32, 32).generateTexture('player', 32, 32);
    g.clear().fillStyle(0xff0000).fillRect(0, 0, 32, 32).generateTexture('enemy', 32, 32);
    g.clear().fillStyle(0xffff00).fillRect(0, 0, 8, 8).generateTexture('bullet', 8, 8);
    g.clear().fillStyle(0xff00ff).fillRect(0, 0, 16, 16).generateTexture('pPoint', 16, 16);

    // 玩家初始化
    this.player = this.physics.add.sprite(400, 550, 'player')
      .setCollideWorldBounds(true);
    this.player.hp = this.playerConfig.hp;
    this.player.power = 1;
    this.player.powerScore = 0;
    // 缩小判定区
    this.player.body.setSize(6, 6).setOffset(13, 13);

    // 判定点显示
    this.hitPoint = this.add.graphics()
      .fillStyle(0xffffff, 1)
      .fillCircle(0, 0, 3);
    this.hitPoint.setDepth(10).setVisible(false);
    
    // 减速模式指示器
    this.slowModeIndicator = this.add.graphics()
      .fillStyle(0x00ffff, 0.3)
      .fillCircle(0, 0, 18);
    this.slowModeIndicator.setDepth(5).setVisible(false);

    // 分组
    this.bullets      = this.physics.add.group();
    this.enemies      = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.pPoints      = this.physics.add.group();

    // 控制
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.shift   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // 自动射击事件
    this.fireEvt = this.time.addEvent({
      delay: this.playerConfig.fireRate,
      loop: true,
      callback: this.shootPlayer,
      callbackScope: this
    });

    // 碰撞检测
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pPoints, this.onPickupP, null, this);

    // 关卡管理
    this.stageManager = new StageManager(this);

    // UI 初始展示
    this.events.emit('UI:updateHP', this.player.hp);
    
    // 获取初始火力级别的升级所需分值
    const initialThreshold = this.playerConfig.powerLevels[this.player.power].threshold;
    this.events.emit('UI:updatePower', this.player.power, this.player.powerScore, initialThreshold);
    
    this.events.emit('UI:updateStage', 0, this.stageManager.maxStage);
  }

  update() {
    const pl = this.player;
    pl.setVelocity(0);

    // 检测Shift键状态 - 减速移动
    const isSlowMode = this.shift.isDown;
    const moveSpeed = isSlowMode ? 
      this.playerConfig.speed * this.playerConfig.slowModeRatio : 
      this.playerConfig.speed;

    // 玩家移动
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  pl.setVelocityX(-moveSpeed);
    if (this.cursors.right.isDown || this.wasd.right.isDown) pl.setVelocityX(moveSpeed);
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    pl.setVelocityY(-moveSpeed);
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  pl.setVelocityY(moveSpeed);

    // 子弹出界销毁
    this.bullets.children.each(b => b.y < 0 && b.destroy());

    // 敌机生命周期与自定义 update
    this.enemies.children.each(e => {
      if (e.y > 632 || e.y < -32) {
        e.destroy();
      } else if (typeof e.update === 'function') {
        e.update();
      }
    });

    // 敌机子弹与能量点出界销毁
    this.enemyBullets.children.each(b => b.y > 600 && b.destroy());
    this.pPoints.children.each(p => p.y > 600 && p.destroy());

    // 自动进入下一关
    const mgr = this.stageManager;
    if (
      mgr.spawnQueue && mgr.spawnQueue.length === 0 &&
      this.enemies.countActive(true) === 0 &&
      !mgr.stageCleared
    ) {
      mgr.stageCleared = true;
      if (mgr.currentStage < mgr.maxStage) {
        this.scene.get('UIScene').events.emit('UI:showNextBtn');
      } else {
        this.scene.get('UIScene').events.emit('UI:allClear');
      }
    }

    // 判定点跟随
    if (this.hitPoint && this.player.active) {
      this.hitPoint.x = this.player.x;
      this.hitPoint.y = this.player.y;
      // 仅在减速模式下显示判定点
      this.hitPoint.setVisible(isSlowMode);
      
      // 减速模式指示器
      if (this.slowModeIndicator) {
        this.slowModeIndicator.x = this.player.x;
        this.slowModeIndicator.y = this.player.y;
        this.slowModeIndicator.setVisible(isSlowMode);
      }
    }
  }

  /** 玩家射击 */
  shootPlayer() {
    if (!this.player.active) return;
    const rows = this.player.power;
    const spacing = 12;
    const startX = this.player.x - (rows - 1) * spacing / 2;
    for (let i = 0; i < rows; i++) {
      const b = this.bullets.create(startX + i * spacing, this.player.y - 20, 'bullet');
      b.body.velocity.y = -this.playerConfig.bulletSpeed;
    }
  }

  /** 敌机被击中 */
  onBulletHit(bullet, enemy) {
    bullet.destroy();
    enemy.hp--;
    if (enemy.hp <= 0) {
      const p = this.pPoints.create(enemy.x, enemy.y, 'pPoint');
      p.body.setSize(32, 32).setOffset(-8, -8);
      p.body.velocity.y = 100;
      enemy.destroy();
      this.stageManager.recordKill();
    }
  }

  /** 玩家受击 */
  onPlayerHit(pl, bullet) {
    bullet.destroy();
    pl.hp--;
    this.events.emit('UI:updateHP', pl.hp);
    if (pl.hp <= 0) this.gameOver();
  }

  /** 拾取能量点 */
  onPickupP(pl, p) {
    p.destroy();
    
    if (pl.power < this.playerConfig.maxPower) {
      // 获取当前级别的升级所需分值
      const currentLevelData = this.playerConfig.powerLevels[pl.power];
      const requiredScore = currentLevelData.threshold;
      
      pl.powerScore += 10;
      
      if (pl.powerScore >= requiredScore) {
        pl.power++;
        pl.powerScore = 0;
      }
    }
    
    // 计算当前级别升级所需的总分值
    const currentLevelData = this.playerConfig.powerLevels[Math.min(pl.power, this.playerConfig.maxPower - 1)];
    const requiredScore = currentLevelData ? currentLevelData.threshold : 0;
    
    this.events.emit('UI:updatePower', pl.power, pl.powerScore, requiredScore);
  }

  /** 游戏结束 */
  gameOver() {
    this.add.text(400, 300, 'Game Over', { font: '32px consolas', fill: '#f00' })
      .setOrigin(0.5);
    this.game.events.emit('Stage:gameOver');
    this.scene.pause();
  }
}

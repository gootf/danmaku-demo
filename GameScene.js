import StageManager from './StageManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // 动态贴图
    const g = this.add.graphics();
    g.fillStyle(0x00ff00).fillRect(0,0,32,32).generateTexture('player',32,32);
    g.clear().fillStyle(0xff0000).fillRect(0,0,32,32).generateTexture('enemy',32,32);
    g.clear().fillStyle(0xffff00).fillRect(0,0,8,8).generateTexture('bullet',8,8);
    g.clear().fillStyle(0xff00ff).fillCircle(0,0,4).generateTexture('pPoint',8,8);

    // 玩家初始化
    this.player = this.physics.add.sprite(400,550,'player').setCollideWorldBounds(true);
    this.player.hp = 3;
    this.player.power = 1;
    this.player.powerScore = 0;

    // 分组
    this.bullets      = this.physics.add.group();
    this.enemies      = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.pPoints      = this.physics.add.group();

    // 控制
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.fireEvt = this.time.addEvent({ delay:200, loop:true, callback:this.shootPlayer, callbackScope:this });

    // 碰撞
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pPoints, this.onPickupP, null, this);

    // 关卡管理器
    this.stageManager = new StageManager(this);

    // 初始暂停
    this.scene.pause();
  }

  update() {
    const pl = this.player;
    pl.setVelocity(0);
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  pl.setVelocityX(-200);
    if (this.cursors.right.isDown || this.wasd.right.isDown) pl.setVelocityX(200);
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    pl.setVelocityY(-200);
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  pl.setVelocityY(200);

    this.bullets.children.each(b      => b.y < 0    && b.destroy());
    this.enemies.children.each(e      => e.y > 632  && e.destroy());
    this.enemyBullets.children.each(b => b.y > 600  && b.destroy());
    this.pPoints.children.each(p      => p.y > 600  && p.destroy());
  }

  shootPlayer() {
    if (!this.player.active) return;
    const rows = this.player.power;
    const spacing = 12;
    const startX = this.player.x - (rows-1)*spacing/2;
    for (let i=0; i<rows; i++) {
      const b = this.bullets.create(startX+i*spacing, this.player.y-20, 'bullet');
      b.body.velocity.y = -300;
    }
  }

  onBulletHit(bullet, enemy) {
    bullet.destroy();
    enemy.hp--;
    if (enemy.hp <= 0) {
      const p = this.pPoints.create(enemy.x, enemy.y, 'pPoint');
      p.body.velocity.y = 100;
      enemy.destroy();
      this.stageManager.recordKill();
    }
  }

  onPlayerHit(pl, bullet) {
    bullet.destroy();
    pl.hp--;
    this.events.emit('UI:updateHP', pl.hp);
    if (pl.hp <= 0) this.gameOver();
  }

  onPickupP(pl, p) {
    p.destroy();
    if (pl.power < 4) {
      pl.powerScore += 10;
      if (pl.powerScore >= 50) {
        pl.power++;
        pl.powerScore = 0;
      }
    }
    this.events.emit('UI:updatePower', pl.power, pl.powerScore);
  }

  gameOver() {
    this.add.text(400,300,'Game Over',{ font:'32px consolas', fill:'#f00' }).setOrigin(0.5);
    // 通知 UI：游戏结束
    this.game.events.emit('Stage:gameOver');
    this.scene.pause();
  }
}

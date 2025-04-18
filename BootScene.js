export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 预加载所有贴图资源
    this.load.image('enemy_normal', 'assets/images/enemy_normal.png');
    this.load.image('enemy_aim',    'assets/images/enemy_aim.png');
    this.load.image('enemy_multi',  'assets/images/enemy_multi.png');
    this.load.image('player',       'assets/images/player.png');
    this.load.image('pPoint',       'assets/images/p_point.png');
    this.load.image('bullet',       'assets/images/bullet.png');
  }

  create() {
    // 所有资源加载完成后，启动并暂停其他场景
    this.scene.launch('GameScene');
    this.scene.launch('UIScene');
    this.scene.pause('GameScene');
    this.scene.pause('UIScene');
  }
}

export default class BootScene extends Phaser.Scene {
    constructor() {
      super({ key: 'BootScene' });
    }
  
    preload() {
      // 资源加载（可拓展）
    }
  
    create() {
      // 启动并立即暂停游戏与 UI 场景
      this.scene.launch('GameScene');
      this.scene.launch('UIScene');
      this.scene.pause('GameScene');
      this.scene.pause('UIScene');
    }
  }
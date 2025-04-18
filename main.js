import BootScene from './BootScene.js';
import GameScene from './GameScene.js';
import UIScene   from './UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800, height: 600,
  backgroundColor: '#000000',
  physics: { default:'arcade', arcade:{ debug:false } },
  scene: [ BootScene, GameScene, UIScene ]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
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
  const game = new Phaser.Game(config);
  
  // 全局ESC键事件处理 - 使用DOM级别的事件处理器
  let escKeyPressed = false;
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !escKeyPressed) {
      escKeyPressed = true;
      
      // 判断游戏状态并发送适当的事件
      const gameScene = game.scene.getScene('GameScene');
      if (gameScene) {
        if (gameScene.scene.isPaused()) {
          console.log('恢复游戏');
          game.events.emit('Stage:resume');
        } else if (gameScene.scene.isActive()) {
          console.log('暂停游戏');
          game.events.emit('Stage:pause');
        }
      }
    }
  });
  
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
      escKeyPressed = false;
    }
  });
});
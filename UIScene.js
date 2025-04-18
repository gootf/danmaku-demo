export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // 绑定 DOM 元素
    this.hpText     = document.getElementById('hp-text');
    this.powerText  = document.getElementById('power-text');
    this.stageText  = document.getElementById('stage-text');
    this.startBtn   = document.getElementById('start-btn');
    this.nextBtn    = document.getElementById('next-btn');
    this.pauseBtn   = document.getElementById('pause-btn');
    this.resumeBtn  = document.getElementById('resume-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.jumpInput  = document.getElementById('jump-input');
    this.jumpBtn    = document.getElementById('jump-btn');

    // 按钮 -> 发射全局事件
    this.startBtn.onclick   = () => this.game.events.emit('Stage:start');
    this.nextBtn.onclick    = () => this.game.events.emit('Stage:next');
    this.pauseBtn.onclick   = () => this.game.events.emit('Stage:pause');
    this.resumeBtn.onclick  = () => this.game.events.emit('Stage:resume');
    this.restartBtn.onclick = () => this.game.events.emit('Stage:restart');
    this.jumpBtn.onclick    = () => {
      const n = parseInt(this.jumpInput.value, 10);
      this.scene.get('GameScene').stageManager.jumpTo(n);
      this.nextBtn.style.display = 'none';
    };

    // 监听 GameScene 事件 -> 更新 UI
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('UI:updateHP',    hp    => this.hpText.innerText    = `HP: ${hp}`);
    gameScene.events.on('UI:updatePower', (p,s) => this.powerText.innerText = `火力：${p} (分值 ${s}/50)`);
    gameScene.events.on('UI:updateStage', (c,m) => this.stageText.innerText = `阶段：${c}/${m}`);

    // 监听开始/下一关
    this.game.events.on('Stage:start', () => {
      this.startBtn.style.display   = 'none';
      this.pauseBtn.style.display   = 'block';
      this.resumeBtn.style.display  = 'none';
      this.restartBtn.style.display = 'none';
      this.scene.resume('GameScene');
      // —— 不需要再 resume UIScene —— 
      this.scene.get('GameScene').stageManager.startGame();
    });
    this.game.events.on('Stage:next', () => {
      this.nextBtn.style.display = 'none';
      this.scene.get('GameScene').stageManager.nextStage();
    });

    // 监听暂停/继续
    this.game.events.on('Stage:pause', () => {
      this.pauseBtn.style.display  = 'none';
      this.resumeBtn.style.display = 'block';
      this.scene.pause('GameScene');
    });
    this.game.events.on('Stage:resume', () => {
      this.resumeBtn.style.display = 'none';
      this.pauseBtn.style.display  = 'block';
      this.scene.resume('GameScene');
    });

    // 监听游戏结束 -> 禁用暂停/继续，显示重启
    this.game.events.on('Stage:gameOver', () => {
      this.pauseBtn.disabled   = true;
      this.resumeBtn.disabled  = true;
      this.pauseBtn.style.display  = 'none';
      this.resumeBtn.style.display = 'none';
      this.restartBtn.style.display = 'block';
    });

    // 监听重新开始 -> 重置场景与 UI
    this.game.events.on('Stage:restart', () => {
      this.restartBtn.style.display = 'none';
      this.pauseBtn.disabled        = false;
      this.resumeBtn.disabled       = false;
      this.pauseBtn.style.display   = 'block';
      this.resumeBtn.style.display  = 'none';
      this.nextBtn.style.display    = 'none'; // 确保“下一关”也隐藏

      // 重置 GameScene
      this.scene.stop('GameScene');
      this.scene.start('GameScene');

      // 重置 UI 面板
      this.hpText.innerText    = 'HP: 3';
      this.powerText.innerText = '火力：1 (分值 0/50)';
      this.stageText.innerText = '阶段：0/6';
    });

    // 监听 GameScene 发来的 UI 事件
    this.events.on('UI:showNextBtn', () => {
      this.nextBtn.style.display = 'block';
    });
    this.events.on('UI:allClear', () => {
      alert('恭喜全部通关！');
    });
  }
}

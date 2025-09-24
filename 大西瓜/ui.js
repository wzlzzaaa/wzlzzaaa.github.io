// UI组件和动画效果系统
class ScoreAnimation {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.value = 0;
        this.color = 'white';
        this.alpha = 1;
        this.scale = 1;
        this.life = 60;
        this.maxLife = 60;
        this.active = false;
        this.velocityY = -1.5;
    }
    
    // 初始化分数动画
    init(x, y, value, color = '#FFD700') {
        this.x = x;
        this.y = y;
        this.value = value;
        this.color = color;
        this.alpha = 1;
        this.scale = 1;
        this.life = 60;
        this.maxLife = 60;
        this.active = true;
        this.velocityY = -1.5;
    }
    
    // 更新分数动画
    update() {
        if (!this.active) return;
        
        this.y += this.velocityY;
        this.life--;
        
        // 淡出效果
        if (this.life < 20) {
            this.alpha = this.life / 20;
        }
        
        // 缩放效果
        if (this.life > this.maxLife - 10) {
            this.scale = 0.5 + ((this.maxLife - this.life) / 10) * 0.5;
        }
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    // 渲染分数动画
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = `bold ${Math.floor(24 * this.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 描边文字效果
        ctx.strokeText(`+${this.value}`, this.x, this.y);
        ctx.fillText(`+${this.value}`, this.x, this.y);
        
        ctx.restore();
    }
}

// 分数动画管理器
class ScoreAnimationManager {
    constructor() {
        this.animationPool = new ObjectPool(() => new ScoreAnimation(), 20);
        this.animations = [];
    }
    
    // 创建分数动画
    createScoreAnimation(x, y, value) {
        const animation = this.animationPool.get();
        animation.init(x, y, value);
        this.animations.push(animation);
    }
    
    // 更新所有分数动画
    update() {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const animation = this.animations[i];
            
            animation.update();
            
            // 如果动画结束，将其返回到对象池
            if (!animation.active) {
                this.animationPool.release(animation);
                this.animations.splice(i, 1);
            }
        }
    }
    
    // 渲染所有分数动画
    render(ctx) {
        for (const animation of this.animations) {
            animation.render(ctx);
        }
    }
    
    // 清除所有分数动画
    clear() {
        for (const animation of this.animations) {
            this.animationPool.release(animation);
        }
        this.animations = [];
    }
}

// UI管理器
class UIManager {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.scoreAnimationManager = new ScoreAnimationManager();
        
        // 按钮和UI元素
        this.buttons = {
            pause: {
                x: game.width - 50,
                y: 30,
                width: 40,
                height: 40,
                text: '暂停',
                visible: true,
                onClick: () => game.togglePause()
            },
            music: {
                x: game.width - 100,
                y: 30,
                width: 40,
                height: 40,
                text: '音乐',
                visible: true,
                onClick: () => game.toggleMusic()
            },
            restart: {
                x: game.width / 2,
                y: game.height / 2 + 50,
                width: 120,
                height: 50,
                text: '重新开始',
                visible: false,
                onClick: () => game.restartGame()
            }
        };
        
        // 监听点击事件
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        // 离屏渲染缓存
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.updateOffscreenCanvas();
    }
    
    // 更新离屏渲染画布大小
    updateOffscreenCanvas() {
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
    }
    
    // 处理点击事件
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // 检查按钮点击
        for (const [name, button] of Object.entries(this.buttons)) {
            if (!button.visible) continue;
            
            if (x >= button.x - button.width/2 && 
                x <= button.x + button.width/2 && 
                y >= button.y - button.height/2 && 
                y <= button.y + button.height/2) {
                button.onClick();
                return true;
            }
        }
        
        return false;
    }
    
    // 创建分数动画
    createScoreAnimation(x, y, points) {
        this.scoreAnimationManager.createScoreAnimation(x, y, points);
    }
    
    // 更新UI状态
    update() {
        // 更新按钮位置
        this.buttons.pause.x = this.game.width - 50;
        this.buttons.music.x = this.game.width - 100;
        this.buttons.restart.x = this.game.width / 2;
        this.buttons.restart.y = this.game.height / 2 + 50;
        
        // 更新暂停按钮文本
        this.buttons.pause.text = this.game.paused ? '继续' : '暂停';
        
        // 更新音乐按钮文本
        this.buttons.music.text = this.game.musicEnabled ? '音乐开' : '音乐关';
        
        // 显示/隐藏重新开始按钮
        this.buttons.restart.visible = this.game.gameOver;
        
        // 更新分数动画
        this.scoreAnimationManager.update();
    }
    
    // 渲染UI
    render() {
        // 渲染按钮
        for (const [name, button] of Object.entries(this.buttons)) {
            if (!button.visible) continue;
            
            // 绘制按钮背景
            this.ctx.fillStyle = name === 'restart' ? '#4CAF50' : 'rgba(0, 0, 0, 0.5)';
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.roundRect(
                button.x - button.width/2, 
                button.y - button.height/2, 
                button.width, 
                button.height,
                10
            );
            this.ctx.fill();
            this.ctx.stroke();
            
            // 绘制按钮文本
            this.ctx.fillStyle = 'white';
            this.ctx.font = name === 'restart' ? 'bold 18px Arial' : '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(button.text, button.x, button.y);
        }
        
        // 绘制分数和最高分
        this.ctx.fillStyle = 'black';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`分数: ${this.game.score}`, 20, 30);
        this.ctx.fillText(`最高分: ${this.game.highScore}`, 20, 60);
        
        // 如果游戏暂停，显示暂停覆盖层
        if (this.game.paused && !this.game.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.game.width, this.game.height);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('暂停', this.game.width/2, this.game.height/2);
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText('点击继续按钮恢复游戏', this.game.width/2, this.game.height/2 + 40);
        }
        
        // 如果游戏结束，显示游戏结束覆盖层
        if (this.game.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.game.width, this.game.height);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('游戏结束!', this.game.width/2, this.game.height/2 - 40);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`最终分数: ${this.game.score}`, this.game.width/2, this.game.height/2);
        }
        
        // 渲染分数动画
        this.scoreAnimationManager.render(this.ctx);
    }
    
    // 清除UI状态
    clear() {
        this.scoreAnimationManager.clear();
    }
} 
// 游戏常量
const FRUIT_TYPES = [
    { name: '樱桃', size: 30, image: '樱桃.webp', points: 1 },
    { name: '葡萄', size: 40, image: '葡萄.webp', points: 2 },
    { name: '橘子', size: 50, image: '橘子.webp', points: 3 },
    { name: '猕猴桃', size: 60, image: '猕猴桃.webp', points: 4 },
    { name: '西红柿', size: 70, image: '西红柿.webp', points: 5 },
    { name: '桃', size: 80, image: '桃.webp', points: 6 },
    { name: '菠萝', size: 90, image: '菠萝.webp', points: 7 },
    { name: '椰子', size: 100, image: '椰子.webp', points: 8 },
    { name: '柠檬', size: 110, image: '柠檬.webp', points: 9 },
    { name: '西瓜', size: 120, image: '西瓜.webp', points: 10 },
    { name: '大西瓜', size: 150, image: '大西瓜.webp', points: 20 }
];

// 游戏物理常量
const PHYSICS = {
    GRAVITY: 0.5,
    FRICTION: 0.98,
    RESTITUTION: 0.8,
    ANGULAR_DAMPING: 0.95
};

// 游戏配置
const GAME_CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    FPS: 60,
    DROP_ZONE_HEIGHT: 200,
    CELL_SIZE: 100, // 空间分区单元格大小
    PREVIEW_ENABLED: true
};

// 游戏状态
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;
let fruits = [];
let animationId = null;
let canvas = null;
let ctx = null;
let lastFrameTime = 0;

// 游戏主类
class FruitGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏状态
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') || 0;
        this.gameOver = false;
        this.paused = false;
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.difficulty = localStorage.getItem('difficulty') || 'normal';
        this.lastTimestamp = 0;
        this.deltaTime = 0;
        this.animationId = null;
        this.nextFruitType = 0;
        this.isDropping = false;
        this.dropPreviewX = 0;
        this.dropPreviewY = 0;
        
        // 游戏尺寸
        this.width = GAME_CONFIG.WIDTH;
        this.height = GAME_CONFIG.HEIGHT;
        
        // 系统初始化
        this.fruitPool = new ObjectPool(() => this.createFruit(0, 0, 0), 50);
        this.fruits = [];
        this.spatialGrid = new SpatialGrid(this.width, this.height, GAME_CONFIG.CELL_SIZE);
        this.particleSystem = new ParticleSystem();
        this.ui = new UIManager(this);
        this.comboSystem = new ComboSystem(this);
        this.powerUpSystem = new PowerUpSystem(this);
        
        // 离屏渲染缓存
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        // 初始化资源
        this.initializeResources();
        
        // 事件监听器
        this.setupEventListeners();
        
        // 根据窗口大小调整画布
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 初始随机水果类型
        this.generateNextFruitType();
    }
    
    // 初始化资源
    initializeResources() {
        // 显示加载屏幕
        this.showLoadingScreen();
        
        // 预加载所有资源
        ASSETS.preload(() => {
            // 资源加载完成，开始游戏
            this.hideLoadingScreen();
            this.start();
        });
    }
    
    // 显示加载屏幕
    showLoadingScreen() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = 'black';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('正在加载游戏资源...', this.width/2, this.height/2);
    }
    
    // 隐藏加载屏幕
    hideLoadingScreen() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 鼠标/触摸事件
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        
        // 键盘事件
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // 窗口失焦自动暂停
        window.addEventListener('blur', () => {
            if (!this.gameOver && !this.paused) {
                this.pause();
            }
        });
    }
    
    // 调整画布大小
    resizeCanvas() {
        const containerWidth = Math.min(window.innerWidth, GAME_CONFIG.WIDTH);
        const containerHeight = Math.min(window.innerHeight, GAME_CONFIG.HEIGHT);
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // 更新游戏尺寸
        this.width = containerWidth;
        this.height = containerHeight;
        GAME_CONFIG.DROP_ZONE_HEIGHT = Math.min(200, containerHeight / 3);
        
        // 更新背景缓存
        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
        this.renderBackground();
        
        // 更新UI
        this.ui.updateOffscreenCanvas();
        
        // 更新空间分区系统
        this.spatialGrid.resize(this.width, this.height);
    }
    
    // 渲染背景
    renderBackground() {
        // 清空背景缓存
        this.bgCtx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        this.bgCtx.fillStyle = 'white';
        this.bgCtx.fillRect(0, 0, this.width, this.height);
        
        // 绘制生成区域指示器
        this.bgCtx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        this.bgCtx.fillRect(0, 0, this.width, GAME_CONFIG.DROP_ZONE_HEIGHT);
        
        // 绘制底部区域
        this.bgCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.bgCtx.fillRect(0, this.height - 5, this.width, 5);
        
        // 绘制网格线
        this.bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        this.bgCtx.lineWidth = 1;
        
        // 垂直网格线
        for (let x = 0; x < this.width; x += 50) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, 0);
            this.bgCtx.lineTo(x, this.height);
            this.bgCtx.stroke();
        }
        
        // 水平网格线
        for (let y = 0; y < this.height; y += 50) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, y);
            this.bgCtx.lineTo(this.width, y);
            this.bgCtx.stroke();
        }
    }
    
    // 创建水果对象
    createFruit(type, x, y, velocityX = 0, velocityY = 0) {
        return {
            type: type,
            x: x,
            y: y,
            size: ASSETS.FRUITS[type].size,
            img: ASSETS.FRUITS[type].img,
            velocityX: velocityX,
            velocityY: velocityY,
            rotation: 0,
            angularVelocity: 0,
            isResting: false,
            restTime: 0,
            reset: function() {
                this.type = 0;
                this.x = 0;
                this.y = 0;
                this.size = ASSETS.FRUITS[0].size;
                this.img = ASSETS.FRUITS[0].img;
                this.velocityX = 0;
                this.velocityY = 0;
                this.rotation = 0;
                this.angularVelocity = 0;
                this.isResting = false;
                this.restTime = 0;
            }
        };
    }
    
    // 开始游戏
    start() {
        // 初始化游戏状态
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        
        // 清空已有水果
        this.clearFruits();
        
        // 启动游戏循环
        this.lastTimestamp = performance.now();
        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        
        // 播放背景音乐
        if (this.musicEnabled) {
            ASSETS.playSound('BACKGROUND', 0.3);
        }
    }
    
    // 清空所有水果
    clearFruits() {
        // 将所有水果归还到对象池
        for (const fruit of this.fruits) {
            this.spatialGrid.remove(fruit);
            this.fruitPool.release(fruit);
        }
        
        this.fruits = [];
        this.spatialGrid.clear();
        this.particleSystem.clear();
        this.comboSystem.resetCombo();
        this.powerUpSystem.powerUps = [];
        this.powerUpSystem.activePowerUps.clear();
    }
    
    // 游戏主循环
    gameLoop(timestamp) {
        // 计算帧间隔
        this.deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        // 标准化为60FPS基准
        const deltaFactor = this.deltaTime / (1000 / 60);
        
        // 如果游戏未暂停，更新游戏状态
        if (!this.paused) {
            this.update(deltaFactor);
        }
        
        // 渲染游戏画面
        this.render();
        
        // 继续下一帧
        if (!this.gameOver) {
            this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    // 更新游戏状态
    update(deltaFactor = 1) {
        // 更新UI
        this.ui.update();
        
        // 更新粒子系统
        this.particleSystem.update();
        
        // 更新连击系统
        this.comboSystem.update();
        
        // 更新道具系统
        this.powerUpSystem.update();
        
        // 水果下落逻辑
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];
            
            // 检查是否被冰冻
            if (fruit.frozen) {
                continue; // 跳过冰冻的水果
            }
            
            // 更新物理属性
            fruit.velocityY += PHYSICS.GRAVITY * deltaFactor;
            fruit.velocityX *= PHYSICS.FRICTION;
            
            // 旋转效果
            fruit.angularVelocity *= PHYSICS.ANGULAR_DAMPING;
            fruit.rotation += fruit.angularVelocity * deltaFactor;
            
            // 记录旧位置
            const oldX = fruit.x;
            const oldY = fruit.y;
            
            // 位置更新
            fruit.y += fruit.velocityY * deltaFactor;
            fruit.x += fruit.velocityX * deltaFactor;
            
            // 边界检测
            const radius = fruit.size / 2;
            
            // 底部边界
            if (fruit.y + radius >= this.height) {
                fruit.y = this.height - radius;
                
                // 如果有足够的垂直速度，则反弹并添加落地效果
                if (Math.abs(fruit.velocityY) > 1) {
                    // 反弹
                    fruit.velocityY *= -PHYSICS.RESTITUTION;
                    fruit.velocityX *= 0.8; // 水平摩擦力
                    
                    // 添加落地效果
                    if (this.soundEnabled) {
                        ASSETS.playSound('DROP', 0.2 * Math.min(1, Math.abs(fruit.velocityY / 10)));
                    }
                    
                    // 粒子效果
                    const colors = [
                        '#FF6B6B', '#9775FA', '#FF922B', '#51CF66', '#FF8787',
                        '#FFA8A8', '#FFEC99', '#FFF9DB', '#FFEC99', '#EF3F3F', '#20C997'
                    ];
                    this.particleSystem.createLandingEffect(
                        fruit.x, this.height - 5, 
                        colors[fruit.type], 
                        fruit.size * 0.3
                    );
                } else {
                    // 速度很小，视为静止
                    fruit.velocityY = 0;
                    
                    // 如果水果静止时间过长，标记为静止状态
                    if (Math.abs(fruit.velocityX) < 0.1) {
                        if (!fruit.isResting) {
                            fruit.isResting = true;
                            fruit.restTime = 0;
                        } else {
                            fruit.restTime += deltaFactor;
                        }
                    }
                }
            }
            
            // 左右边界
            if (fruit.x - radius <= 0) {
                fruit.x = radius;
                fruit.velocityX *= -PHYSICS.RESTITUTION;
            } else if (fruit.x + radius >= this.width) {
                fruit.x = this.width - radius;
                fruit.velocityX *= -PHYSICS.RESTITUTION;
            }
            
            // 如果位置有变化，更新空间分区
            if (fruit.x !== oldX || fruit.y !== oldY) {
                this.spatialGrid.update(fruit);
            }
        }
        
        // 碰撞检测
        this.checkCollisions();
        
        // 游戏结束检测
        this.checkGameOver();
        
        // 根据难度更新物理参数
        this.updateDifficultyParameters();
    }
    
    // 根据难度更新物理参数
    updateDifficultyParameters() {
        switch (this.difficulty) {
            case 'easy':
                PHYSICS.GRAVITY = 0.4;
                PHYSICS.FRICTION = 0.97;
                PHYSICS.RESTITUTION = 0.7;
                break;
            case 'normal':
                PHYSICS.GRAVITY = 0.5;
                PHYSICS.FRICTION = 0.98;
                PHYSICS.RESTITUTION = 0.8;
                break;
            case 'hard':
                PHYSICS.GRAVITY = 0.6;
                PHYSICS.FRICTION = 0.99;
                PHYSICS.RESTITUTION = 0.9;
                break;
        }
    }
    
    // 渲染游戏
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        this.ctx.drawImage(this.bgCanvas, 0, 0);
        
        // 绘制下落预览线
        if (GAME_CONFIG.PREVIEW_ENABLED && !this.paused && !this.gameOver && this.dropPreviewX > 0) {
            this.renderDropPreview();
        }
        
        // 绘制下一个水果提示
        this.renderNextFruit();
        
        // 绘制水果
        this.fruits.forEach(fruit => {
            this.renderFruit(fruit);
        });
        
        // 绘制粒子效果
        this.particleSystem.render(this.ctx);
        
        // 绘制道具
        this.powerUpSystem.render(this.ctx);
        
        // 绘制连击信息
        this.comboSystem.render(this.ctx);
        
        // 绘制UI
        this.ui.render();
    }
    
    // 绘制下落预览线
    renderDropPreview() {
        if (this.dropPreviewY <= GAME_CONFIG.DROP_ZONE_HEIGHT) {
            const fruitSize = ASSETS.FRUITS[this.nextFruitType].size;
            
            // 绘制虚线
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.dropPreviewX, this.dropPreviewY);
            this.ctx.lineTo(this.dropPreviewX, this.height);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // 绘制透明水果
            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.ctx.translate(this.dropPreviewX, this.dropPreviewY);
            
            if (ASSETS.FRUITS[this.nextFruitType].img && ASSETS.FRUITS[this.nextFruitType].img.complete) {
                this.ctx.drawImage(
                    ASSETS.FRUITS[this.nextFruitType].img, 
                    -fruitSize/2, -fruitSize/2, 
                    fruitSize, fruitSize
                );
            } else {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, fruitSize/2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
    }
    
    // 绘制下一个水果提示
    renderNextFruit() {
        const fruitSize = ASSETS.FRUITS[this.nextFruitType].size;
        
        // 绘制下一个水果的提示区域
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(10, 90, 100, 50);
        
        this.ctx.fillStyle = 'black';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('下一个:', 60, 105);
        
        // 绘制水果图像
        if (ASSETS.FRUITS[this.nextFruitType].img && ASSETS.FRUITS[this.nextFruitType].img.complete) {
            this.ctx.drawImage(
                ASSETS.FRUITS[this.nextFruitType].img, 
                60 - fruitSize/3, 120 - fruitSize/3, 
                fruitSize*2/3, fruitSize*2/3
            );
        } else {
            this.ctx.fillStyle = 'red';
            this.ctx.beginPath();
            this.ctx.arc(60, 120, fruitSize/3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // 绘制水果
    renderFruit(fruit) {
        this.ctx.save();
        this.ctx.translate(fruit.x, fruit.y);
        this.ctx.rotate(fruit.rotation);
        
        // 剪切圆形区域
        this.ctx.beginPath();
        this.ctx.arc(0, 0, fruit.size/2, 0, Math.PI * 2);
        this.ctx.clip();
        
        // 绘制水果图像
        if (fruit.img && fruit.img.complete) {
            this.ctx.drawImage(fruit.img, -fruit.size/2, -fruit.size/2, fruit.size, fruit.size);
        } else {
            this.ctx.fillStyle = 'red';
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    // 碰撞检测
    checkCollisions() {
        // 使用空间分区进行碰撞检测
        for (let i = 0; i < this.fruits.length; i++) {
            const fruit1 = this.fruits[i];
            const possibleCollisions = this.spatialGrid.getPossibleCollisions(fruit1);
            
            for (let j = 0; j < possibleCollisions.length; j++) {
                const fruit2 = possibleCollisions[j];
                
                // 计算距离
                const dx = fruit1.x - fruit2.x;
                const dy = fruit1.y - fruit2.y;
                const distanceSquared = dx * dx + dy * dy;
                const minDistance = (fruit1.size + fruit2.size) * 0.5;
                
                // 优化: 使用平方距离比较，避免开平方操作
                if (distanceSquared < minDistance * minDistance) {
                    // 计算实际距离，仅在碰撞时需要
                    const distance = Math.sqrt(distanceSquared);
                    
                    // 类型相同则合并
                    if (fruit1.type === fruit2.type) {
                        // 如果这不是最大水果，则创建更大的水果
                        if (fruit1.type < ASSETS.FRUITS.length - 1) {
                            const newType = fruit1.type + 1;
                            const newX = (fruit1.x + fruit2.x) / 2;
                            const newY = Math.min(fruit1.y, fruit2.y) - ASSETS.FRUITS[newType].size/3;
                            
                            // 从对象池获取新水果
                            const newFruit = this.fruitPool.get();
                            newFruit.type = newType;
                            newFruit.x = newX;
                            newFruit.y = newY;
                            newFruit.size = ASSETS.FRUITS[newType].size;
                            newFruit.img = ASSETS.FRUITS[newType].img;
                            newFruit.velocityX = (fruit1.velocityX + fruit2.velocityX) * 0.5;
                            newFruit.velocityY = -2; // 向上的初始速度
                            newFruit.rotation = 0;
                            newFruit.angularVelocity = 0;
                            newFruit.isResting = false;
                            newFruit.restTime = 0;
                            
                            // 添加合并动画效果
                            this.playMergeEffect(fruit1, fruit2, newType);
                            
                            // 添加到水果列表和空间分区
                            this.fruits.push(newFruit);
                            this.spatialGrid.insert(newFruit);
                            
                            // 使用连击系统处理分数
                            const totalPoints = this.comboSystem.onFruitMerge(fruit1, fruit2, newFruit);
                            
                            // 播放合并音效
                            if (this.soundEnabled) {
                                ASSETS.playSound('MERGE', 0.4);
                            }
                            
                            // 尝试生成道具
                            this.powerUpSystem.trySpawnPowerUp(newX, newY);
                            
                            // 成就检测
                            this.checkAchievements(newType);
                        }
                        
                        // 移除这两个水果
                        this.removeFruit(this.fruits.indexOf(fruit2));
                        this.removeFruit(this.fruits.indexOf(fruit1));
                        
                        // 退出循环，防止同时处理多个碰撞
                        return;
                    } else {
                        // 类型不同则反弹
                        this.handleCollisionPhysics(fruit1, fruit2, dx, dy, distance, minDistance);
                    }
                }
            }
        }
    }
    
    // 移除水果
    removeFruit(index) {
        if (index < 0 || index >= this.fruits.length) return;
        
        const fruit = this.fruits[index];
        
        // 从空间分区移除
        this.spatialGrid.remove(fruit);
        
        // 归还到对象池
        this.fruitPool.release(fruit);
        
        // 从数组中移除
        this.fruits.splice(index, 1);
    }
    
    // 检查成就
    checkAchievements(fruitType) {
        // 合成大西瓜成就
        if (fruitType === ASSETS.FRUITS.length - 1) {
            // 播放特殊音效
            if (this.soundEnabled) {
                ASSETS.playSound('GAME_OVER', 0.5); // 复用游戏结束音效
            }
            
            // 特殊视觉效果
            this.particleSystem.createExplosion(
                this.width/2, this.height/2, 
                '#FFD700', // 金色
                100, 5, 120
            );
            
            // 额外得分奖励
            const bonusPoints = 50;
            this.score += bonusPoints;
            
            // 显示成就消息
            this.showAchievementMessage('恭喜合成大西瓜!', `奖励 ${bonusPoints} 分!`);
        }
    }
    
    // 显示成就消息
    showAchievementMessage(title, subtitle) {
        // 创建消息元素
        const messageElement = document.createElement('div');
        messageElement.style.position = 'absolute';
        messageElement.style.top = '40%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.background = 'rgba(255, 215, 0, 0.9)';
        messageElement.style.color = 'black';
        messageElement.style.padding = '20px';
        messageElement.style.borderRadius = '10px';
        messageElement.style.textAlign = 'center';
        messageElement.style.boxShadow = '0 0 20px gold';
        messageElement.style.zIndex = '100';
        messageElement.style.transition = 'opacity 1s';
        messageElement.style.opacity = '0';
        
        messageElement.innerHTML = `
            <h2 style="margin:0;font-size:24px;">${title}</h2>
            <p style="margin:10px 0 0;font-size:18px;">${subtitle}</p>
        `;
        
        document.body.appendChild(messageElement);
        
        // 显示和淡出动画
        setTimeout(() => {
            messageElement.style.opacity = '1';
            
            setTimeout(() => {
                messageElement.style.opacity = '0';
                
                setTimeout(() => {
                    document.body.removeChild(messageElement);
                }, 1000);
            }, 3000);
        }, 0);
    }

    // 鼠标点击事件
    handleClick(e) {
        // 尝试解锁音频
        this.unlockAudio();
        
        if (this.gameOver || this.paused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);
        
        // 检查是否点击了UI按钮
        if (this.ui.handleClick({clientX: e.clientX, clientY: e.clientY})) {
            return;
        }
        
        // 限制只能在顶部区域内生成水果
        if (y > GAME_CONFIG.DROP_ZONE_HEIGHT) return;
        
        // 创建水果
        this.dropFruitAt(x, y);
    }

    // 重新开始游戏
    restartGame() {
        this.score = 0;
        this.gameOver = false;
        this.fruits = [];
        document.getElementById('restartButton').style.display = 'none';
        
        // 清空所有水果
        this.clearFruits();
        
        // 重新生成下一个水果类型
        this.generateNextFruitType();
        
        // 重新开始游戏循环
        if (!this.animationId) {
            this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        }
        
        // 播放背景音乐
        if (this.musicEnabled) {
            ASSETS.playSound('BACKGROUND', 0.3);
        }
    }
    
    // 暂停游戏
    pause() {
        this.paused = true;
    }
    
    // 恢复游戏
    resume() {
        this.paused = false;
    }
    
    // 切换暂停状态
    togglePause() {
        this.paused = !this.paused;
    }
    
    // 切换音乐
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('musicEnabled', this.musicEnabled);
        
        // 更新音乐状态
        if (this.musicEnabled) {
            ASSETS.playSound('BACKGROUND', 0.3);
        }
    }
    
    // 切换音效
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled);
    }
    
    // 设置难度
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        localStorage.setItem('difficulty', difficulty);
        this.updateDifficultyParameters();
    }
    
    // 处理鼠标移动
    handleMouseMove(e) {
        if (this.gameOver || this.paused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);
        
        // 更新预览位置
        if (y <= GAME_CONFIG.DROP_ZONE_HEIGHT) {
            this.dropPreviewX = x;
            this.dropPreviewY = y;
        }
    }
    
    // 处理触摸移动
    handleTouchMove(e) {
        if (this.gameOver || this.paused) return;
        
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (this.width / rect.width);
        const y = (touch.clientY - rect.top) * (this.height / rect.height);
        
        // 更新预览位置
        if (y <= GAME_CONFIG.DROP_ZONE_HEIGHT) {
            this.dropPreviewX = x;
            this.dropPreviewY = y;
        }
    }
    
    // 处理触摸开始
    handleTouchStart(e) {
        // 尝试解锁音频
        this.unlockAudio();
        
        // 防止页面缩放和滚动
        e.preventDefault();
        
        // 模拟点击
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (this.width / rect.width);
        const y = (touch.clientY - rect.top) * (this.height / rect.height);
        
        // 检查是否点击了UI按钮
        if (this.ui.handleClick({clientX: touch.clientX, clientY: touch.clientY})) {
            return;
        }
        
        // 如果在投放区域，创建水果
        if (y <= GAME_CONFIG.DROP_ZONE_HEIGHT && !this.gameOver && !this.paused) {
            this.dropFruitAt(x, y);
        }
    }
    
    // 处理键盘事件
    handleKeyDown(e) {
        // 尝试解锁音频
        this.unlockAudio();
        
        switch (e.key) {
            case 'p':
            case 'P':
                this.togglePause();
                break;
            case 'm':
            case 'M':
                this.toggleMusic();
                break;
            case 's':
            case 'S':
                this.toggleSound();
                break;
            case 'r':
            case 'R':
                if (this.gameOver) {
                    this.restartGame();
                }
                break;
            case 'ArrowLeft':
                if (!this.gameOver && !this.paused) {
                    this.dropPreviewX = Math.max(20, this.dropPreviewX - 10);
                }
                break;
            case 'ArrowRight':
                if (!this.gameOver && !this.paused) {
                    this.dropPreviewX = Math.min(this.width - 20, this.dropPreviewX + 10);
                }
                break;
            case ' ':
                if (!this.gameOver && !this.paused && this.dropPreviewX > 0) {
                    this.dropFruitAt(this.dropPreviewX, 20);
                }
                break;
        }
    }
    
    // 在指定位置放置水果
    dropFruitAt(x, y) {
        // 检查是否已经有太多水果
        if (this.fruits.length >= 30) {
            // 提示玩家等待一下
            this.showMessage('等待一下，水果太多了！', 'red');
            return;
        }
        
        // 检查是否有重叠的水果
        let hasCollision = false;
        let minY = y;
        
        for (const fruit of this.fruits) {
            const dx = x - fruit.x;
            const dy = y - fruit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (ASSETS.FRUITS[this.nextFruitType].size + fruit.size) * 0.5;
            
            if (distance < minDistance) {
                hasCollision = true;
                // 计算新水果应该放置的位置（在碰撞水果的顶部）
                const newY = fruit.y - (ASSETS.FRUITS[this.nextFruitType].size/2 + fruit.size/2) * 0.9;
                if (newY < minY) minY = newY;
            }
        }
        
        // 从对象池获取新水果
        const fruit = this.fruitPool.get();
        
        // 初始化水果
        fruit.type = this.nextFruitType;
        fruit.x = x + (Math.random() * 10 - 5); // ±5像素随机偏移
        fruit.y = (hasCollision ? minY : y) + (Math.random() * 10 - 5); // ±5像素随机偏移
        fruit.size = ASSETS.FRUITS[this.nextFruitType].size;
        fruit.img = ASSETS.FRUITS[this.nextFruitType].img;
        fruit.velocityX = 0;
        fruit.velocityY = hasCollision ? -1 : 0; // 轻微向上速度使堆叠更自然
        fruit.rotation = 0;
        fruit.angularVelocity = (Math.random() - 0.5) * 0.1;
        fruit.isResting = false;
        fruit.restTime = 0;
        
        // 添加到水果列表和空间分区
        this.fruits.push(fruit);
        this.spatialGrid.insert(fruit);
        
        // 检查道具收集
        this.powerUpSystem.checkPowerUpCollection(fruit.x, fruit.y, fruit.size);
        
        // 播放放置音效
        if (this.soundEnabled) {
            ASSETS.playSound('POP', 0.3);
        }
        
        // 检查双倍道具
        if (this.powerUpSystem.canUseDouble()) {
            this.powerUpSystem.useDouble();
            
            // 创建第二个水果
            const fruit2 = this.fruitPool.get();
            fruit2.type = this.nextFruitType;
            fruit2.x = x + (Math.random() * 20 - 10); // 稍微偏移
            fruit2.y = (hasCollision ? minY : y) + (Math.random() * 20 - 10);
            fruit2.size = ASSETS.FRUITS[this.nextFruitType].size;
            fruit2.img = ASSETS.FRUITS[this.nextFruitType].img;
            fruit2.velocityX = 0;
            fruit2.velocityY = hasCollision ? -1 : 0;
            fruit2.rotation = 0;
            fruit2.angularVelocity = (Math.random() - 0.5) * 0.1;
            fruit2.isResting = false;
            fruit2.restTime = 0;
            
            this.fruits.push(fruit2);
            this.spatialGrid.insert(fruit2);
            
            // 检查第二个水果的道具收集
            this.powerUpSystem.checkPowerUpCollection(fruit2.x, fruit2.y, fruit2.size);
        }
        
        // 生成新的下一个水果类型
        this.generateNextFruitType();
    }
    
    // 生成下一个水果类型
    generateNextFruitType() {
        // 水果类型随机生成，但有权重偏向较小的水果
        const weights = [
            100, // 樱桃
            80,  // 葡萄
            60,  // 橘子
            40,  // 猕猴桃
            20,  // 西红柿
            10,  // 桃
            5,   // 菠萝
            2,   // 椰子
            1,   // 柠檬
            0,   // 西瓜 (不直接生成)
            0    // 大西瓜 (不直接生成)
        ];
        
        let totalWeight = weights.reduce((a, b) => a + b, 0);
        let randomValue = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            if (randomValue < weights[i]) {
                this.nextFruitType = i;
                return;
            }
            randomValue -= weights[i];
        }
        
        // 默认是樱桃
        this.nextFruitType = 0;
    }
    
    // 显示消息
    showMessage(message, color = 'black', duration = 2000) {
        const y = 40;
        
        // 绘制消息背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(0, y - 20, this.width, 40);
        
        // 绘制消息文本
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(message, this.width/2, y);
        
        // 设置定时器清除消息
        setTimeout(() => {
            // 下一帧重绘
            this.render();
        }, duration);
    }
    
    // 游戏结束检测
    checkGameOver() {
        // 如果已经游戏结束，不重复检测
        if (this.gameOver) return;
        
        // 检查护盾保护
        if (this.powerUpSystem.hasShield()) {
            return; // 护盾保护期间不会游戏结束
        }
        
        // 检测水果是否达到顶部
        let topCount = 0;
        
        for (const fruit of this.fruits) {
            // 水果碰到顶部且几乎静止（超过休息时间）
            if (fruit.y - fruit.size/2 <= 10 && 
                (Math.abs(fruit.velocityY) < 0.5 || fruit.isResting)) {
                
                fruit.restTime += 1;
                
                // 如果水果在顶部静止超过3秒，则游戏结束
                if (fruit.restTime > 180) {
                    topCount++;
                    
                    // 如果有两个以上水果在顶部静止，则游戏结束
                    if (topCount >= 2) {
                        this.triggerGameOver();
                        return;
                    }
                }
            }
        }
    }
    
    // 触发游戏结束
    triggerGameOver() {
        this.gameOver = true;
        
        // 显示重新开始按钮
        document.getElementById('restartButton').style.display = 'block';
        
        // 播放游戏结束音效
        if (this.soundEnabled) {
            ASSETS.playSound('GAME_OVER', 0.5);
        }
        
        // 创建爆炸效果
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const x = Math.random() * this.width;
                const y = Math.random() * this.height / 2;
                this.particleSystem.createExplosion(
                    x, y, 
                    '#FF5252', // 红色
                    30, 5, 60
                );
            }, i * 200);
        }
        
        // 保存最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            
            // 显示新纪录消息
            this.showMessage('新纪录！', '#FF9900', 3000);
        }
        
        console.log('游戏结束，最终分数：' + this.score);
    }
    
    // 处理碰撞物理效应
    handleCollisionPhysics(fruit1, fruit2, dx, dy, distance, minDistance) {
        const overlap = minDistance - distance;
        
        // 碰撞法线
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        // 计算相对速度
        const relativeVelocityX = fruit1.velocityX - fruit2.velocityX;
        const relativeVelocityY = fruit1.velocityY - fruit2.velocityY;
        
        // 计算法线方向的相对速度
        const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;
        
        // 不处理分离的情况
        if (velocityAlongNormal > 0) return;
        
        // 计算冲量
        const restitution = PHYSICS.RESTITUTION;
        const j = -(1 + restitution) * velocityAlongNormal;
        
        // 应用冲量
        const impulseX = j * normalX;
        const impulseY = j * normalY;
        
        fruit1.velocityX += impulseX * 0.5;
        fruit1.velocityY += impulseY * 0.5;
        fruit2.velocityX -= impulseX * 0.5;
        fruit2.velocityY -= impulseY * 0.5;
        
        // 调整位置防止穿透
        const percent = 0.2; // 位置修正系数
        const correction = (overlap / 2) * percent;
        const correctionX = normalX * correction;
        const correctionY = normalY * correction;
        
        fruit1.x += correctionX;
        fruit1.y += correctionY;
        fruit2.x -= correctionX;
        fruit2.y -= correctionY;
        
        // 添加旋转效果
        fruit1.angularVelocity += (impulseX * 0.001) * (Math.random() - 0.5);
        fruit2.angularVelocity += (impulseX * 0.001) * (Math.random() - 0.5);
        
        // 播放碰撞音效
        if (this.soundEnabled && Math.abs(velocityAlongNormal) > 3) {
            ASSETS.playSound('POP', Math.min(0.3, Math.abs(velocityAlongNormal) / 20));
        }
    }
    
    // 播放合并效果
    playMergeEffect(fruit1, fruit2, newType) {
        const centerX = (fruit1.x + fruit2.x) / 2;
        const centerY = (fruit1.y + fruit2.y) / 2;
        
        // 使用粒子系统创建视觉效果
        if (this.particleSystem) {
            // 获取水果颜色
            const colors = [
                '#FF6B6B', // 樱桃红
                '#9775FA', // 葡萄紫
                '#FF922B', // 橘子橙
                '#51CF66', // 猕猴桃绿
                '#FF8787', // 西红柿红
                '#FFA8A8', // 桃粉红
                '#FFEC99', // 菠萝黄
                '#FFF9DB', // 椰子白
                '#FFEC99', // 柠檬黄
                '#EF3F3F', // 西瓜红
                '#20C997'  // 大西瓜青
            ];
            
            this.particleSystem.createMergeEffect(fruit1, fruit2, newType);
        } else {
            // 简单闪烁效果（备用效果）
            this.ctx.save();
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, fruit1.size, 0, Math.PI * 2);
            this.ctx.fillStyle = 'yellow';
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    // 解锁音频上下文（在第一次用户交互时调用）
    unlockAudio() {
        // 如果音频上下文已解锁或不存在，则返回
        if (!ASSETS.audioContext || ASSETS.audioContext.state === 'running') {
            return;
        }
        
        // 尝试解锁音频上下文
        ASSETS.audioContext.resume().then(() => {
            console.log('音频上下文已解锁');
        }).catch(e => {
            console.warn('无法解锁音频上下文:', e);
        });
    }
}

// 启动游戏
window.onload = () => {
    // 检查是否支持所需的API
    if (!window.requestAnimationFrame) {
        alert('您的浏览器不支持本游戏所需的功能。请更新浏览器后再试。');
        return;
    }
    
    // 创建游戏实例
    window.game = new FruitGame();
};
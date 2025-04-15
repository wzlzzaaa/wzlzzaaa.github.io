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

// 游戏状态
let score = 0;
let gameOver = false;
let fruits = [];

// 初始化游戏
function init() {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // 创建加载容器
    const loadingContainer = document.createElement('div');
    loadingContainer.style.position = 'absolute';
    loadingContainer.style.top = '50%';
    loadingContainer.style.left = '50%';
    loadingContainer.style.transform = 'translate(-50%, -50%)';
    loadingContainer.style.textAlign = 'center';
    
    // 加载文本
    const loadingText = document.createElement('div');
    loadingText.style.font = '24px Arial';
    loadingText.style.marginBottom = '10px';
    
    // 进度条容器
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.width = '300px';
    progressBarContainer.style.height = '20px';
    progressBarContainer.style.border = '1px solid #000';
    progressBarContainer.style.borderRadius = '10px';
    progressBarContainer.style.overflow = 'hidden';
    progressBarContainer.style.marginBottom = '10px';
    
    // 进度条
    const progressBar = document.createElement('div');
    progressBar.style.height = '100%';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '#4CAF50';
    progressBar.style.transition = 'width 0.3s';
    
    // 预计时间文本
    const timeText = document.createElement('div');
    timeText.style.font = '16px Arial';
    
    // 跳过加载按钮
    const skipButton = document.createElement('button');
    skipButton.textContent = '跳过加载直接游玩';
    skipButton.style.padding = '10px 20px';
    skipButton.style.marginTop = '20px';
    skipButton.style.fontSize = '16px';
    skipButton.style.cursor = 'pointer';
    skipButton.style.backgroundColor = '#f0f0f0';
    skipButton.style.border = '1px solid #ccc';
    skipButton.style.borderRadius = '5px';
    skipButton.onclick = function() {
        document.body.removeChild(loadingContainer);
        setInterval(gameLoop, 1000/60);
    };
    
    // 组装元素
    progressBarContainer.appendChild(progressBar);
    loadingContainer.appendChild(loadingText);
    loadingContainer.appendChild(progressBarContainer);
    loadingContainer.appendChild(timeText);
    loadingContainer.appendChild(skipButton);
    document.body.appendChild(loadingContainer);
    
    // 预加载所有图片
    let loadedCount = 0;
    const startTime = Date.now();
    FRUIT_TYPES.forEach(fruit => {
        fruit.img = new Image();
        fruit.img.onload = () => {
            loadedCount++;
            const progress = (loadedCount / FRUIT_TYPES.length) * 100;
            progressBar.style.width = `${progress}%`;
            
            // 计算预计剩余时间
            const elapsedTime = (Date.now() - startTime) / 1000;
            const remainingTime = (elapsedTime / loadedCount) * (FRUIT_TYPES.length - loadedCount);
            
            loadingText.textContent = `加载中... ${loadedCount}/${FRUIT_TYPES.length} (${progress.toFixed(1)}%)`;
            timeText.textContent = `预计剩余时间: ${remainingTime.toFixed(1)}秒`;
            
            if (loadedCount === FRUIT_TYPES.length) {
                document.body.removeChild(loadingContainer);
                // 游戏循环
                setInterval(gameLoop, 1000/60);
            }
        };
        fruit.img.src = fruit.image;
    });
}

// 游戏主循环
function gameLoop() {
    if (gameOver) return;
    
    update();
    render();
}

// 更新游戏状态
function update() {
    // 水果下落逻辑
    fruits.forEach(fruit => {
        // 添加物理效果 - 加速度、摩擦力和旋转
        if (!fruit.velocityY) fruit.velocityY = 0;
        if (!fruit.velocityX) fruit.velocityX = 0;
        if (!fruit.rotation) fruit.rotation = 0;
        if (!fruit.angularVelocity) fruit.angularVelocity = 0;
        
        fruit.velocityY += 0.5; // 重力加速度
        fruit.velocityX *= 0.98; // 摩擦力
        
        // 根据水平速度添加旋转效果
        fruit.angularVelocity += fruit.velocityX * 0.01;
        fruit.angularVelocity *= 0.95; // 旋转摩擦力
        fruit.rotation += fruit.angularVelocity;
        
        fruit.y += fruit.velocityY;
        fruit.x += fruit.velocityX;
        
        // 边界检测
        const canvas = document.getElementById('gameCanvas');
        const radius = fruit.size/2;
        
        // 底部边界
        if (fruit.y + radius >= canvas.height) {
            fruit.y = canvas.height - radius;
            fruit.velocityY *= -0.6; // 反弹效果
            fruit.velocityX *= 0.8; // 水平摩擦力
        }
        
        // 左右边界
        if (fruit.x - radius <= 0) {
            fruit.x = radius;
            fruit.velocityX *= -0.6;
        } else if (fruit.x + radius >= canvas.width) {
            fruit.x = canvas.width - radius;
            fruit.velocityX *= -0.6;
        }
        
        // 游戏结束检测
        if (fruit.y - radius <= 0) {
            gameOver = true;
        }
    });
    
    // 碰撞检测
    checkCollisions();
    
    // 游戏结束检测
    checkGameOver();
}

// 渲染游戏
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制水果
    fruits.forEach(fruit => {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        
        ctx.beginPath();
            ctx.arc(0, 0, fruit.size/2, 0, Math.PI * 2);
            ctx.clip();
            
            if (fruit.img && fruit.img.complete) {
                ctx.drawImage(fruit.img, -fruit.size/2, -fruit.size/2, fruit.size, fruit.size);
            } else {
                ctx.fillStyle = 'red';
                ctx.fill();
            }
        
        ctx.restore();
    });
    
    // 绘制分数
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`分数: ${score}`, 20, 30);
    
    // 绘制生成区域指示器
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, 200);
    
    // 游戏结束显示
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width/2, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText(`最终分数: ${score}`, canvas.width/2, canvas.height/2 + 50);
    }
}

// 碰撞检测
function checkCollisions() {
    // 检查所有水果对
    for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
            const fruit1 = fruits[i];
            const fruit2 = fruits[j];
            
            // 计算距离
            const dx = fruit1.x - fruit2.x;
            const dy = fruit1.y - fruit2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 碰撞阈值
            const minDistance = (fruit1.size + fruit2.size) * 0.5;
            
            // 如果距离小于两个水果半径之和
            if (distance < minDistance) {
                // 类型相同则合并
                if (fruit1.type === fruit2.type) {
                    // 移除这两个水果
                    fruits.splice(j, 1);
                    fruits.splice(i, 1);
                    
                    // 如果这不是最大水果，则创建更大的水果
                    if (fruit1.type < FRUIT_TYPES.length - 1) {
                        const newType = fruit1.type + 1;
                        const newFruit = {
                            type: newType,
                            x: (fruit1.x + fruit2.x) / 2,
                            y: Math.min(fruit1.y, fruit2.y) - FRUIT_TYPES[newType].size/2,
                            size: FRUIT_TYPES[newType].size,
                            img: FRUIT_TYPES[newType].img
                        };
                        fruits.push(newFruit);
                        score += FRUIT_TYPES[newType].points;
                    }
                    
                    // 退出循环，防止同时处理多个碰撞
                    return;
                } else {
                    // 类型不同则反弹
                    const overlap = minDistance - distance;
                    const angle = Math.atan2(dy, dx);
                    
                    // 调整位置防止重叠
                    const moveX = overlap * Math.cos(angle) * 0.5;
                    const moveY = overlap * Math.sin(angle) * 0.5;
                    
                    // 更真实的圆形碰撞响应
                    const normalX = dx / distance;
                    const normalY = dy / distance;
                    
                    // 计算相对速度
                    const relativeVelocityX = fruit1.velocityX - fruit2.velocityX;
                    const relativeVelocityY = fruit1.velocityY - fruit2.velocityY;
                    
                    // 计算冲量
                    const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;
                    
                    // 不处理分离的情况
                    if (velocityAlongNormal > 0) continue;
                    
                    // 计算反弹力度
                    const restitution = 0.8;
                    const j = -(1 + restitution) * velocityAlongNormal;
                    
                    // 应用冲量
                    const impulseX = j * normalX;
                    const impulseY = j * normalY;
                    
                    fruit1.velocityX += impulseX * 0.5;
                    fruit1.velocityY += impulseY * 0.5;
                    fruit2.velocityX -= impulseX * 0.5;
                    fruit2.velocityY -= impulseY * 0.5;
                    
                    // 调整位置防止穿透
                    fruit1.x += normalX * overlap * 0.5;
                    fruit1.y += normalY * overlap * 0.5;
                    fruit2.x -= normalX * overlap * 0.5;
                    fruit2.y -= normalY * overlap * 0.5;
                    
                    // 添加旋转效果
                    fruit1.angularVelocity += (fruit1.velocityX * 0.01) * (Math.random() - 0.5);
                    fruit2.angularVelocity += (fruit2.velocityX * 0.01) * (Math.random() - 0.5);
                }
            }
        }
    }
}

// 游戏结束检测
function checkGameOver() {
    // 检查是否有水果超过画布高度
    const canvas = document.getElementById('gameCanvas');
    fruits.forEach(fruit => {
        if (fruit.y - fruit.size/2 <= 0) {
            gameOver = true;
        }
    });
}

// 鼠标点击事件
function handleClick(e) {
    if (gameOver) return;
    
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 限制只能在顶部200像素区域内生成水果
    if (y > 200) return;
    
    // 检查是否有重叠的水果
    let hasCollision = false;
    let minY = y;
    
    fruits.forEach(fruit => {
        const dx = x - fruit.x;
        const dy = y - fruit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (FRUIT_TYPES[0].size + fruit.size) * 0.5;
        
        if (distance < minDistance) {
            hasCollision = true;
            // 计算新水果应该放置的位置（在碰撞水果的顶部）
            const newY = fruit.y - (FRUIT_TYPES[0].size/2 + fruit.size/2) * 0.9;
            if (newY < minY) minY = newY;
        }
    });
    
    // 创建新水果
    const newFruit = {
        type: 0, // 初始为最小水果
        x: x + (Math.random() * 20 - 10), // ±10像素随机偏移
        y: (hasCollision ? minY : y) + (Math.random() * 20 - 10), // ±10像素随机偏移
        size: FRUIT_TYPES[0].size,
        img: FRUIT_TYPES[0].img,
        velocityY: hasCollision ? -1 : 0 // 轻微向上速度使堆叠更自然
    };
    
    fruits.push(newFruit);
}

// 启动游戏
window.onload = init;
document.addEventListener('click', handleClick);

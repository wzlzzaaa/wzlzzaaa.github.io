// 粒子系统 - 用于视觉效果
class Particle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.1;
        this.drag = 0.98;
        this.color = 'white';
        this.alpha = 1;
        this.size = 5;
        this.life = 100;
        this.maxLife = 100;
        this.active = false;
    }
    
    // 初始化粒子
    init(x, y, color, size, life, velocityX = 0, velocityY = 0) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.alpha = 1;
        this.active = true;
    }
    
    // 更新粒子状态
    update() {
        if (!this.active) return;
        
        this.velocityX *= this.drag;
        this.velocityY *= this.drag;
        this.velocityY += this.gravity;
        
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        this.life--;
        this.alpha = this.life / this.maxLife;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    // 渲染粒子
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class ParticleSystem {
    constructor(maxParticles = 500) {
        this.particlePool = new ObjectPool(() => new Particle(), maxParticles);
        this.particles = [];
    }
    
    // 创建粒子爆炸效果
    createExplosion(x, y, color, count = 20, size = 3, life = 60) {
        for (let i = 0; i < count; i++) {
            const particle = this.particlePool.get();
            
            // 随机速度和方向
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            // 随机化大小和生命周期
            const particleSize = size * (0.5 + Math.random() * 0.5);
            const particleLife = life * (0.8 + Math.random() * 0.4);
            
            // 初始化粒子
            particle.init(x, y, color, particleSize, particleLife, velocityX, velocityY);
            
            this.particles.push(particle);
        }
    }
    
    // 创建水果合并特效
    createMergeEffect(fruit1, fruit2, newType) {
        const centerX = (fruit1.x + fruit2.x) / 2;
        const centerY = (fruit1.y + fruit2.y) / 2;
        
        // 合并的水果颜色
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
        
        // 创建合并效果
        const color1 = colors[fruit1.type];
        const color2 = colors[fruit2.type];
        const newColor = colors[newType];
        
        // 从两个水果产生粒子
        this.createExplosion(centerX, centerY, color1, 15, 4, 50);
        this.createExplosion(centerX, centerY, color2, 15, 4, 50);
        this.createExplosion(centerX, centerY, newColor, 30, 5, 70);
        
        // 创建星形光效
        this.createStarEffect(centerX, centerY, newColor);
    }
    
    // 创建星形光效
    createStarEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const particle = this.particlePool.get();
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            
            // 向中心的速度
            const velocityX = (x - px) * 0.03;
            const velocityY = (y - py) * 0.03;
            
            particle.init(px, py, color, 6, 40, velocityX, velocityY);
            particle.gravity = 0; // 禁用重力
            
            this.particles.push(particle);
        }
    }
    
    // 创建水果落地效果
    createLandingEffect(x, y, color, size) {
        // 横向扩散的粒子
        for (let i = 0; i < 10; i++) {
            const particle = this.particlePool.get();
            
            const angle = (Math.random() - 0.5) * Math.PI; // -PI/2 到 PI/2
            const speed = 1 + Math.random() * 3;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed - 2; // 向上初始速度
            
            particle.init(x, y, color, size * 0.2, 30, velocityX, velocityY);
            particle.gravity = 0.15;
            
            this.particles.push(particle);
        }
    }
    
    // 更新所有粒子
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.update();
            
            // 如果粒子生命周期结束，将其返回到对象池
            if (!particle.active) {
                this.particlePool.release(particle);
                this.particles.splice(i, 1);
            }
        }
    }
    
    // 渲染所有粒子
    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    // 清除所有粒子
    clear() {
        for (const particle of this.particles) {
            this.particlePool.release(particle);
        }
        this.particles = [];
    }
} 
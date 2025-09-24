// 连击系统和道具系统
class ComboSystem {
    constructor(game) {
        this.game = game;
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.lastMergeTime = 0;
        this.comboTimeout = 2000; // 2秒内连续合并才算连击
        this.maxCombo = 20; // 最大连击数
        this.comboAnimations = [];
        this.comboSoundCooldown = 0;
    }
    
    // 处理水果合并事件
    onFruitMerge(fruit1, fruit2, newFruit) {
        const now = Date.now();
        
        // 检查是否在连击时间窗口内
        if (now - this.lastMergeTime < this.comboTimeout) {
            this.comboCount++;
            this.comboMultiplier = Math.min(5, 1 + this.comboCount * 0.2);
            
            // 创建连击动画
            this.createComboAnimation(newFruit.x, newFruit.y - 30, this.comboCount);
            
            // 播放连击音效
            this.playComboSound();
            
            // 连击特效
            this.createComboEffect(newFruit.x, newFruit.y);
            
        } else {
            // 重置连击
            this.resetCombo();
            this.comboCount = 1;
            this.comboMultiplier = 1.2;
        }
        
        this.lastMergeTime = now;
        
        // 计算连击奖励分数
        const basePoints = ASSETS.FRUITS[newFruit.type].points;
        const comboBonus = Math.floor(basePoints * (this.comboMultiplier - 1));
        const totalPoints = basePoints + comboBonus;
        
        // 更新游戏分数
        this.game.score += totalPoints;
        
        // 创建分数动画
        this.game.ui.createScoreAnimation(newFruit.x, newFruit.y - 20, totalPoints, this.comboCount > 1 ? '#FFD700' : '#FFFFFF');
        
        // 更新最高分
        if (this.game.score > this.game.highScore) {
            this.game.highScore = this.game.score;
            localStorage.setItem('highScore', this.game.highScore);
        }
        
        return totalPoints;
    }
    
    // 创建连击动画
    createComboAnimation(x, y, comboCount) {
        const animation = {
            x: x,
            y: y,
            text: `连击 x${comboCount}`,
            scale: 1.5,
            alpha: 1,
            life: 60,
            maxLife: 60,
            color: this.getComboColor(comboCount),
            active: true
        };
        
        this.comboAnimations.push(animation);
    }
    
    // 根据连击数获取颜色
    getComboColor(comboCount) {
        if (comboCount >= 10) return '#FF0000'; // 红色 - 超级连击
        if (comboCount >= 7) return '#FF6600';  // 橙色 - 高级连击
        if (comboCount >= 5) return '#FFD700';  // 金色 - 中级连击
        if (comboCount >= 3) return '#00FF00';  // 绿色 - 初级连击
        return '#FFFFFF'; // 白色 - 普通
    }
    
    // 创建连击特效
    createComboEffect(x, y) {
        if (this.game.particleSystem) {
            const colors = ['#FFD700', '#FF6600', '#FF0000', '#FFFFFF'];
            const color = colors[Math.min(Math.floor(this.comboCount / 3), colors.length - 1)];
            
            // 创建星形爆炸效果
            this.game.particleSystem.createStarEffect(x, y, color);
            
            // 高连击时的特殊效果
            if (this.comboCount >= 5) {
                this.game.particleSystem.createExplosion(x, y, color, 30, 6, 80);
            }
        }
    }
    
    // 播放连击音效
    playComboSound() {
        if (this.comboSoundCooldown > 0) return;
        
        if (this.game.soundEnabled && ASSETS.sounds) {
            // 根据连击数播放不同音效
            if (this.comboCount >= 10) {
                ASSETS.playSound('COMBO_SUPER', 0.6);
            } else if (this.comboCount >= 5) {
                ASSETS.playSound('COMBO_HIGH', 0.5);
            } else if (this.comboCount >= 3) {
                ASSETS.playSound('COMBO_MEDIUM', 0.4);
            } else {
                ASSETS.playSound('COMBO_LOW', 0.3);
            }
        }
        
        this.comboSoundCooldown = 10; // 防止音效重叠
    }
    
    // 重置连击
    resetCombo() {
        if (this.comboCount > 0) {
            // 创建连击结束动画
            this.createComboEndAnimation();
        }
        this.comboCount = 0;
        this.comboMultiplier = 1;
    }
    
    // 创建连击结束动画
    createComboEndAnimation() {
        if (this.comboCount >= 5) {
            // 高连击结束时的特殊效果
            const centerX = this.game.width / 2;
            const centerY = this.game.height / 2;
            
            if (this.game.particleSystem) {
                this.game.particleSystem.createExplosion(centerX, centerY, '#FFD700', 50, 8, 100);
            }
            
            // 显示连击结束消息
            this.game.showMessage(`连击结束！最高连击: ${this.comboCount}`, '#FFD700', 3000);
        }
    }
    
    // 更新连击系统
    update() {
        // 更新音效冷却
        if (this.comboSoundCooldown > 0) {
            this.comboSoundCooldown--;
        }
        
        // 检查连击超时
        const now = Date.now();
        if (now - this.lastMergeTime > this.comboTimeout && this.comboCount > 0) {
            this.resetCombo();
        }
        
        // 更新连击动画
        for (let i = this.comboAnimations.length - 1; i >= 0; i--) {
            const animation = this.comboAnimations[i];
            
            animation.life--;
            animation.y -= 1; // 向上移动
            animation.alpha = animation.life / animation.maxLife;
            
            if (animation.life <= 0) {
                this.comboAnimations.splice(i, 1);
            }
        }
    }
    
    // 渲染连击信息
    render(ctx) {
        // 渲染连击动画
        for (const animation of this.comboAnimations) {
            ctx.save();
            ctx.globalAlpha = animation.alpha;
            ctx.fillStyle = animation.color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.font = `bold ${Math.floor(20 * animation.scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 描边文字
            ctx.strokeText(animation.text, animation.x, animation.y);
            ctx.fillText(animation.text, animation.x, animation.y);
            
            ctx.restore();
        }
        
        // 渲染当前连击信息
        if (this.comboCount > 0) {
            ctx.fillStyle = this.getComboColor(this.comboCount);
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`连击: ${this.comboCount}x`, this.game.width - 20, 90);
            
            if (this.comboMultiplier > 1) {
                ctx.fillText(`倍数: ${this.comboMultiplier.toFixed(1)}x`, this.game.width - 20, 110);
            }
        }
    }
    
    // 获取当前连击信息
    getComboInfo() {
        return {
            count: this.comboCount,
            multiplier: this.comboMultiplier,
            isActive: this.comboCount > 0
        };
    }
}

// 道具系统
class PowerUpSystem {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.activePowerUps = new Map();
        this.powerUpSpawnChance = 0.1; // 10%概率生成道具
        this.powerUpTypes = ['bomb', 'freeze', 'magnet', 'double', 'shield'];
        this.powerUpAnimations = [];
    }
    
    // 随机生成道具
    trySpawnPowerUp(x, y) {
        if (Math.random() < this.powerUpSpawnChance) {
            const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];
            this.spawnPowerUp(x, y, type);
        }
    }
    
    // 生成道具
    spawnPowerUp(x, y, type) {
        const powerUp = {
            x: x,
            y: y,
            type: type,
            size: 40,
            rotation: 0,
            angularVelocity: 0.1,
            life: 300, // 5秒后消失
            maxLife: 300,
            active: true,
            collected: false
        };
        
        this.powerUps.push(powerUp);
        
        // 播放生成音效
        if (this.game.soundEnabled) {
            ASSETS.playSound('POWERUP_SPAWN', 0.3);
        }
    }
    
    // 使用道具
    usePowerUp(type) {
        switch(type) {
            case 'bomb':
                this.activateBomb();
                break;
            case 'freeze':
                this.activateFreeze();
                break;
            case 'magnet':
                this.activateMagnet();
                break;
            case 'double':
                this.activateDouble();
                break;
            case 'shield':
                this.activateShield();
                break;
        }
    }
    
    // 炸弹道具 - 清除周围水果
    activateBomb() {
        const bombRadius = 150;
        const bombCenterX = this.game.width / 2;
        const bombCenterY = this.game.height / 2;
        
        // 创建爆炸效果
        if (this.game.particleSystem) {
            this.game.particleSystem.createExplosion(bombCenterX, bombCenterY, '#FF0000', 50, 8, 100);
        }
        
        // 清除范围内的水果
        for (let i = this.game.fruits.length - 1; i >= 0; i--) {
            const fruit = this.game.fruits[i];
            const distance = Math.sqrt(
                Math.pow(fruit.x - bombCenterX, 2) + 
                Math.pow(fruit.y - bombCenterY, 2)
            );
            
            if (distance <= bombRadius) {
                // 创建水果消失效果
                if (this.game.particleSystem) {
                    this.game.particleSystem.createExplosion(fruit.x, fruit.y, '#FF6600', 15, 4, 50);
                }
                
                // 移除水果
                this.game.removeFruit(i);
            }
        }
        
        // 播放爆炸音效
        if (this.game.soundEnabled) {
            ASSETS.playSound('BOMB_EXPLODE', 0.7);
        }
        
        this.game.showMessage('炸弹爆炸！', '#FF0000', 2000);
    }
    
    // 冰冻道具 - 暂时停止所有水果运动
    activateFreeze() {
        const freezeDuration = 3000; // 3秒
        
        // 冰冻所有水果
        for (const fruit of this.game.fruits) {
            fruit.frozen = true;
            fruit.originalVelocityX = fruit.velocityX;
            fruit.originalVelocityY = fruit.velocityY;
            fruit.velocityX = 0;
            fruit.velocityY = 0;
        }
        
        // 设置解冻定时器
        setTimeout(() => {
            for (const fruit of this.game.fruits) {
                if (fruit.frozen) {
                    fruit.frozen = false;
                    fruit.velocityX = fruit.originalVelocityX;
                    fruit.velocityY = fruit.originalVelocityY;
                }
            }
        }, freezeDuration);
        
        // 创建冰冻效果
        if (this.game.particleSystem) {
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * this.game.width;
                const y = Math.random() * this.game.height;
                this.game.particleSystem.createExplosion(x, y, '#00FFFF', 10, 3, 40);
            }
        }
        
        // 播放冰冻音效
        if (this.game.soundEnabled) {
            ASSETS.playSound('FREEZE', 0.5);
        }
        
        this.game.showMessage('冰冻时间！', '#00FFFF', 2000);
    }
    
    // 磁铁道具 - 吸引附近水果
    activateMagnet() {
        const magnetDuration = 5000; // 5秒
        const magnetStrength = 2;
        const magnetRadius = 200;
        
        const magnetEffect = {
            active: true,
            startTime: Date.now(),
            duration: magnetDuration,
            strength: magnetStrength,
            radius: magnetRadius
        };
        
        this.activePowerUps.set('magnet', magnetEffect);
        
        // 播放磁铁音效
        if (this.game.soundEnabled) {
            ASSETS.playSound('MAGNET', 0.4);
        }
        
        this.game.showMessage('磁铁激活！', '#FF00FF', 2000);
    }
    
    // 双倍道具 - 下一个水果变成两个
    activateDouble() {
        this.activePowerUps.set('double', {
            active: true,
            uses: 1
        });
        
        // 播放双倍音效
        if (this.game.soundEnabled) {
            ASSETS.playSound('DOUBLE', 0.4);
        }
        
        this.game.showMessage('双倍水果！', '#00FF00', 2000);
    }
    
    // 护盾道具 - 防止游戏结束
    activateShield() {
        const shieldDuration = 10000; // 10秒
        
        this.activePowerUps.set('shield', {
            active: true,
            startTime: Date.now(),
            duration: shieldDuration
        });
        
        // 播放护盾音效
        if (this.game.soundEnabled) {
            ASSETS.playSound('SHIELD', 0.4);
        }
        
        this.game.showMessage('护盾激活！', '#FFFF00', 2000);
    }
    
    // 更新道具系统
    update() {
        // 更新道具
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (!powerUp.collected) {
                powerUp.rotation += powerUp.angularVelocity;
                powerUp.life--;
                
                // 道具消失
                if (powerUp.life <= 0) {
                    this.powerUps.splice(i, 1);
                }
            }
        }
        
        // 更新磁铁效果
        if (this.activePowerUps.has('magnet')) {
            const magnet = this.activePowerUps.get('magnet');
            
            if (Date.now() - magnet.startTime > magnet.duration) {
                this.activePowerUps.delete('magnet');
            } else {
                // 应用磁铁效果
                const centerX = this.game.width / 2;
                const centerY = this.game.height / 2;
                
                for (const fruit of this.game.fruits) {
                    const dx = centerX - fruit.x;
                    const dy = centerY - fruit.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= magnet.radius && distance > 0) {
                        const force = magnet.strength / (distance * distance);
                        fruit.velocityX += (dx / distance) * force;
                        fruit.velocityY += (dy / distance) * force;
                    }
                }
            }
        }
        
        // 更新护盾效果
        if (this.activePowerUps.has('shield')) {
            const shield = this.activePowerUps.get('shield');
            
            if (Date.now() - shield.startTime > shield.duration) {
                this.activePowerUps.delete('shield');
                this.game.showMessage('护盾失效！', '#FF0000', 2000);
            }
        }
    }
    
    // 检查道具收集
    checkPowerUpCollection(x, y, size) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (powerUp.collected) continue;
            
            const distance = Math.sqrt(
                Math.pow(x - powerUp.x, 2) + 
                Math.pow(y - powerUp.y, 2)
            );
            
            if (distance < (size + powerUp.size) / 2) {
                // 收集道具
                powerUp.collected = true;
                this.usePowerUp(powerUp.type);
                
                // 创建收集效果
                if (this.game.particleSystem) {
                    this.game.particleSystem.createExplosion(powerUp.x, powerUp.y, '#FFD700', 20, 5, 60);
                }
                
                // 播放收集音效
                if (this.game.soundEnabled) {
                    ASSETS.playSound('POWERUP_COLLECT', 0.5);
                }
                
                this.powerUps.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    
    // 渲染道具
    render(ctx) {
        for (const powerUp of this.powerUps) {
            if (powerUp.collected) continue;
            
            ctx.save();
            ctx.translate(powerUp.x, powerUp.y);
            ctx.rotate(powerUp.rotation);
            
            // 绘制道具背景
            ctx.fillStyle = this.getPowerUpColor(powerUp.type);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, powerUp.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 绘制道具图标
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.getPowerUpIcon(powerUp.type), 0, 0);
            
            // 绘制生命条
            const lifePercent = powerUp.life / powerUp.maxLife;
            ctx.fillStyle = lifePercent > 0.5 ? '#00FF00' : lifePercent > 0.2 ? '#FFFF00' : '#FF0000';
            ctx.fillRect(-powerUp.size / 2, -powerUp.size / 2 - 5, powerUp.size * lifePercent, 3);
            
            ctx.restore();
        }
        
        // 渲染激活的道具效果
        this.renderActivePowerUps(ctx);
    }
    
    // 获取道具颜色
    getPowerUpColor(type) {
        const colors = {
            'bomb': '#FF0000',
            'freeze': '#00FFFF',
            'magnet': '#FF00FF',
            'double': '#00FF00',
            'shield': '#FFFF00'
        };
        return colors[type] || '#FFFFFF';
    }
    
    // 获取道具图标
    getPowerUpIcon(type) {
        const icons = {
            'bomb': '💣',
            'freeze': '❄️',
            'magnet': '🧲',
            'double': '✖️',
            'shield': '🛡️'
        };
        return icons[type] || '?';
    }
    
    // 渲染激活的道具效果
    renderActivePowerUps(ctx) {
        // 渲染护盾效果
        if (this.activePowerUps.has('shield')) {
            const shield = this.activePowerUps.get('shield');
            const remaining = (shield.duration - (Date.now() - shield.startTime)) / 1000;
            
            ctx.save();
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.game.width / 2, this.game.height / 2, Math.min(this.game.width, this.game.height) / 2 - 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            
            // 显示剩余时间
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`护盾: ${remaining.toFixed(1)}s`, this.game.width / 2, 30);
        }
        
        // 渲染磁铁效果
        if (this.activePowerUps.has('magnet')) {
            const magnet = this.activePowerUps.get('magnet');
            const remaining = (magnet.duration - (Date.now() - magnet.startTime)) / 1000;
            
            ctx.fillStyle = '#FF00FF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`磁铁: ${remaining.toFixed(1)}s`, this.game.width / 2, 50);
        }
    }
    
    // 检查是否有护盾保护
    hasShield() {
        return this.activePowerUps.has('shield');
    }
    
    // 检查是否可以使用双倍道具
    canUseDouble() {
        return this.activePowerUps.has('double');
    }
    
    // 使用双倍道具
    useDouble() {
        if (this.activePowerUps.has('double')) {
            const double = this.activePowerUps.get('double');
            double.uses--;
            
            if (double.uses <= 0) {
                this.activePowerUps.delete('double');
            }
            
            return true;
        }
        return false;
    }
}

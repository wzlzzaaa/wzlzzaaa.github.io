// 游戏资源管理
const ASSETS = {
    // 音效资源
    SOUNDS: {
        MERGE: 'sounds/merge.mp3',
        POP: 'sounds/pop.mp3',
        DROP: 'sounds/drop.mp3',
        GAME_OVER: 'sounds/game_over.mp3',
        BACKGROUND: 'sounds/background.mp3',
        // 连击音效
        COMBO_LOW: 'sounds/combo_low.mp3',
        COMBO_MEDIUM: 'sounds/combo_medium.mp3',
        COMBO_HIGH: 'sounds/combo_high.mp3',
        COMBO_SUPER: 'sounds/combo_super.mp3',
        // 道具音效
        POWERUP_SPAWN: 'sounds/powerup_spawn.mp3',
        POWERUP_COLLECT: 'sounds/powerup_collect.mp3',
        BOMB_EXPLODE: 'sounds/bomb_explode.mp3',
        FREEZE: 'sounds/freeze.mp3',
        MAGNET: 'sounds/magnet.mp3',
        DOUBLE: 'sounds/double.mp3',
        SHIELD: 'sounds/shield.mp3'
    },
    
    // 水果图像
    FRUITS: [
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
    ],
    
    // 资源加载状态
    loaded: false,
    loadedCount: 0,
    totalResources: 0,
    loadErrors: 0,
    
    // 预加载所有资源
    preload(callback) {
        // 更新加载进度UI
        const updateLoadingProgress = () => {
            const progress = document.getElementById('loadingProgress');
            if (progress) {
                const percent = Math.min(100, Math.floor((this.loadedCount / this.totalResources) * 100));
                progress.style.width = `${percent}%`;
            }
        };
        
        // 加载完成检查
        const checkAllLoaded = () => {
            updateLoadingProgress();
            if (this.loadedCount + this.loadErrors >= this.totalResources) {
                console.log(`资源加载完成。成功: ${this.loadedCount}, 失败: ${this.loadErrors}`);
                this.loaded = true;
                
                // 隐藏加载屏幕
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) loadingScreen.style.display = 'none';
                
                if (callback) callback();
            }
        };

        // 设置基础色块作为水果图像的默认值
        const colors = ['#FF6B6B', '#9775FA', '#FF922B', '#51CF66', '#FF8787', 
                         '#FFA8A8', '#FFEC99', '#FFF9DB', '#FFEC99', '#EF3F3F', '#20C997'];
        
        this.FRUITS.forEach((fruit, index) => {
            // 创建默认图像
            const canvas = document.createElement('canvas');
            const size = fruit.size;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 设置默认图像
            fruit.img = new Image();
            fruit.img.src = canvas.toDataURL();
        });
        
        // 计算总资源数
        const fruitImages = this.FRUITS.map(fruit => fruit.image);
        this.totalResources = fruitImages.length + Object.keys(this.SOUNDS).length;
        this.loadedCount = 0;
        this.loadErrors = 0;
        
        // 尝试初始化音频上下文（不阻塞游戏启动）
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sounds = {};
            
            // 加载音效（失败不阻塞游戏启动）
            Object.entries(this.SOUNDS).forEach(([key, src]) => {
                fetch(src)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.arrayBuffer();
                    })
                    .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.sounds[key] = audioBuffer;
                        this.loadedCount++;
                        checkAllLoaded();
                    })
                    .catch(error => {
                        console.warn(`无法加载音效 ${src}: ${error.message}`);
                        this.loadErrors++;
                        checkAllLoaded();
                    });
            });
        } catch (e) {
            console.warn('无法初始化音频系统:', e);
            // 将所有音效标记为加载失败
            this.loadErrors += Object.keys(this.SOUNDS).length;
        }
        
        // 加载水果图像
        this.FRUITS.forEach((fruit, index) => {
            const img = new Image();
            img.onload = () => {
                fruit.img = img;
                this.loadedCount++;
                checkAllLoaded();
            };
            img.onerror = () => {
                console.warn(`无法加载图像 ${fruit.image}, 使用默认图像`);
                // 已经有默认图像，只需计数
                this.loadErrors++;
                checkAllLoaded();
            };
            img.src = fruit.image;
        });
        
        // 如果没有资源需要加载，直接调用回调
        if (this.totalResources === 0) {
            this.loaded = true;
            if (callback) callback();
        }
    },
    
    // 播放音效
    playSound(soundName, volume = 1.0) {
        // 如果音频系统不可用或声音不存在，静默失败
        if (!this.audioContext || !this.sounds || !this.sounds[soundName]) return;
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds[soundName];
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start(0);
        } catch (e) {
            console.warn(`播放音效失败 ${soundName}:`, e);
        }
    }
}; 
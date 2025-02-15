class FruitGame {
    constructor() {
        this.fruitsConfig = [
            { name: '葡萄', size: 40, img: 'images/grape.png', score: 10 },
            { name: '樱桃', size: 45, img: 'images/cherry.png', score: 20 },
            { name: '草莓', size: 50, img: 'images/strawberry.png', score: 40 },
            { name: '橘子', size: 55, img: 'images/orange.png', score: 80 },
            { name: '柠檬', size: 60, img: 'images/lemon.png', score: 160 },
            { name: '猕猴桃', size: 65, img: 'images/kiwi.png', score: 320 },
            { name: '番茄', size: 70, img: 'images/tomato.png', score: 640 },
            { name: '桃子', size: 75, img: 'images/peach.png', score: 1280 },
            { name: '菠萝', size: 80, img: 'images/pineapple.png', score: 2560 },
            { name: '椰子', size: 85, img: 'images/coconut.png', score: 5120 },
            { name: '西瓜', size: 100, img: 'images/watermelon.png', score: 10240 }
        ];

        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score');
        this.nextFruitBox = document.getElementById('next-fruit-box');
        this.currentScore = 0;
        this.currentFruit = null;
        this.nextFruitType = 0;
        this.isDragging = false;
        this.touchStartTime = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateNextFruit();
        this.createNewFruit();
        this.setupResizeHandler();
    }

    setupEventListeners() {
        // 统一处理触摸和鼠标事件
        const eventMap = {
            start: ['mousedown', 'touchstart'],
            move: ['mousemove', 'touchmove'],
            end: ['mouseup', 'touchend']
        };

        eventMap.start.forEach(evt => 
            this.gameArea.addEventListener(evt, this.handleStart.bind(this)));
        eventMap.move.forEach(evt => 
            document.addEventListener(evt, this.handleMove.bind(this)));
        eventMap.end.forEach(evt => 
            document.addEventListener(evt, this.handleEnd.bind(this)));
    }

    handleStart(e) {
        if (e.touches && e.touches.length > 1) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const target = document.elementFromPoint(clientX, clientY);

        if (target?.classList.contains('fruit')) {
            this.isDragging = true;
            this.currentFruit = target;
            const rect = this.currentFruit.getBoundingClientRect();
            this.offsetX = clientX - rect.left;
            this.offsetY = clientY - rect.top;
            this.currentFruit.style.transition = 'none';
        }
    }

    handleMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this.updateFruitPosition(clientX, clientY);
    }

    handleEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        this.currentFruit.style.transition = '';
        this.checkCollisions();
        setTimeout(() => {
            this.currentFruit.remove();
            this.generateNextFruit();
            this.createNewFruit();
        }, 100);
    }

    updateFruitPosition(x, y) {
        const containerRect = this.gameArea.getBoundingClientRect();
        const fruitSize = this.currentFruit.offsetWidth;
        
        x = Math.max(containerRect.left, Math.min(x - this.offsetX, containerRect.right - fruitSize));
        y = Math.max(containerRect.top, Math.min(y - this.offsetY, containerRect.bottom - fruitSize));
        
        this.currentFruit.style.left = `${x - containerRect.left}px`;
        this.currentFruit.style.top = `${y - containerRect.top}px`;
    }

    checkCollisions() {
        const fruits = [...document.getElementsByClassName('fruit')];
        
        fruits.forEach(other => {
            if (other !== this.currentFruit && this.isColliding(this.currentFruit, other)) {
                this.mergeFruits(this.currentFruit, other);
            }
        });
    }

    isColliding(a, b) {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return !(aRect.right < bRect.left || 
               aRect.left > bRect.right || 
               aRect.bottom < bRect.top || 
               aRect.top > bRect.bottom);
    }

    mergeFruits(a, b) {
        const type = parseInt(a.dataset.type);
        if (type !== parseInt(b.dataset.type)) return;

        const newType = type + 1;
        if (newType >= this.fruitsConfig.length) return;

        const rect = a.getBoundingClientRect();
        const newFruit = this.createFruitElement(newType);
        
        newFruit.style.left = `${rect.left + rect.width/2 - newFruit.offsetWidth/2}px`;
        newFruit.style.top = `${rect.top + rect.height/2 - newFruit.offsetHeight/2}px`;
        
        a.remove();
        b.remove();
        this.currentScore += this.fruitsConfig[newType].score;
        this.scoreElement.textContent = this.currentScore;

        this.gameArea.appendChild(newFruit);
        setTimeout(() => this.checkCollisions(newFruit), 300);
    }

    createFruitElement(type, x = null, y = null) {
        const config = this.fruitsConfig[type];
        const fruit = document.createElement('img');
        fruit.src = config.img;
        fruit.className = 'fruit';
        fruit.style.width = `${config.size}px`;
        fruit.dataset.type = type;
        
        if (x !== null && y !== null) {
            fruit.style.left = x;
            fruit.style.top = y;
        }
        return fruit;
    }

    generateNextFruit() {
        this.nextFruitType = Math.floor(Math.random() * 3);
        this.nextFruitBox.innerHTML = '';
        const preview = this.createFruitElement(this.nextFruitType);
        preview.style.width = '80%';
        this.nextFruitBox.appendChild(preview);
    }

    createNewFruit() {
        const containerRect = this.gameArea.getBoundingClientRect();
        const x = containerRect.width/2 - this.fruitsConfig[this.nextFruitType].size/2;
        this.currentFruit = this.createFruitElement(this.nextFruitType, `${x}px`, '20px');
        this.gameArea.appendChild(this.currentFruit);
    }

    setupResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const fruits = [...document.getElementsByClassName('fruit')];
                fruits.forEach(fruit => {
                    const type = parseInt(fruit.dataset.type);
                    fruit.style.width = `${this.fruitsConfig[type].size}px`;
                });
            }, 200);
        });
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    new FruitGame();
    // 禁用双击缩放
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('touchstart', e => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
});
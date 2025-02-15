const fruits = [
    { name: "grape", size: 40, score: 10 },
    { name: "cherry", size: 45, score: 20 },
    { name: "strawberry", size: 50, score: 30 },
    { name: "orange", size: 55, score: 40 },
    { name: "lemon", size: 60, score: 50 },
    { name: "kiwi", size: 65, score: 60 },
    { name: "tomato", size: 70, score: 70 },
    { name: "peach", size: 75, score: 80 },
    { name: "pineapple", size: 80, score: 90 },
    { name: "coconut", size: 85, score: 100 },
    { name: "watermelon", size: 100, score: 200 }
];

const board = document.getElementById("game-board");
const scoreDisplay = document.getElementById("score");
let score = 0;

let fruitElements = [];

function createFruit(fruit) {
    const div = document.createElement("div");
    div.classList.add("fruit");
    div.style.width = `${fruit.size}px`;
    div.style.height = `${fruit.size}px`;
    div.style.backgroundImage = `url(images/${fruit.name}.png)`;
    div.style.backgroundSize = "cover";
    div.dataset.name = fruit.name;
    div.dataset.score = fruit.score;

    // 随机位置
    const x = Math.floor(Math.random() * (board.offsetWidth - fruit.size));
    const y = Math.floor(Math.random() * (board.offsetHeight - fruit.size));
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;

    // 添加事件监听
    div.addEventListener("click", () => {
        const name = div.dataset.name;
        console.log(`Clicked ${name}`);
        // 合成逻辑
        handleMerge(div);
    });

    return div;
}

function handleMerge(fruitElement) {
    const name = fruitElement.dataset.name;
    const score = parseInt(fruitElement.dataset.score);

    // 查找相同水果
    const sameFruit = fruitElements.find(fruit => fruit !== fruitElement && fruit.dataset.name === name);

    if (sameFruit) {
        // 合并水果
        const nextFruit = fruits.find(fruit => fruit.name === name);
        const index = fruits.indexOf(nextFruit);

        if (index < fruits.length - 1) {
            const newFruit = fruits[index + 1];
            const newFruitElement = createFruit(newFruit);

            // 设置新水果位置
            const x = (parseInt(fruitElement.style.left) + parseInt(sameFruit.style.left)) / 2;
            const y = (parseInt(fruitElement.style.top) + parseInt(sameFruit.style.top)) / 2;
            newFruitElement.style.left = `${x}px`;
            newFruitElement.style.top = `${y}px`;

            // 添加新水果
            board.appendChild(newFruitElement);
            fruitElements.push(newFruitElement);

            // 移除旧水果
            fruitElement.remove();
            sameFruit.remove();
            fruitElements = fruitElements.filter(fruit => fruit !== fruitElement && fruit !== sameFruit);

            // 更新分数
            score += newFruit.score;
            scoreDisplay.textContent = `分数: ${score}`;
        }
    }
}

// 初始化游戏
function initGame() {
    for (let i = 0; i < 10; i++) {
        const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
        const fruitElement = createFruit(randomFruit);
        board.appendChild(fruitElement);
        fruitElements.push(fruitElement);
    }
}

initGame();

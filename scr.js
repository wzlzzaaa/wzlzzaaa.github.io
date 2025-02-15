const poems = [
    {
        lines: [
            "海上生明月",
            "天涯共此时"
        ]
    },
    {
        lines: [
            "床前明月光",
            "疑是地上霜"
        ]
    },
    {
        lines: [
            "红豆生南国",
            "春来发几枝"
        ]
    }
];

function changePoem() {
    const randomIndex = Math.floor(Math.random() * poems.length);
    const poem = poems[randomIndex];
    
    document.getElementById('poemLine1').textContent = poem.lines[0];
    document.getElementById('poemLine2').textContent = poem.lines[1];
}

// 页面加载时自动显示第一首诗
window.onload = changePoem;

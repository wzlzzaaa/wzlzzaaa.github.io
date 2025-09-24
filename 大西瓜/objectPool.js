// 对象池实现 - 优化内存管理
class ObjectPool {
    constructor(objectFactory, initialSize = 20) {
        this.objectFactory = objectFactory; // 创建新对象的工厂函数
        this.pool = [];
        
        // 预创建对象
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.objectFactory());
        }
    }
    
    // 从池中获取对象
    get() {
        // 如果池为空，则创建新对象
        if (this.pool.length === 0) {
            return this.objectFactory();
        }
        
        // 从池中取出最后一个对象
        return this.pool.pop();
    }
    
    // 将对象归还到池中
    release(object) {
        // 重置对象状态（如果需要）
        if (object.reset && typeof object.reset === 'function') {
            object.reset();
        }
        
        // 将对象归还到池中
        this.pool.push(object);
    }
    
    // 清空对象池
    clear() {
        this.pool.length = 0;
    }
    
    // 获取池中可用对象数量
    get size() {
        return this.pool.length;
    }
}

// 空间分区系统 - 优化碰撞检测
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize;
        this.width = width;
        this.height = height;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows);
        
        // 初始化网格
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = [];
        }
    }
    
    // 计算对象所在的单元格
    getCellIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        // 确保索引在有效范围内
        const boundedCol = Math.max(0, Math.min(col, this.cols - 1));
        const boundedRow = Math.max(0, Math.min(row, this.rows - 1));
        
        return boundedRow * this.cols + boundedCol;
    }
    
    // 添加对象到网格
    insert(object) {
        const cellIndex = this.getCellIndex(object.x, object.y);
        this.grid[cellIndex].push(object);
        
        // 存储对象所在的单元格索引，以便于移除
        object.cellIndex = cellIndex;
    }
    
    // 从网格中移除对象
    remove(object) {
        if (object.cellIndex !== undefined) {
            const cell = this.grid[object.cellIndex];
            const index = cell.indexOf(object);
            
            if (index !== -1) {
                cell.splice(index, 1);
            }
            
            // 清除对象的单元格索引
            delete object.cellIndex;
        }
    }
    
    // 更新对象在网格中的位置
    update(object) {
        const newCellIndex = this.getCellIndex(object.x, object.y);
        
        // 如果对象移动到新的单元格，则更新
        if (object.cellIndex !== newCellIndex) {
            this.remove(object);
            this.insert(object);
        }
    }
    
    // 获取可能与给定对象发生碰撞的对象
    getPossibleCollisions(object) {
        const radius = object.size / 2;
        const minCol = Math.floor((object.x - radius) / this.cellSize);
        const maxCol = Math.floor((object.x + radius) / this.cellSize);
        const minRow = Math.floor((object.y - radius) / this.cellSize);
        const maxRow = Math.floor((object.y + radius) / this.cellSize);
        
        const possibleCollisions = [];
        
        // 遍历对象覆盖的所有单元格
        for (let row = Math.max(0, minRow); row <= Math.min(this.rows - 1, maxRow); row++) {
            for (let col = Math.max(0, minCol); col <= Math.min(this.cols - 1, maxCol); col++) {
                const cellIndex = row * this.cols + col;
                const cell = this.grid[cellIndex];
                
                // 将单元格中的所有对象添加到可能碰撞的列表中
                for (let i = 0; i < cell.length; i++) {
                    if (cell[i] !== object) {  // 排除自身
                        possibleCollisions.push(cell[i]);
                    }
                }
            }
        }
        
        return possibleCollisions;
    }
    
    // 清空网格
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }
    }
    
    // 重设网格大小
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.cols = Math.ceil(width / this.cellSize);
        this.rows = Math.ceil(height / this.cellSize);
        
        // 创建新的网格
        const newGrid = new Array(this.cols * this.rows);
        for (let i = 0; i < newGrid.length; i++) {
            newGrid[i] = [];
        }
        
        // 将所有对象移动到新网格
        for (let i = 0; i < this.grid.length && i < newGrid.length; i++) {
            const cell = this.grid[i];
            for (let j = 0; j < cell.length; j++) {
                const object = cell[j];
                const newCellIndex = this.getCellIndex(object.x, object.y);
                
                if (newCellIndex >= 0 && newCellIndex < newGrid.length) {
                    newGrid[newCellIndex].push(object);
                    object.cellIndex = newCellIndex;
                }
            }
        }
        
        this.grid = newGrid;
    }
} 
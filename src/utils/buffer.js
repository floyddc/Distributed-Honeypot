class DataBuffer {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.buffer = [];
    }

    add(data) {
        this.buffer.push({
            data,
            timestamp: Date.now()
        });
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }

    getAll() {
        return this.buffer.map(item => item.data);
    }

    flush() {
        const data = this.getAll();
        this.buffer = [];
        return data;
    }

    size() {
        return this.buffer.length;
    }

    isEmpty() {
        return this.buffer.length === 0;
    }
    
    clear() {
        this.buffer = [];
    }
}

export default DataBuffer;
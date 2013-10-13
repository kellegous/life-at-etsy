var Model = (function () {
    function Model(cols, rows) {
        this.rows = rows;
        this.cols = cols;
        this.grid = new Int8Array(cols * rows);
    }
    Model.prototype.indexOf = function (x, y) {
        var cols = this.cols, rows = this.rows;
        return ((rows + y) % rows) * cols + ((cols + x) % cols);
    };

    Model.prototype.get = function (x, y) {
        return this.grid[this.indexOf(x, y)];
    };

    Model.prototype.set = function (x, y, alive) {
        this.grid[this.indexOf(x, y)] = alive ? 1 : 0;
    };

    Model.prototype.nextFor = function (x, y) {
        var grid = this.grid, count = this.get(x - 1, y - 1) + this.get(x, y - 1) + this.get(x + 1, y - 1) + this.get(x - 1, y) + this.get(x + 1, y) + this.get(x - 1, y + 1) + this.get(x, y + 1) + this.get(x + 1, y + 1);
        if (count == 3) {
            return 1;
        }
        if (count == 2) {
            return this.get(x, y);
        }
        return 0;
    };

    Model.prototype.next = function () {
        var cols = this.cols, rows = this.rows, next = new Int8Array(this.grid);
        for (var j = 0; j < rows; j++) {
            for (var i = 0; i < cols; i++) {
                next[j * cols + i] = this.nextFor(i, j);
            }
        }
        this.grid = next;
    };
    return Model;
})();
exports.Model = Model;


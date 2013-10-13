function Model(cols, rows) {
  this.cols = cols;
  this.rows = rows;
  this.grid = new Int8Array(cols * rows);
}

Model.prototype._indexOf = function(x, y) {
  var cols = this.cols,
      rows = this.rows;
  return ((rows + y) % rows) * cols + ((cols + x) % cols);
};

Model.prototype.get = function(x, y) {
  return this.grid[this._indexOf(x, y)];
};

Model.prototype.set = function(x, y, alive) {
  this.grid[this.indexOf(x, y)] = alive | 0;
};

Model.prototype._nextFor = function(x, y) {
  var c = this.get(x - 1, y - 1) + this.get(x, y - 1) + this.get(x + 1, y - 1)
        + this.get(x - 1, y)                          + this.get(x + 1, y)
        + this.get(x - 1, y + 1) + this.get(x, y + 1) + this.get(x + 1, y + 1);
  if (c == 3) {
    return 1;
  }

  if (c == 2) {
    return this.get(x, y);
  }

  return 0;
};

Model.prototype.next = function() {
  var next = new Int8Array(this.grid);
  for (var j = 0, m = this.rows; j < m; j++) {
    for (var i = 0, n = this.cols; i < n; i++) {
      next[j * cols + i] = this._nextFor(i, j);
    }
  }
};

exports.Model = Model;
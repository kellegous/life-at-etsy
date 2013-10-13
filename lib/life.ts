export class Model {
  grid : Int8Array;
  rows : number;
  cols : number;

  constructor(cols : number, rows : number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = new Int8Array(cols * rows);
  }

  private indexOf(x : number, y : number) : number {
    var cols = this.cols,
        rows = this.rows;
    return ((rows + y) % rows) * cols + ((cols + x) % cols);
  }

  private get(x : number, y : number) : number {
    return this.grid[this.indexOf(x, y)];
  }

  private set(x : number, y : number, alive : boolean) {
    this.grid[this.indexOf(x, y)] = alive ? 1 : 0;
  }

  private nextFor(x : number, y : number) : number {
    var grid = this.grid,
        count = this.get(x - 1, y - 1) + this.get(x, y - 1) + this.get(x + 1, y - 1)
              + this.get(x - 1, y)                          + this.get(x + 1, y)
              + this.get(x - 1, y + 1) + this.get(x, y + 1) + this.get(x + 1, y + 1);
    if (count == 3) {
      return 1;
    }
    if (count == 2) {
      return this.get(x, y);
    }
    return 0;
  }

  next() {
    var cols = this.cols,
        rows = this.rows,
        next = new Int8Array(this.grid);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        next[j * cols + i] = this.nextFor(i, j);
      }
    }
    this.grid = next;
  }
}
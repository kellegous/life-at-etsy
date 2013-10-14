export class Model {
  private grid : Int8Array;
  rows : number;
  cols : number;

  constructor(cols : number, rows : number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = new Int8Array(cols * rows);
  }

  indexFor(x : number, y : number) : number {
    var cols = this.cols,
        rows = this.rows;
    return ((rows + y) % rows) * cols + ((cols + x) % cols);
  }

  get(index : number) : boolean {
    return this.grid[index] > 0;
  }

  set(index : number, alive : boolean) {
    this.grid[index] = alive ? 1 : 0;
  }

  size() : number {
    return this.grid.length;
  }

  private nextFor(x : number, y : number) : number {
    var grid = this.grid;
    var count = grid[this.indexFor(x - 1, y - 1)]
              + grid[this.indexFor(x,     y - 1)]
              + grid[this.indexFor(x + 1, y - 1)]
              + grid[this.indexFor(x - 1, y    )]
              + grid[this.indexFor(x + 1, y    )]
              + grid[this.indexFor(x - 1, y + 1)]
              + grid[this.indexFor(x    , y + 1)]
              + grid[this.indexFor(x + 1, y + 1)];
    if (count == 3) {
      return 1;
    }
    if (count == 2) {
      return grid[this.indexFor(x, y)];
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
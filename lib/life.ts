export interface Changes {
  born : number[];
  died : number[];
}

export class Model {
  private grid : Int8Array;

  private alive : number[];

  rows : number;
  cols : number;

  constructor(cols : number, rows : number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = new Int8Array(cols * rows);
    this.alive = [];
  }

  indexFor(x : number, y : number) : number {
    var cols = this.cols,
        rows = this.rows;
    return ((rows + y) % rows) * cols + ((cols + x) % cols);
  }

  get(index : number) : boolean {
    return this.grid[index] > 0;
  }

  init(vals : any[]) {
    var grid = this.grid,
        alive = this.alive;
    vals.forEach(function(v, i) {
      var val = v & 1;
      grid[i] = val;
      if (val > 0) {
        alive.push(i);
      }
    });
  }

  size() : number {
    return this.grid.length;
  }

  private neighborsOf(index : number) : number[] {
    var x = index % this.cols,
        y = (index / this.cols) | 0;
    return [this.indexFor(x - 1, y - 1),
            this.indexFor(x    , y - 1),
            this.indexFor(x + 1, y - 1),
            this.indexFor(x - 1, y    ),
            this.indexFor(x + 1, y    ),
            this.indexFor(x - 1, y + 1),
            this.indexFor(x    , y + 1),
            this.indexFor(x + 1, y + 1)];
  }

  private nextFor(index : number) : number {
    var grid = this.grid,
        neighbors = this.neighborsOf(index),
        count = grid[neighbors[0]]
              + grid[neighbors[1]]
              + grid[neighbors[2]]
              + grid[neighbors[3]]
              + grid[neighbors[4]]
              + grid[neighbors[5]]
              + grid[neighbors[6]]
              + grid[neighbors[7]];
    if (count == 3) {
      return 1;
    }
    if (count == 2) {
      return grid[index];
    }
    return 0;        
  }

  private activeCells() : number[] {
    var included = [],
        active = [],
        alive = this.alive;

    for (var i = 0, n = alive.length; i < n; i++) {
      var index = alive[i];
      if (!included[index]) {
        active.push(index);
        included[index] = true;
      }

      var neighbors = this.neighborsOf(index);
      for (var j = 0; j < 8; j++) {
        index = neighbors[j];
        if (!included[index]) {
          active.push(index);
          included[index] = true;
        }
      }
    }

    return active;
  }

  next() : Changes {
    var grid = this.grid,
        // all cells that need to be recomputed
        active = this.activeCells(),
        // cells that are active in the next gen
        alive = [],
        // cells that were born in the next gen
        born = [],
        // cells that died in the next gen
        died = [];

    // compute the next value for all cells in active regions
    for (var i = 0, n = active.length; i < n; i++) {
      var index = active[i],
          next = this.nextFor(index),
          current = grid[index];
      
      if (next > 0) {
        alive.push(index);
      }

      if (current != next) {
        if (next > 0) {
          born.push(index);
        } else {
          died.push(index);
        }
      }
    }

    // commit all changes
    for (var i = 0, n = born.length; i < n; i++) {
      grid[born[i]] = 1;
    }
    for (var i = 0, n = died.length; i < n; i++) {
      grid[died[i]] = 0;
    }
    this.alive = alive;

    return {
      born: born,
      died: died
    };
  }
}
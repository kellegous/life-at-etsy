// A Game of Life model object that encapsulates all the main logic for simulating 
// new generations.

/// <reference path="life.common.ts" />
/// <reference path="signal.ts" />
module life {

/**
 * A model of a Game of Life board. The Model uses a 1-dimensional indexing system instead of
 * (col, row) pairs. This is to make it easier for consuming clients to keep their representations
 * in simple arrays. The indexFor method is provided to convert from (col, row) to index if 2-D
 * coordinates are needed.
 */
export class Model {
  // The state of the board. Each value will be 1 or 0.
  // NOTE: This trades off some space to keep accesses simple and fast. In a memory constrained
  // environment, each element in this array could easily store 8 values and the values can be
  // masked out.
  private grid : Int8Array;

  // The index for all cells that are currently alive.
  private alive : number[];

  // The size of the board in both columns and rows.
  rows : number;
  cols : number;

  // An event notification object for model changes.
  didChange = new Signal;

  /**
   * Constructs a new board of size, cols * row. Each cell is initialized
   * to "dead".
   */
  constructor(cols : number, rows : number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = new Int8Array(cols * rows);
    this.alive = [];
  }

  /**
   * Converts 2D coordinates for the board into a 1D index. Note that the board is toroidal so
   * indicies outside of the primary coordinates will be normalized between [0-cols] and [0-rows].
   * @param x the column to access
   * @param y the row to access
   * @return the index for the cell at those coordinates
   */
  indexFor(x : number, y : number) : number {
    var cols = this.cols,
        rows = this.rows;
    return ((rows + y) % rows) * cols + ((cols + x) % cols);
  }

  /**
   * Get the state of the cell at the specified index.
   */
  get(index : number) : boolean {
    return this.grid[index] > 0;
  }

  /**
   * Initialize the model with the specified state.
   * @param vals An array of values that will be coerced to integers to determine
   *             "live" (>0) and "dead" (<=0)
   * @return the Changes that result from the initialization
   */
  init(vals : any[]) : Changes {
    var grid = this.grid,
        alive = this.alive;
    vals.forEach(function(v, i) {
      var val = v & 1;
      grid[i] = val;
      if (val > 0) {
        alive.push(i);
      }
    });

    var changes = {born : alive, died: [], survived: []};
    this.didChange.raise(this, changes);
    return changes;
  }

  /**
   * The total number of cells in the model.
   */
  size() : number {
    return this.grid.length;
  }

  /**
   * Get the indicies for the neighbor cells of the cell at the specified index.
   * @parma index the index of the cell we are requesting
   * @return an 8 element array with the indices of each neighbor
   */
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

  /**
   * The state of the next generation for the cell at the given index.
   * @param index the index of the cell
   * @return either 1 (for "live") or 0 (for "dead")
   */
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

  /**
   * Get the indices of all cells that are considered "active". This consists of all "live" cells
   * and their neighbors. Indices will not be presented in any particular order, but the resulting
   * array will not contain duplicates.
   * @return an array of indicies for all "active" cells
   */
  private activeCells() : number[] {
    var included = [],
        active = [],
        alive = this.alive;

    for (var i = 0, n = alive.length; i < n; i++) {
      var index = alive[i];
      // If this index is not already in the result, add it.
      if (!included[index]) {
        active.push(index);
        included[index] = true;
      }

      // Not add all of its neighbors (as long as they are not already in the result)
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

  /**
   * Request that the model advance to the next generation. In addition to returning
   * the Changes directly, subscribers to didChange will be notified of the same
   * Changes.
   * @return the Changes that occurred to arrive in the next generation
   *
   * Implementation note: This uses an update strategy where only live cells and their
   * neighbors are updated. Dead cells with no living neighbors obviously won't be
   * springing back to life until the "Zombie Game of UnLife" variant emerges.
   */
  next() : Changes {
    var grid = this.grid,
        // all cells that need to be recomputed
        active = this.activeCells(),
        // cells that are active in the next gen
        alive = [],
        // cells that were born in the next gen
        born = [],
        // cells that died in the next gen
        died = [],
        survived = [];

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
      } else if (next > 0) {
        survived.push(index);
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

    var changes = {born: born, died: died, survived: survived};
    this.didChange.raise(this, changes);
    return changes;
  }
}

}
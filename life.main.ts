/// <reference path="jquery.d.ts" />
/// <reference path="raf.ts" />
module life {

var $e = function(type) {
  return $(document.createElement(type));
};

var px = function(v : number) {
  return v + 'px';
};

class Model {
  grid : Int8Array;

  rows : number;
  cols : number;

  constructor(cols : number, rows : number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = new Int8Array(cols * rows);
  }

  indexOf(x : number, y : number) : number {
    var cols = this.cols,
        rows = this.rows;
    return ((rows + y) % rows) * cols + ((cols + x) % cols);
  }

  at(x : number, y : number) : number {
    return this.grid[this.indexOf(x, y)];
  }

  set(x : number, y : number, alive : boolean) {
    var cols = this.cols,
        rows = this.rows;
    this.grid[((rows + y) % rows) * cols + ((cols + x)%cols)] = alive ? 1 : 0;
  }

  nextFor(x : number, y : number) : number {
    var c = this.at(x - 1, y - 1) + this.at(x, y - 1) + this.at(x + 1, y - 1)
          + this.at(x - 1, y)                         + this.at(x + 1, y)
          + this.at(x - 1, y + 1) + this.at(x, y + 1) + this.at(x + 1, y + 1);

    console.log(x, y, [
        this.at(x - 1, y - 1), this.at(x, y - 1), this.at(x + 1, y - 1),
        this.at(x - 1, y),                        this.at(x + 1, y),
        this.at(x - 1, y + 1), this.at(x, y + 1), this.at(x + 1, y + 1)
    ]);

    // console.log(x, y, c);
    if (c == 3) {
      return 1;
    }
    if (c == 2) {
      return this.at(x, y);
    }
    return 0;
  }

  next() {
    var cols = this.cols,
        rows = this.rows,
        next = new Int8Array(this.grid);

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        console.log(i, j, this.nextFor(i, j), this.at(i, j));
        next[j * cols + i] = this.nextFor(i, j);
      }
    }
    this.grid = next;
  }
}

class View {
  static SIZE = 10;
  static PADD = 1;

  model : Model;
  nodes = $();

  constructor(root : JQuery, model : Model) {
    var rows = model.rows,
        cols = model.cols,
        nodes = this.nodes;
    this.model = model;

    root.css('width', rows * View.SIZE)
      .css('height', cols * View.SIZE);

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        nodes.push($e('div')
          .addClass('cell')
          .css('left', i * View.SIZE)
          .css('top', j * View.SIZE)
          .css('width', View.SIZE - 2 * View.PADD)
          .css('height', View.SIZE - 2 * View.PADD)
          .appendTo(root).get(0));
      }
    }
  }

  render() {
    var nodes = this.nodes,
        grid = this.model.grid;
    for (var i = 0, n = nodes.length; i < n; i++) {
      if (grid[i]) {
        $(nodes[i]).removeClass('dead');
      } else {
        $(nodes[i]).addClass('dead');
      }
    }
  }
}

var model = new Model(5, 5),
    view = new View($('#view'), model);

model.set(1, 2, true);
model.set(2, 2, true);
model.set(3, 2, true);

view.render();

$(document).on('keydown', (e : KeyboardEvent) => {
  if (e.keyCode != 39) {
    return;
  }
  model.next();
  view.render();
});

}
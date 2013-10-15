/// <reference path="jquery.d.ts" />
/// <reference path="raf.ts" />
/// <reference path="lib/life.ts" />
module life {

var $e = (type : string) => {
  return $(document.createElement(type));
};

var rand = (cols : number, rows : number) => {
  var size = cols * rows,
      data = Array(size),
      seed = (size * 0.2) | 0;
  for (var i = 0; i < size; i++) {
    data[i] = 0;
  }

  for (var i = 0; i < seed; i++) {
    var index = (Math.random() * size) | 0;
    data[index] = 1;
  }

  return data;
};

class View {
  static SIZE = 10;
  static PADD = 1;

  private elems : HTMLElement[] = [];
  constructor(root : JQuery, model : Model) {
    var cols = model.cols,
        rows = model.rows;

    root.css('width', rows * View.SIZE)
      .css('height', cols * View.SIZE);

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var e = $e('div')
          .addClass('cell')
          .css('left', i * View.SIZE)
          .css('top', j * View.SIZE)
          .css('width', View.SIZE - 2 * View.PADD)
          .css('height', View.SIZE - 2 * View.PADD)
          .appendTo(root);
        if (!model.get(model.indexFor(i, j))) {
          e.addClass('dead')
        }
        this.elems.push(e.get());
      }
    }
  }
}

var model = new Model(20, 20).init(rand(20, 20)),
    view = new View($('#view'), model);

$(document).on('keydown', (e : KeyboardEvent) => {
  if (e.keyCode != 39) {
    return;
  }
  model.next();
  // view.render();
});

}

// module life {

// var $e = function(type) {
//   return $(document.createElement(type));
// };

// var px = function(v : number) {
//   return v + 'px';
// };

// class View {
//   static SIZE = 10;
//   static PADD = 1;

//   model : Model;
//   nodes = $();

//   constructor(root : JQuery, model : Model) {
//     var rows = model.rows,
//         cols = model.cols,
//         nodes = this.nodes;
//     this.model = model;

//     root.css('width', rows * View.SIZE)
//       .css('height', cols * View.SIZE);

//     for (var j = 0; j < rows; j++) {
//       for (var i = 0; i < cols; i++) {
//         nodes.push($e('div')
//           .addClass('cell')
//           .css('left', i * View.SIZE)
//           .css('top', j * View.SIZE)
//           .css('width', View.SIZE - 2 * View.PADD)
//           .css('height', View.SIZE - 2 * View.PADD)
//           .appendTo(root).get(0));
//       }
//     }
//   }

//   render() {
//     var nodes = this.nodes,
//         grid = this.model.grid;
//     for (var i = 0, n = nodes.length; i < n; i++) {
//       if (grid[i]) {
//         $(nodes[i]).removeClass('dead');
//       } else {
//         $(nodes[i]).addClass('dead');
//       }
//     }
//   }
// }

// var model = new Model(100, 100),
//     view = new View($('#view'), model);

// view.render();

// $(document).on('keydown', (e : KeyboardEvent) => {
//   if (e.keyCode != 39) {
//     return;
//   }
//   model.next();
//   view.render();
// });

// }
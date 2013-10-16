/// <reference path="jquery.d.ts" />
/// <reference path="raf.ts" />
/// <reference path="lib/life.ts" />
module life {

var $e = (type : string) => {
  return $(document.createElement(type));
};

var randomize = (model : Model) => {
  var size = model.size(),
      data = Array(size),
      seed = (size * 0.2) | 0;
  for (var i = 0; i < size; i++) {
    data[i] = 0;
  }
  for (var i = 0; i < seed; i++) {
    var index = (Math.random() * size) | 0;
    data[index] = 1;
  }
  return model.init(data);
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

    model.didChange.tap((model, changes) => {
      this.update(changes);
    });
  }

  private update(changes : Changes) {
    var born = changes.born,
        died = changes.died,
        elems = this.elems;
    born.forEach((index) => {
      $(elems[index]).removeClass('dead');
    });
    died.forEach((index) => {
      $(elems[index]).addClass('dead');
    });
  }
}

var model = new Model(75, 75),
    view = new View($('#view'), model);

randomize(model);
$(document).on('keydown', (e : KeyboardEvent) => {
  if (e.keyCode != 39) {
    return;
  }
  model.next();
});

}
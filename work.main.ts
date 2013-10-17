/// <reference path="lib/life.model.ts" />
/// <reference path="lib/life.msg.ts" />
module life {

var model : Model;

var randomize = (size : number, fill : number) => {
  var data = Array(size),
      count = (size * fill) | 0;
  for (var i = 0; i < size; i++) {
    data[i] = 0;
  }
  for (var i = 0; i < count; i++) {
    data[(Math.random() * size) | 0] = 1;
  }
  return data;
};

var initLife = (msg : InitLifeMsg) => {
  model = new Model(msg.cols, msg.rows);

  var values = msg.values;
  if (msg.random) {
    values = randomize(model.size(), msg.random);
  }

  if (!values) {
    return;
  }

  var changes = model.init(values);
  send({ type: HereSome, changes: [model.init(values)], fromInit: true});
};

var needSome = (msg : NeedSomeMsg) => {
  var changes = [];
  for (var i = 0; i < msg.n; i++) {
    changes.push(model.next());
  }
  send({ type: HereSome, changes: changes, fromInit: false});
};

var send = (msg : any) => {
  var port : any = self;
  port.postMessage(msg);
};

self.onmessage = (e : MessageEvent) => {
  var msg = <Msg>e.data;
  switch (msg.type) {
  case InitLife:
    initLife(<InitLifeMsg>msg);
    break;
  case NeedSome:
    needSome(<NeedSomeMsg>msg);
    break;
  }
};

}
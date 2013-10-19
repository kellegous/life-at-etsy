// The entry-point for the worker portion of a ModelInWorker object.

/// <reference path="lib/life.model.ts" />
/// <reference path="lib/life.msg.ts" />
module life {

var model : Model;

/**
 * Produces a random configuration for the game board.
 */
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


/**
 * Handle an InitLife request that instantiates a Model and initializes
 * the board state.
 * @param msg the InitLife message sent from the client
 */
var initLife = (msg : InitLifeMsg) => {
  // Create the new model
  model = new Model(msg.cols, msg.rows);

  // Determine the values to initialize the board state
  var values = msg.values;
  if (msg.random) {
    values = randomize(model.size(), msg.random);
  }

  if (!values) {
    return;
  }

  // Compute the first change set and notify the client
  var changes = model.init(values);
  send({ type: HereSome, changes: [model.init(values)], fromInit: true});
};

/**
 * Handle a NeedSome request that generates the next n generations of the model
 * and sends those Changes to the client as a single batch.
 * @param msg the NeedSome message sent from the client
 */
var needSome = (msg : NeedSomeMsg) => {
  var changes = [];
  for (var i = 0; i < msg.n; i++) {
    changes.push(model.next());
  }
  send({ type: HereSome, changes: changes, fromInit: false});
};

/**
 * A utility function for sending through postMessage.
 * @param msg the clonable object to be send to the client
 */
var send = (msg : any) => {
  // NOTE: TypeScript's declarations for Window.postMessage do not match the
  // the actual API. To prevent the compiler from checking the signature, "self"
  // is cast to "any".
  var port : any = self;
  port.postMessage(msg);
};

// The primary message dispatcher.
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
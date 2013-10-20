// Message objects for communicating between a client and ModelInWorker.

/// <reference path="life.common.ts" />
module life {

/**
 * Types for each message
 */
export var InitLife = 0,
    NeedSome = 1,
    HereSome = 2;

/**
 * A message to be sent over a message port either to or from a Worker.
 */
export interface Msg {
  type : number;
}

/**
 * A request to initialize a remote model.
 */
export interface InitLifeMsg extends Msg {
  cols : number;
  rows : number;

  // Initialize the model to these values
  values : any[];
}

/**
 * A request for new generations to be simulated and returned to the caller.
 */
export interface NeedSomeMsg extends Msg {
  n : number;
}

/**
 * A response containing the Changes associated with some new generations.
 */
export interface HereSomeMsg extends Msg {
  changes : Changes[];
}

}
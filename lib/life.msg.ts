/// <reference path="life.common.ts" />
module life {

export var InitLife = 0,
    NeedSome = 1,
    HereSome = 2;

export interface Msg {
  type : number;
}

export interface InitLifeMsg extends Msg {
  cols : number;
  rows : number;
  values? : any[];
  random? : number;
}

export interface NeedSomeMsg extends Msg {
  n : number;
}

export interface HereSomeMsg extends Msg {
  fromInit : boolean;
  changes : Changes[];
}

}
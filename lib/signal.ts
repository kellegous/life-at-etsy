class Signal {
  listeners : { (...args : any[]) : void; } [] = [];

  tap(l : (...arg : any[]) => void) : void {
    this.listeners = this.listeners.slice(0);
    this.listeners.push(l);
  }

  untap(l : (...arg : any[]) => void) : void {
    var ix = this.listeners.indexOf(l);
    if (ix == -1) {
      return;
    }

    this.listeners = this.listeners.slice(0);
    this.listeners.splice(ix, 1);
  }

  raise(...args : any[]) : void {
    this.listeners.forEach((l) => {
      l.apply(this, args);
    });
  }
}
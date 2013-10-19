// A polyfill for requestAnimationFrame that ensures it is accessible without a prefix.
// This is a TypeScript version of Paul Irish's polyfill:
// http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
module raf {
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  
  // Copy any prefixed version of the API to the right place.
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
        || window[vendors[x]+'CancelRequestAnimationFrame'];
  }
  
  // If the API is still missing, add a setTimout based filler.
  if (!window.requestAnimationFrame) {
    window['requestAnimationFrame'] = function(callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(
        function() { callback(currTime + timeToCall); },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
}

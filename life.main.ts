// The primary entry point for the life app.

/// <reference path="lib/life.msg.ts" />
/// <reference path="lib/signal.ts" />
/// <reference path="lib/three.d.ts" />
/// <reference path="lib/raf.ts" />
module life {

/**
 * An "ease-in-out" easing function.
 * @param p progress [0.0-1.0]
 * @return transformed value of progress [0.0-1.0]
 */
var sigmoidEasing = (p : number) => {
  return 0.5 - Math.cos(p * Math.PI) * 0.5;
};

/**
 * A driver for transition style animations. This triggers callbacks at frame-rate granularity with
 * an adjusted progress parameter.
 * @param callback the callback function for each update.
 * @param duration the full duration of the transition in milliseconds.
 * @param easing an easing function to transform progress before invoking the callback.
 */
var transition = (callback: (p : number) => void, duration : number, easing? : (p:number) => number) => {
  if (!easing) {
    // If no easing was provided, use linear easing
    easing = (p : number) => { return p; }
  }

  var t0 = Date.now();
  var tick = () => {
    var t1 = Date.now(),
        p = Math.min(1.0, (t1 - t0) / duration);
    callback(easing(p));
    if (p < 1.0) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

/**
 * A remote proxy to a life.Model object running in an isolated web worker.
 */
class ModelInWorker {
  // an event dispatcher for model changes
  didChange = new Signal;

  // the background worker maintaining the Model
  private worker : Worker;

  // changes that have been received from the work, but not used.
  private changes : Changes[] = [];

  // in the case where the client exhausts the number of buffered changes, this 
  // counter indicates how many change notifications to dispatch when new data
  // arrives.
  private pendingRequests = 0;

  /**
   * Create a new worker, initialize the model randomly and request a set of changes.
   * @param cols the number of columns in the game.
   * @param rows the number of rows in the game.
   * @param fill the ratio of live/total to use when randomly populating the board.
   */
  constructor(public cols : number, public rows : number, fill : number) {
    var worker = new Worker('work.js');
    worker.onmessage = (e : MessageEvent) => {
      var msg = <HereSomeMsg>e.data,
          changes = msg.changes,
          didChange = this.didChange;
      for (var i = 0, n = changes.length; i < n; i++) {
        if (this.pendingRequests > 0) {
          // first satisfy any pending requests. Note that multiple
          // pending requests will be fulfilled synchronously, so clients
          // are strongly discouraged from invoking next withoug having
          // received prior generations via didLoad.
          didChange.raise(changes[i]);
          this.pendingRequests--;
          continue;
        }
        this.changes.push(changes[i]);
      }
    };

    // request the the model be initialized
    worker.postMessage({
      type: InitLife,
      cols: cols,
      rows: rows,
      random: fill,
    });

    // go ahead and request the first batch of generations
    worker.postMessage({
      type: NeedSome,
      n : 20,
    });

    this.worker = worker;
  }

  /**
   * Request changes associated with the next generation. The next generation will
   * be dispatched via didLoad immediately if it is available. If it is not, it will
   * dispatch as soon as a new batch of changes arrives from the worker. Note, however,
   * that enqueing multiple pending requests is supported but not encouraged as multiple
   * pending requests will be fulfilled synchronously when the new batch arrives.
   */
  next() {
    var changes = this.changes,
        worker = this.worker;
    if (changes.length == 0) {
      this.pendingRequests++;
      return;
    }

    // dispatch the next set of changes
    this.didChange.raise(changes.shift());
    // if we are running low on changes, request more
    if (changes.length <= 2) {
      worker.postMessage({
        type: NeedSome,
        n: 20,
      });
    }
  }
}

/**
 * A WebGL based that represents the cells of the game as cubes.
 */
class View {
  // Three.js/WebGL state objects
  private camera : THREE.CombinedCamera;
  private renderer : THREE.WebGLRenderer;
  private scene : THREE.Scene;

  // A cube mesh associated with each cell on the board
  private cubes : THREE.Mesh[] = [];

  /**
   * Constructs the scene and attaches the WebGL canvas to the root element.
   * @param root the element to which the canvas should be attached.
   * @param model the model to which this view is to bind.
   */
  constructor(private root : HTMLElement, private model : ModelInWorker) {
    var rect = root.getBoundingClientRect(),
        scene = new THREE.Scene();

    this.initCamera(scene, rect.width, rect.height);
    this.initLights(scene);
    this.initAction(scene, model, () => {
      this.render();
      this.model.next();
    });

    var renderer = new THREE.WebGLRenderer({ antialias : true });
    renderer.setSize(rect.width, rect.height);

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;

    root.appendChild(renderer.domElement);

    this.scene = scene;
    this.renderer = renderer;

    model.didChange.tap((changes : Changes) => {
      this.modelDidChange(changes);
    });
  }

  /**
   * Requests that this view re-measure its parent and adjust its size and viewport
   * accordingly.
   */
  resize() {
    var rect = this.root.getBoundingClientRect(),
        scene = this.scene;
    scene.remove(this.camera);
    this.initCamera(scene, rect.width, rect.height);
    this.renderer.setSize(rect.width, rect.height);
    this.render();
  }

  /**
   * Render the scene.
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Invoked with the model reports a change.
   * @param changes the Changes object that represents the new generation
   */
  private modelDidChange(changes : Changes) {
      var cubes = this.cubes,
          born = changes.born,
          died = changes.died;

      // Move all cells being born below the floor so they can animate up
      born.forEach((i : number) => {
        var cube = cubes[i];
        cube.visible = true;
        cube.position.y = -12;
      });
      this.render();

      // Begin a transition to move births up and deaths down
      transition((p : number) => {
        born.forEach((i : number) => {
          cubes[i].position.y = p * 24 - 12;
        });
        died.forEach((i : number) => {
          var cube = cubes[i];
          cube.position.y = (1 - p) * 24 - 12;
          cube.visible = p < 1;
        });

        // When the transition completes, wait a short time and then
        // request the next change
        if (p >= 1) {
          setTimeout(() => {
            model.next();
          }, 100);
        }

        this.render();
      }, 200 /* ms */, sigmoidEasing);
  }

  /**
   * Initialize the camera.
   * @param scene the current scene
   * @param width the viewport width
   * @param height the viewport height
   */
  private initCamera(scene : THREE.Scene, width : number, height : number) {
    // TODO: adjust camera position by aspect ratio
    var camera = new THREE.CombinedCamera(width, height, 40, 1, 10000, -2000, 10000);
    camera.position.x = 50;
    camera.position.y = 700;
    camera.position.z = 1200 * Math.cos(Math.PI / 4);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);
    this.camera = camera;
  }

  /**
   * Initialize ambient and directional lighting in the scene.
   * @param scene the current scene
   */
  private initLights(scene : THREE.Scene) {
    var ambient = new THREE.AmbientLight(0xff9900);
    scene.add(ambient);

    var directional = new THREE.DirectionalLight(0xff9900, 1);
    directional.position.set(100, 500, 0);
    directional.lookAt(new THREE.Vector3(0, 0, 0));
    directional.castShadow = true;
    directional.shadowDarkness = 0.4;
    directional.shadowCameraBottom = -1500;
    directional.shadowCameraTop = 1500;
    directional.shadowCameraLeft = 1500;
    directional.shadowCameraRight = -1500;
    scene.add(directional);
  }

  /**
   * Initialize all 3D objects in the scene. This includes all cubes and the floor plane.
   * @param scene the current scene
   * @param model the model to which this is bound
   * @param didLoad a callback to indicate when associated textures load
   */
  private initAction(scene : THREE.Scene, model : ModelInWorker, didLoad : () => void) {
    var cubes = this.cubes,
        width = 3000,
        depth = 3000,
        dx = width / model.cols,
        dy = depth / model.rows,
        cx = width / 2,
        cy = depth / 2;

    // Create an plane for the floor
    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xeeeeee
      }));
    plane.rotation.x = Math.PI / 2;
    plane.receiveShadow = true;
    plane.material.side = THREE.DoubleSide;
    scene.add(plane);

    // Create reusable geometry and materials for each of the cubes
    var geom = new THREE.CubeGeometry(dx, 20, dy),
        text = THREE.ImageUtils.loadTexture('img/cube.png', null, didLoad),
        matr = new THREE.MeshLambertMaterial({
        shading: THREE.FlatShading,
        map: text,
        color: 0xff9900,
        ambient: 0xff9900,
        transparent: true
      });

    // Create each of the cubes in non-visible state, they will be adjusted as they
    // are "born".
    for (var j = 0, m = model.rows; j < m; j++) {
      for (var i = 0, n = model.cols; i < n; i++) {
        var cube = new THREE.Mesh(geom, matr);
        cube.position.x = -cx + i * dx;
        cube.position.y = 12;
        cube.position.z = -cy + j * dy;
        cube.visible = false;
        cube.castShadow = true;
        cubes.push(cube);
        scene.add(cube);
      }
    }
  }  
}

// Create a new model and view, which will begin our journey.
var model = new ModelInWorker(150, 150, 0.1),
    view = new View(<HTMLElement>document.querySelector('#view'), model);

// Listen for resize events and pass those events to the View.
window.addEventListener('resize', (e : Event) => {
  view.resize();
}, false);

}
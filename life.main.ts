// The primary entry point for the life app.

/// <reference path="lib/life.msg.ts" />
/// <reference path="lib/life.etsy.ts" />
/// <reference path="lib/signal.ts" />
/// <reference path="lib/three.d.ts" />
module life {

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

  // changes that have been received from the worker, but not used.
  private changes : Changes[] = [];

  // The last change dispatched. This is used to support randomize.
  private lastChange : Changes = {born : [], survived: [], died: []};

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
  constructor(public cols : number, public rows : number, values : any[]) {
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

    this.worker = worker;
    this.init(values);
  }

  /**
   * Request that the worker initialize itself with the given state.
   * @param values the values of the game state
   */
  private init(values : any[]) {
    var worker = this.worker,
        cols = this.cols,
        rows = this.rows;
    // request the the model be initialized
    worker.postMessage({
      type: InitLife,
      cols: cols,
      rows: rows,
      values: values,
    });

    // go ahead and request the first batch of generations
    worker.postMessage({
      type: NeedSome,
      n : 20,
    });
  }

  /**
   * Randomizes the game state.
   */
  randomize() {
    var values = randomize(this.rows * this.cols, 0.1),
        lastChange = this.lastChange,
        died = lastChange.born.concat(lastChange.survived);
    // Synthesize a "next" change that will wipe out the current board. Notice that this
    // also discards any future generations we've already computed.
    this.changes = [{born: [], survived: [], died: died}];
    // Re-init the model
    this.init(values);
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
    this.lastChange = changes.shift();
    this.didChange.raise(this.lastChange);
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
 *
 * Implementation Note: Rather than sending each of the cubes to the GPU as an
 * indepdent object, this View uses the idle time between updates to combine
 * cubes that will be moving together into a single mesh. Building the meshes
 * is expensive but this allows us to have high frame rates on transitions as
 * the number of independent buffers sent to the GPU will be only the three
 * sets of cubes that move together (cubes that survived, cubes that were born,
 * and cubes that died) instead of a buffer for each cube.
 */
class View {
  // the size of the cube in the y-direction
  static CUBE_HEIGHT = 20;

  // the distance above the surface that live cubes hover
  static CUBE_ELEVATION = 2;

  // Three.js/WebGL state objects
  private camera : THREE.CombinedCamera;
  private renderer : THREE.WebGLRenderer;
  private scene : THREE.Scene;

  // A template cube mesh that will be used as a flyweight for creating geometries
  private cube : THREE.Mesh;
  // The coordinates of each cube along the x and z axes.
  private locs : THREE.Vector2[];

  // Meshes for each of the independent groups of cubes. survMesh composes all cubes
  // that survived from the previous generation. bornMesh are all cubes that are being
  // born in this generation. Finally, diedMesh are the cubes that are dying in this
  // generation.
  private survMesh : THREE.Mesh;
  private bornMesh : THREE.Mesh;
  private diedMesh : THREE.Mesh;

  // This is a non-general way of just showing the first frame "etsy" a little longer than
  // the rest.
  private frameCount = 0;

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
   * Construct a mesh composed of all the cubes at the specified indices.
   * @parma indices the indices of the cubes to merge
   * @return a THREE.Mesh of all the cubes with an associated material
   */
  private meshFor(indices : number[]) : THREE.Mesh {
    var locs = this.locs,
        cube = this.cube,
        y = View.CUBE_HEIGHT / 2 + View.CUBE_ELEVATION,
        geom = new THREE.Geometry();
    for (var i = 0, n = indices.length; i < n; i++) {
      var loc = locs[indices[i]];
      cube.position.x = loc.x;
      cube.position.z = loc.y;
      cube.position.y = y;
      THREE.GeometryUtils.merge(geom, cube);
    }
    var mesh = new THREE.Mesh(geom, <THREE.MeshLambertMaterial>cube.material);
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Animate from the current generation to the next (using the meshes that were built
   * during idle time).
   */
  private transition() {
    var bornMesh = this.bornMesh,
        diedMesh = this.diedMesh,
        range = View.CUBE_HEIGHT + View.CUBE_ELEVATION * 2;
    transition((p : number) => {
      bornMesh.position.y = (1 - p) * -range;
      diedMesh.position.y = p * -range;
      if (p >= 1) {
        // Schedule the next update 
        setTimeout(() => {
          this.model.next();
        }, 0);
      }
      this.render();
    }, 200 /* ms */, sigmoidEasing);
  }

  /**
   * Invoked with the model reports a change.
   * @param changes the Changes object that represents the new generation
   */
  private modelDidChange(changes : Changes) {
      var scene = this.scene,
          born = changes.born,
          died = changes.died,
          survived = changes.survived,
          bornMesh = this.bornMesh,
          survMesh = this.survMesh,
          diedMesh = this.diedMesh,
          // range of movement of a transitioning cube
          range = View.CUBE_HEIGHT + View.CUBE_ELEVATION * 2,
          startedAt = Date.now();

      // Remove the meshes for the last generation
      if (survMesh) {
        scene.remove(survMesh);
      }
      if (bornMesh) {
        scene.remove(bornMesh);
      }
      if (diedMesh) {
        scene.remove(diedMesh);
      }

      // Build new meshes for all three sets of cells
      survMesh = this.meshFor(survived);
      bornMesh = this.meshFor(born);
      diedMesh = this.meshFor(died);

      // The cells being born need to start below stage.
      bornMesh.position.y = -range;

      scene.add(survMesh);
      scene.add(bornMesh);
      scene.add(diedMesh);

      this.survMesh = survMesh;
      this.bornMesh = bornMesh;
      this.diedMesh = diedMesh;

      this.render();

      // Show each frame for 100ms ... except the first one, give it a bit more
      // screen time.
      var frame = this.frameCount++,
          timeout = 100 /* ms */;
      if (frame == 1) {
        timeout = 1000 /* ms */;
      }

      // Schedule the transition to the next generation to begin in ever how much 
      // time remains.
      setTimeout(() => {
        this.transition();
      }, Math.max(0, timeout - Date.now() + startedAt));
  }

  /**
   * Initialize the camera.
   * @param scene the current scene
   * @param width the viewport width
   * @param height the viewport height
   */
  private initCamera(scene : THREE.Scene, width : number, height : number) {
    var camera = new THREE.CombinedCamera(width, height, 40, 1, 10000, -2000, 10000);
    // camera is perched up above the scene looking down at the origin in a way that will
    // fill the screen for common aspect ratios.
    camera.position.x = 50;
    camera.position.y = 700;
    camera.position.z = 850;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);
    this.camera = camera;
  }

  /**
   * Initialize ambient and directional lighting in the scene.
   * @param scene the current scene
   */
  private initLights(scene : THREE.Scene) {
    // Use ambient light that accentuates the material color of the cubes
    var ambient = new THREE.AmbientLight(0xff9900);
    scene.add(ambient);

    // Directional light is positioned such that soft shadows are cast in the direction
    // of the camera.
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
    var locs = [],
        width = 3000,
        depth = 3000,
        dx = width / model.cols,
        dy = depth / model.rows,
        cx = width / 2,
        cy = depth / 2,
        y = View.CUBE_HEIGHT/2 + View.CUBE_ELEVATION;

    // Create an plane for the floor
    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xeeeeee,
      }));
    plane.rotation.x = Math.PI / 2;
    plane.receiveShadow = true;
    plane.material.side = THREE.DoubleSide;
    scene.add(plane);

    // Build the flyweight cube that will be used in constructing meshes.
    var text = THREE.ImageUtils.loadTexture('img/cube.png', null, didLoad),
        cube = new THREE.Mesh(
          new THREE.CubeGeometry(dx, View.CUBE_HEIGHT, dy),
          new THREE.MeshLambertMaterial({
            shading: THREE.FlatShading,
            map: text,
            color: 0xff9900,
            ambient: 0xff9900,
            transparent: true
          }));

    cube.castShadow = true;

    // Create each of the cubes in non-visible state, they will be adjusted as they
    // are "born".
    for (var j = 0, m = model.rows; j < m; j++) {
      for (var i = 0, n = model.cols; i < n; i++) {
        locs.push(new THREE.Vector2(-cx + i * dx, -cy + j * dy));
      }
    }

    this.cube = cube;
    this.locs = locs;
  }  
}

/**
 * Where it all begins.
 */
var main = () => {
  // Workers cannot load scripts when the host page is a file: url.
  if (location.href.indexOf('file:') == 0) {
    var warn = document.getElementById('warn');
    warn.style.display = 'block';
    setTimeout(() => {
      warn.style.opacity = "1.0";
    }, 0);
    return;
  }

  // Create a new model and view, which will begin our journey.
  var size = 150,
      model = new ModelInWorker(size, size, etsyState()),
      view = new View(<HTMLElement>document.querySelector('#view'), model);

  // Listen for resize events and pass those events to the View.
  window.addEventListener('resize', (e : Event) => {
    view.resize();
  }, false);

  document.querySelector('#rand').addEventListener('click', (e : Event) => {
    model.randomize();
  }, false);
};

main();

}
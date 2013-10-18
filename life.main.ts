/// <reference path="lib/life.msg.ts" />
/// <reference path="lib/signal.ts" />
/// <reference path="lib/three.d.ts" />
/// <reference path="lib/raf.ts" />
module life {

var sigmoidEasing = (p : number) => {
  return 0.5 - Math.cos(p * Math.PI) * 0.5;
};

var linearEasing = (p : number) => {
  return p;
};

var transition = (callback: (p:number) => void, duration : number, easing? : (p:number) => number) => {
  var t0 = Date.now();
  if (!easing) {
    easing = linearEasing;
  }

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

class ModelInWorker {
  didChange = new Signal;
  private worker : Worker;
  private changes : Changes[] = [];
  constructor(public cols : number, public rows : number, fill : number) {
    var worker = new Worker('work.js');
    worker.onmessage = (e : MessageEvent) => {
      var msg = <HereSomeMsg>e.data;
      msg.changes.forEach((c) => {
        this.changes.push(c);
      });
      if (msg.fromInit) {
        this.didChange.raise(this.changes.shift());
      }
    };
    worker.postMessage({
      type: InitLife,
      cols: cols,
      rows: rows,
      random: fill,
    });
    worker.postMessage({
      type: NeedSome,
      n : 20,
    });
    this.worker = worker;
  }

  next() {
    var changes = this.changes,
        worker = this.worker;
    this.didChange.raise(changes.shift());
    if (changes.length <= 2) {
      worker.postMessage({
        type: NeedSome,
        n: 20,
      });
    }
  }
}

class View {
  private camera : THREE.CombinedCamera;
  private renderer : THREE.WebGLRenderer;
  private scene : THREE.Scene;

  private birthMat : THREE.MeshLambertMaterial;
  private deathMat : THREE.MeshLambertMaterial;
  private aliveMat : THREE.MeshLambertMaterial;

  private cubes : THREE.Mesh[] = [];

  constructor(private root : HTMLElement, private model : ModelInWorker) {
    var rect = root.getBoundingClientRect(),
        scene = new THREE.Scene();

    this.initCamera(scene, rect.width, rect.height);
    this.initLights(scene);
    this.initAction(scene, model, () => {
      this.render();
    });

    var renderer = new THREE.WebGLRenderer({ antialias : true });
    renderer.setSize(rect.width, rect.height);

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;

    root.appendChild(renderer.domElement);

    this.scene = scene;
    this.renderer = renderer;

    renderer.domElement.addEventListener('click', (e : Event) => {
      // convert world vector to screen pt.
      var wh = rect.width/2,
          hh = rect.height/2,
          projector = new THREE.Projector();

      var v = projector.projectVector(new THREE.Vector3(100, 100, 0), this.camera);
      v.x = (v.x * wh) + wh;
      v.y = (-v.y * hh) + hh;

      console.log(v);
    }, false);

    model.didChange.tap((changes : Changes) => {
      this.modelDidChange(changes);
    });
  }

  resize() {
    var rect = this.root.getBoundingClientRect(),
        scene = this.scene;
    scene.remove(this.camera);
    this.initCamera(scene, rect.width, rect.height);
    this.renderer.setSize(rect.width, rect.height);
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private modelDidChange(changes : Changes) {
      var cubes = this.cubes;

      changes.born.forEach((i : number) => {
        var cube = cubes[i];
        cube.visible = true;
        cube.position.y = -12;
      });
      this.render();

      transition((p : number) => {
        changes.born.forEach((i : number) => {
          cubes[i].position.y = p * 24 - 12;
        });
        changes.died.forEach((i : number) => {
          var cube = cubes[i];
          cube.position.y = (1 - p) * 24 - 12;
          cube.visible = p < 1;
        });

        if (p >= 1) {
          setTimeout(() => {
            model.next();
          }, 100);
        }

        this.render();
      }, 200 /* ms */, sigmoidEasing);
  }

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

  private initAction(scene : THREE.Scene, model : ModelInWorker, didLoad : () => void) {
    var cubes = this.cubes,
        width = 3000,
        depth = 3000,
        dx = width / model.cols,
        dy = depth / model.rows,
        cx = width / 2,
        cy = depth / 2;
    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth, dx, dy),
      new THREE.MeshBasicMaterial({
        color: 0xeeeeee
      }));
    plane.rotation.x = Math.PI / 2;
    plane.receiveShadow = true;
    plane.material.side = THREE.DoubleSide;
    scene.add(plane);

    var geom = new THREE.CubeGeometry(dx, 20, dy),
        text = THREE.ImageUtils.loadTexture('img/cube.png', null, didLoad);

    var aliveMat = new THREE.MeshLambertMaterial({
        shading: THREE.FlatShading,
        map: text,
        color: 0xff9900,
        ambient: 0xff9900,
        transparent: true
      });
    var birthMat = aliveMat.clone();
    var deathMat = aliveMat.clone();

    for (var j = 0, m = model.rows; j < m; j++) {
      for (var i = 0, n = model.cols; i < n; i++) {
        var cube = new THREE.Mesh(geom, aliveMat);
        cube.position.x = -cx + i * dx;
        cube.position.y = 12;
        cube.position.z = -cy + j * dy;
        cube.visible = false;
        cube.castShadow = true;
        cubes.push(cube);
        scene.add(cube);
      }
    }

    this.aliveMat = aliveMat;
    this.birthMat = birthMat;
    this.deathMat = deathMat;
  }  
}

var model = new ModelInWorker(150, 150, 0.2),
    view = new View(<HTMLElement>document.querySelector('#view'), model);

window.addEventListener('resize', (e : Event) => {
  view.resize();
}, false);

}
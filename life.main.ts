/// <reference path="lib/life.ts" />
/// <reference path="lib/three.d.ts" />
/// <reference path="lib/raf.ts" />
module life {

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
  private camera : THREE.CombinedCamera;
  private renderer : THREE.WebGLRenderer;
  private scene : THREE.Scene;

  private birthMat : THREE.MeshLambertMaterial;
  private deathMat : THREE.MeshLambertMaterial;
  private aliveMat : THREE.MeshLambertMaterial;

  private cubes : THREE.Mesh[] = [];

  constructor(private root : HTMLElement, model : Model) {
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

    model.didChange.tap((model : Model, changes : Changes) => {
      var cubes = this.cubes;
      changes.born.forEach((i : number) => {
        cubes[i].visible = true;
      });
      changes.died.forEach((i : number) => {
        cubes[i].visible = false;
      });
      this.render();
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
    // directional.shadowCameraVisible = true;
    directional.shadowCameraBottom = -1500;
    directional.shadowCameraTop = 1500;
    directional.shadowCameraLeft = 1500;
    directional.shadowCameraRight = -1500;
    scene.add(directional);
  }

  private initAction(scene : THREE.Scene, model : Model, didLoad : () => void) {
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

    var geom = new THREE.CubeGeometry(dx, dy, 20),
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
        // cube.receiveShadow = true;
        cubes.push(cube);
        scene.add(cube);
      }
    }


    this.aliveMat = aliveMat;
    this.birthMat = birthMat;
    this.deathMat = deathMat;
  }  
}

var model = new Model(150, 150),
    view = new View(<HTMLElement>document.querySelector('#view'), model);

randomize(model);
document.addEventListener('keydown', (e : KeyboardEvent) => {
  if (e.keyCode != 39) {
    return;
  }
  model.next();
}, false);

window.addEventListener('resize', (e : Event) => {
  view.resize();
}, false);

}
/// <reference path="lib/jquery.d.ts" />
/// <reference path="lib/three.d.ts" />
/// <reference path="lib/signal.ts" />
module app {

var $e = (type : string) => {
  return $(document.createElement(type));
};

class View {
  private camera : THREE.CombinedCamera;
  private renderer : THREE.WebGLRenderer;
  private scene : THREE.Scene;

  private birthMat : THREE.MeshLambertMaterial;
  private deathMat : THREE.MeshLambertMaterial;
  private aliveMat : THREE.MeshLambertMaterial;

  private cubes : THREE.Mesh[];

  constructor(public root : JQuery) {
    var rect = root.get(0).getBoundingClientRect(),
        scene = new THREE.Scene();

    this.initLights(scene);
    this.initCamera(scene, rect.width, rect.height);
    this.initAction(scene, () => {
      this.render();
    });

    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000, 100, 100),
      new THREE.MeshBasicMaterial({
        color: 0x999999,
        wireframe: true
      }));
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);

    var renderer = new THREE.WebGLRenderer({ antialias : true });
    renderer.setSize(rect.width, rect.height);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    root.get(0).appendChild(renderer.domElement);

    this.scene = scene;
    this.renderer = renderer;
  }

  render() {
    console.log('render');
    this.renderer.render(this.scene, this.camera);
  }

  private initCamera(scene : THREE.Scene, width : number, height : number) {
    // TODO: adjust camera position by aspect ratio
    var camera = new THREE.CombinedCamera(width, height, 40, 1, 10000, -2000, 10000);
    camera.position.x = 50;
    camera.position.y = 1000 * Math.sin(Math.PI / 4);
    camera.position.z = 1000 * Math.cos(Math.PI / 4);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);
    this.camera = camera;
  }

  private initLights(scene : THREE.Scene) {
    var ambient = new THREE.AmbientLight(0xff0000);
    scene.add(ambient);

    var directional = new THREE.DirectionalLight(0xffffff);
    directional.position.set(0, -1, 1).normalize();
    directional.castShadow = true;
    directional.shadowDarkness = 0.2;
    directional.shadowCameraVisible = true;
    scene.add(directional);
  }

  private initAction(scene : THREE.Scene, didLoad : () => void) {
    var geom = new THREE.CubeGeometry(20, 20, 20),
        text = THREE.ImageUtils.loadTexture('img/cube.png', null, didLoad);

    var aliveMat = new THREE.MeshLambertMaterial({
        shading: THREE.SmoothShading,
        map: text,
        color: 0xff9900,
        ambient: 0xff9900,
        transparent: true
      });
    var birthMat = aliveMat.clone();
    var deathMat = aliveMat.clone();

    var cube = new THREE.Mesh(geom, aliveMat);
    cube.position.x = 0;
    cube.position.y = 100;
    cube.position.z = 0;
    cube.visible = true;
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    this.aliveMat = aliveMat;
    this.birthMat = birthMat;
    this.deathMat = deathMat;
  }  
}

var view = new View($('#view'));

}
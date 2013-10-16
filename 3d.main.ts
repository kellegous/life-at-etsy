/// <reference path="lib/jquery.d.ts" />
/// <reference path="lib/three.d.ts" />
module app {

var $e = (type : string) => {
  return $(document.createElement(type));
};

class View {
  camera : THREE.CombinedCamera;
  renderer : THREE.WebGLRenderer;
  scene : THREE.Scene;

  constructor(public root : JQuery) {
    var rect = root.get(0).getBoundingClientRect(),
        scene = new THREE.Scene();

    // TODO: adjust camera position by aspect ratio
    var camera = new THREE.CombinedCamera(rect.width, rect.height, 40, 1, 10000, -2000, 10000);
    camera.position.x = 100;
    camera.position.y = 1000 * Math.sin(Math.PI / 4);
    camera.position.z = 1000 * Math.cos(Math.PI / 4);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);

    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000, 100, 100),
      new THREE.MeshBasicMaterial({
        color: 0x999999,
        wireframe: true
      }));
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);

    View.initLights(scene);
    View.initCubes(scene);

    var renderer = new THREE.WebGLRenderer({ antialias : true });
    renderer.setSize(rect.width, rect.height);
    root.get(0).appendChild(renderer.domElement);

    setTimeout(() => {
      renderer.render(scene, camera);
    }, 1000);


    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  static initLights(scene : THREE.Scene) {
    var ambient = new THREE.AmbientLight(0xff0000);
    scene.add(ambient);

    var directional = new THREE.DirectionalLight(0xffffff);
    directional.position.set(1, 1, 1).normalize();
    scene.add(directional);
  }

  static initCubes(scene : THREE.Scene) {
    var geom = new THREE.CubeGeometry(20, 20, 20),
        matr = new THREE.MeshLambertMaterial({
          shading: THREE.SmoothShading,
          map: THREE.ImageUtils.loadTexture('img/cube.png'),
          color: 0xff9900,
          ambient: 0xff9900
        });


    var cube = new THREE.Mesh(geom, matr);
    cube.position.x = 0;
    cube.position.y = 100;
    cube.position.z = 0;
    cube.visible = true;
    scene.add(cube);
  }  
}

var view = new View($('#view'));

}
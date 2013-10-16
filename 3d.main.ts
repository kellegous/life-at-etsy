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
    camera.position.x = 0;
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

    var renderer = new THREE.WebGLRenderer({ antialias : true });
    renderer.setSize(rect.width, rect.height);
    root.get(0).appendChild(renderer.domElement);

    renderer.render(scene, camera);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }
}

var view = new View($('#view'));

}
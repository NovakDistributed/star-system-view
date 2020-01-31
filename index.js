// If we import without the path, we just get a global THREE defined for us, which is OK but not great.
import * as THREE from 'https://unpkg.com/three@0.113.2/build/three.module.js'

export default class Viewer {
  constructor(domRoot) {
    var scene = new THREE.Scene()
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    var renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    domRoot.appendChild(renderer.domElement)

    var geometry = new THREE.BoxGeometry()
    var material = new THREE.MeshBasicMaterial({color: 0x00ff00})
    var cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    camera.position.z = 5

    var lastTime = undefined

    function animate(time) {
        
        requestAnimationFrame(animate)
        
        if (lastTime != undefined) {
            let delta_seconds = (time - lastTime) / 1000
            cube.rotation.x += 1 * delta_seconds
            cube.rotation.y += 1 * delta_seconds
        }
        lastTime = time

        renderer.render(scene, camera)
    }
    requestAnimationFrame(animate)
  }
}

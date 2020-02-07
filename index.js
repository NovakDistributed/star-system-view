// If we import without the path, we just get a global THREE defined for us, which is OK but not great.
import * as THREE from 'https://unpkg.com/three@0.113.2/build/three.module.js'

export default class SystemView extends HTMLElement {
  constructor() {
    super()

    // Get at our Shadow DOM
    let shadow = this.attachShadow({mode: 'open'})

    // Define our stylesheet inline.
    // Who knows where external files are?
    let style = document.createElement('style')
    style.textContent = 'canvas { display: block; }'

    // Try and figure out how big the element is.

    // Set up ThreeJS
    let scene = new THREE.Scene()
    let camera = new THREE.PerspectiveCamera(75, this.clientWidth / this.clientHeight, 0.1, 1000)

    let renderer = new THREE.WebGLRenderer()
    renderer.setSize(this.clientWidth, this.clientHeight)
    shadow.appendChild(renderer.domElement)

    let geometry = new THREE.BoxGeometry()
    let material = new THREE.MeshBasicMaterial({color: 0x00ff00})
    let cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    camera.position.z = 5

    // Have a global time stream, even between adds/removes to the document
    let lastTime = undefined

    // Track whether we should be rendering or not.
    // We really should only be trying to run animation frames when in the DOM.
    // This holds the requestAnimationFrame callback currently in flight, for
    // use with cancelAnimationFrame if the element goes away.
    this.frameRequest = undefined

    // We do all our real logic in this animate function. We declare it here so
    // it can have access to the Three stuff without this.everything.
    this.animate = (time) => {
        // Run again on the next frame
        this.frameRequest = requestAnimationFrame(this.animate)

        // Always resize to the size that we actually are on any frame
        camera.aspect = this.clientWidth / this.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(this.clientWidth, this.clientHeight );
        
        if (lastTime != undefined) {
            let delta_seconds = (time - lastTime) / 1000
            cube.rotation.x += 1 * delta_seconds
            cube.rotation.y += 1 * delta_seconds
        }
        lastTime = time

        renderer.render(scene, camera)
    }

    console.log('SystemView created')

  }

  connectedCallback() {
    // We have been added to the DOM, or moved.

    console.log('SystemView connected')
    
    if (this.isConnected && this.frameRequest == undefined) {
      // Request animation to start.
      this.frameRequest = requestAnimationFrame(this.animate)
    }
  }

  disconnectedCallback() {
    // We have been removed from the DOM

    console.log('SystemView disconnected')
    
    if (this.frameRequest != undefined) {
      // Stop rendering until we come back
      cancelAnimationFrame(this.frameRequest)
      this.frameRequest = undefined
    }
  }
}

// We are a Web Component! And an autonomous one so Safari can use us.
customElements.define('system-view', SystemView)

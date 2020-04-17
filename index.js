// If we import without the path, we just get a global THREE defined for us, which is OK but not great.
import * as THREE from 'https://unpkg.com/three@0.113.2/build/three.module.js'

/**
 * Load a Three.js font from the given URL.
 * Resolves with the loaded font.
 */
function getFont(fontUrl) {
  if (typeof getFont.cache === 'undefined') {
    // Make a cache to map from URL to font
    getFont.cache = {}
  }

  if (typeof getFont.cache[fontUrl] === 'undefined') {
    // Font is not yet loaded.
    let loader = new THREE.FontLoader()

    return new Promise((resolve, reject) => {
      // Load the font.
      loader.load(fontUrl, (font) => {
        // Resolve and cache when it is loaded
        getFont.cache[fontUrl] = font
        resolve(font)
      }, () => {}, reject)
    })
  } else {
    // Font is loaded, return immediately
    return getFont.cache[fontUrl]
  }
}

/**
 * Get a mesh for text reading the given message.
 * Produces exactly one mesh per text, and caches.
 */
function getTextMesh(font, message) {
  if (typeof getTextMesh.cache === 'undefined') {
    // Make a cache to map from message to font
    getTextMesh.cache = {}
  }

  if (typeof getTextMesh.cache[message] === 'undefined') {
    let material = new THREE.MeshBasicMaterial({
      color: 0x666600,
      side: THREE.DoubleSide
    })

    let shapes = font.generateShapes(message, 100)
    var geometry = new THREE.ShapeBufferGeometry(shapes)
    geometry.computeBoundingBox()

    let text = new THREE.Mesh(geometry, material)
    getTextMesh.cache[message] = text
    return text
  } else {
    return getTextMesh.cache[message]
  }
}

export default class SystemView extends HTMLElement {
  constructor() {
    super()

    // Get at our Shadow DOM
    let shadow = this.attachShadow({mode: 'open'})

    // Define our stylesheet inline.
    // Who knows where external files are?
    // We need to turn off overflow or our full-size canvas child and
    // auto-resize logic will create oscilating on/off scrollbars.
    let style = document.createElement('style')
    style.textContent = `
    :host { overflow-x: hidden; overflow-y: hidden; }
    canvas { display: block; }
    `
    shadow.appendChild(style);

    // Set up ThreeJS
    let scene = new THREE.Scene()
    let camera = new THREE.PerspectiveCamera(75, this.clientWidth / this.clientHeight, 0.1, 1000)
    // make sure we can parent things to the camera
    scene.add(camera)

    let renderer = new THREE.WebGLRenderer()
    // Render at full DPI on High DPI displays
    renderer.setPixelRatio(window.devicePixelRatio)
    // Match the size the custom element is styled to
    renderer.setSize(this.clientWidth, this.clientHeight)
    shadow.appendChild(renderer.domElement)

    let geometry = new THREE.BoxGeometry()
    let material = new THREE.MeshBasicMaterial({color: 0x00ff00})
    let cube = new THREE.Mesh(geometry, material)
    //scene.add(cube)
    
    let screenspace = new THREE.Group()
    screenspace.position.z = -camera.near
    camera.add(screenspace)
    
    // Cube is centered on origin, with faces 0.5 away in all directions
    let screenCube = new THREE.Mesh(geometry, material)
    screenspace.add(screenCube)
    screenCube.scale.x = 10
    screenCube.scale.y = 10
    screenCube.scale.z = 1E-9
    screenCube.position.x = 5
    screenCube.position.y = 5
    screenCube.position.z = -1E-9/2

    let fontUrl = 'https://unpkg.com/three@0.113.2/examples/fonts/helvetiker_regular.typeface.json'
    getFont(fontUrl).then((font) => {

      // We have a single message (FPS counter) that we update
      // Track the object
      let lastText = undefined
      
      let setText = (message) => {
        if (typeof lastText !== 'undefined') {
          screenspace.remove(lastText)
        }

        let text = getTextMesh(font, message)
        // Scale to a manageable height. TODO: how big is the text officially?
        // Different strings have different bounding boxes.
        let shrink = 1
        text.scale.set(shrink, shrink, shrink)
        // Position it so we can see it
        text.position.z = 0
        text.position.y = 0
        text.position.x = 0
        screenspace.add(text)
        lastText = text
      }

      let updateFPS = () => {
        setText(Math.round(this.fps).toString())
        setTimeout(updateFPS, 1000)
      }

      updateFPS()
    })

    camera.position.z = 5

    // Have a global time stream, even between adds/removes to the document
    let lastTime = undefined

    // Track frames per second
    this.fps = 0

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
        camera.aspect = this.clientWidth / this.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(this.clientWidth, this.clientHeight)
        
        // Compute FoV Facts
        // See https://github.com/mrdoob/three.js/issues/1239#issuecomment-3784882
        let verticalFOV = camera.fov / 180 * Math.PI
        let horizontalFOV = 2 * Math.atan(Math.tan(verticalFOV / 2) * camera.aspect)
        let screenSpaceHeight = 2 * Math.tan(verticalFOV / 2) * camera.near
        let screenSpaceWidth = 2 * Math.tan(horizontalFOV / 2) * camera.near
        
        // Scale so that screen space runs in pixels to 1 across the whole screen
        // Note that 0,0 is bottom left and not top left.
        // Note also that anything with nonzero thickness will zoom off into space.
        screenspace.scale.set(screenSpaceWidth / this.clientWidth, screenSpaceHeight / this.clientHeight, 1.0)
        // Budge it over to the bottom left
        // Happens after scale
        screenspace.position.x = -screenSpaceWidth / 2
        screenspace.position.y = -screenSpaceHeight / 2
        
        if (lastTime != undefined) {
            let delta_seconds = (time - lastTime) / 1000
            cube.rotation.x += 1 * delta_seconds
            cube.rotation.y += 1 * delta_seconds

            // Record rendering FPS
            this.fps = 1/delta_seconds
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

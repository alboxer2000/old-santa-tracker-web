// Config
import CONFIG from './config.js'

// // SceneSubjects
import Cube from '../SceneSubjects/Cube/index.js'
import Glue from '../SceneSubjects/Glue/index.js'
import Lights from '../SceneSubjects/Lights/index.js'
import Pyramid from '../SceneSubjects/Pyramid/index.js'
import Terrain from '../SceneSubjects/Terrain/index.js'

class SceneManager {
  constructor(canvas) {
    this.canvas = canvas

    this.screenDimensions = {
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight
    }

    this.initCannon()
    this.buildScene()
    this.buildRender()
    this.buildCamera()
    this.buildControls()

    if (CONFIG.SHOW_HELPERS) {
      this.buildHelpers()
    }

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()
    this.moveOffset = {
      x: 0,
      y: 0,
      z: 0
    }

    this.createSceneSubjects()
  }

  initCannon() {
    this.world = new CANNON.World()
    this.world.gravity.set(0, -10, 0)
    this.world.broadphase = new CANNON.NaiveBroadphase()
    this.world.solver.iterations = 10
  }

  buildScene() {
    this.scene = new THREE.Scene()
  }

  buildRender() {
    const { width, height } = this.screenDimensions
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    })
    const DPR = window.devicePixelRatio ? window.devicePixelRatio : 1
    this.renderer.setPixelRatio(DPR)
    this.renderer.setSize(width, height)
    this.renderer.gammaInput = true
    this.renderer.gammaOutput = true
    this.renderer.gammaFactor = 2.2
  }

  buildCamera() {
    const { width, height } = this.screenDimensions
    const aspectRatio = width / height
    const fieldOfView = 10
    const nearPlane = 1
    const farPlane = 1000
    this.camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.position.set(0, 40, 50)
    this.camera.lookAt(0, 0, 0)
  }

  buildControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
    this.controls.minDistance = 10
    this.controls.maxDistance = 500
    this.controls.enableKeys = false
    this.controls.enablePan = false
    this.controls.enableRotate = true
  }

  buildHelpers() {
    const dir = new THREE.Vector3(0, 1, 0)
    // normalize the direction vector (convert to vector of length 1)
    dir.normalize()
    const origin = new THREE.Vector3(0, 0, 0)
    const length = 1
    const hex = 0xff00ff
    const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex)
    this.scene.add(arrowHelper)
    const gridHelper = new THREE.GridHelper(CONFIG.SCENE_SIZE, CONFIG.SCENE_SIZE / 10)
    this.scene.add(gridHelper)
  }

  createSceneSubjects() {
    this.sceneSubjects = [new Lights(this.scene, this.world), new Terrain(this.scene, this.world)]
    this.lights = this.sceneSubjects[0]
    this.terrain = this.sceneSubjects[1]
  }

  update() {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const elapsedTime = this.clock.getElapsedTime()
    this.world.step(CONFIG.TIMESTEP)
    for (let i = 0; i < this.sceneSubjects.length; i++) {
      this.sceneSubjects[i].update(elapsedTime)
    }
    this.renderer.render(this.scene, this.camera)

    if (this.mergeInProgress) {
      this.merge()
    }
  }

  // EVENTS

  onWindowResize() {
    const { width, height } = this.canvas
    this.screenDimensions.width = width
    this.screenDimensions.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  onKeydown(event) {
    const elapsedTime = this.clock.getElapsedTime()
    this.bindArrowClick(event.key)
    for (let i = 0; i < this.sceneSubjects.length; i++) {
      if (typeof this.sceneSubjects[i].onKeydown === 'function') {
        this.sceneSubjects[i].onKeydown(event, elapsedTime, this.checkOverlap)
      }
    }
  }

  onMouseMove(event) {
    if (event) {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      if (!this.selectedSubject) {
        const hit = this.getNearestObject()
        if (hit) {
          const subject = this.getSubjectfromMesh(hit.object)
          this.highlightSubject(subject)
        } else {
          this.highlightSubject(false)
        }
      }
    }

    if (this.selectedSubject) {
      const pos = this.getCurrentPosOnPlane()
      this.terrain.movePositionMarker(pos.x + this.moveOffset.x, pos.z + this.moveOffset.z)
      this.selectedSubject.moveTo(pos.x + this.moveOffset.x, null, pos.z + this.moveOffset.z)
    }
  }

  onMouseDown() {
    const hit = this.getNearestObject()
    if (
      hit.point &&
      (hit.object.geometry instanceof THREE.Geometry || hit.object.geometry instanceof THREE.BufferGeometry)
    ) {
      // eslint-disable-next-line max-len
      const newSelectedSubject = this.sceneSubjects.find(subject =>
        subject.mesh ? subject.mesh.uuid === hit.object.uuid : false
      )
      if (this.selectedSubject) {
        this.unselectObject()
      } else {
        this.selectObject(this.getCurrentPosOnPlane(), newSelectedSubject)
      }
    } else if (this.selectedSubject) {
      this.unselectObject()
    }
  }

  onButtonClick(id) {
    switch (id) {
      case 'add-cube':
        this.addShape('cube')
        break
      case 'add-pyramid':
        this.addShape('pyramid')
        break
      case 'add-glue':
        this.addShape('glue')
        break
      default:
        break
    }
  }

  bindArrowClick(key) {
    switch (key) {
      case 'ArrowUp':
        this.move('up')
        break
      case 'ArrowDown':
        this.move('down')
        break
      case 'ArrowRight':
        this.rotate('right')
        break
      case 'ArrowLeft':
        this.rotate('left')
        break
      default:
        break
    }
  }

  unselectObject() {
    this.selectedSubject.moveToGhost()
    this.selectedSubject.unselect()

    this.terrain.removePositionMarker()

    this.selectedSubject = null
  }

  selectObject(pos, newSelectedSubject) {
    if (this.selectedSubject) {
      this.unselectObject()
    }

    const { x, z } = newSelectedSubject.body.position
    if (pos) {
      this.moveOffset = {
        x: x - pos.x,
        z: z - pos.z
      }
    }
    this.selectedSubject = newSelectedSubject
    this.selectedSubject.select()
    this.terrain.addPositionMarker(this.selectedSubject.body.position)
  }

  findNearestIntersectingObject(objects) {
    const hits = this.raycaster.intersectObjects(objects)
    const closest = hits.length > 0 ? hits[0] : false
    return closest
  }

  setScreenPerpCenter(point) {
    // If it does not exist, create a new one
    if (!this.gplane) {
      const planeGeo = new THREE.PlaneGeometry(500, 500)
      this.gplane = new THREE.Mesh(
        planeGeo,
        new THREE.MeshLambertMaterial({
          color: 0x777777,
          transparent: true,
          opacity: 1
        })
      )
      this.scene.add(this.gplane)
    }
    // Center at mouse position
    this.gplane.position.copy(point)
    // Make it face toward the camera
    this.gplane.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
  }

  addMouseConstraint(pos, constrainedBody) {
    // The cannon body constrained by the mouse joint
    const { x, y, z } = pos
    // Move the cannon click marker particle to the click position
    this.jointBody.position.set(x, Math.max(1, y), z)
    // Create a new constraint
    // The pivot for the jointBody is zero
    this.mouseConstraint = new CANNON.LockConstraint(constrainedBody, this.jointBody)
    // Add the constriant to world
    this.world.addConstraint(this.mouseConstraint)
  }

  removeClickMarker() {
    if (this.clickMarker) {
      this.clickMarker.visible = false
    }
  }

  removeJointConstraint() {
    this.world.removeConstraint(this.mouseConstraint)
    this.mouseConstraint = false
  }

  getCurrentPosOnPlane() {
    const hit = this.findNearestIntersectingObject([this.terrain.meshes[0]])
    if (hit) return hit.point
    return false
  }

  getNearestObject() {
    const objects = this.sceneSubjects
      .filter(subject => subject.selectable)
      .map(subject => subject.mesh)
      .filter(object => object)

    return this.findNearestIntersectingObject(objects)
  }

  moveJointToPoint(pos) {
    // Move the joint body to a new position
    this.jointBody.position.set(pos.x, Math.max(1, pos.y), pos.z)
    this.mouseConstraint.update()
  }

  addShape(shape) {
    let subject
    switch (shape) {
      case 'cube':
        subject = new Cube(this.scene, this.world)
        break
      case 'pyramid':
        subject = new Pyramid(this.scene, this.world)
        break
      case 'glue':
        subject = new Glue(this.scene, this.world)
        break
      default:
        break
    }

    subject.addListener('merge', this.initMerge.bind(this))

    this.sceneSubjects.push(subject)
    this.selectObject(false, subject)
  }

  move(direction) {
    if (this.selectedSubject) {
      const y =
        this.selectedSubject.body.position.y +
        (direction === 'up' ? CONFIG.ELEVATE_SCALE : -CONFIG.ELEVATE_SCALE) +
        0.01
      this.selectedSubject.moveTo(null, y, null)
      this.onMouseMove()
    }
  }

  rotate(direction) {
    if (this.selectedSubject) {
      const angle = direction === 'right' ? Math.PI / 20 : -Math.PI / 20
      const axis = new CANNON.Vec3(0, 1, 0)
      this.selectedSubject.rotate(axis, angle)
    }
  }

  initMerge(bodyA, bodyB) {
    // Step 1: Get two objects
    const objectA = this.getSubjectfromBody(bodyA)
    const objectB = this.getSubjectfromBody(bodyB)

    // Step 2: Get height of object to be merged
    const heightIncrease = (bodyA.aabb.upperBound.y - bodyB.aabb.lowerBound.y) / 2
    this.mergeData = {
      objectA,
      objectB,
      heightIncrease,
      currentHeightIncrease: 0
    }

    // Step 3: Init Merging
    this.mergeInProgress = true
  }

  getSubjectfromBody(body) {
    return this.sceneSubjects.find(subject => (subject.body ? subject.body.id === body.id : false))
  }

  getSubjectfromMesh(mesh) {
    return this.sceneSubjects.find(subject => (subject.mesh ? subject.mesh.uuid === mesh.uuid : false))
  }

  merge() {
    this.mergeData.currentHeightIncrease += 0.01

    const { objectA, objectB, currentHeightIncrease, heightIncrease } = this.mergeData
    const shapeB = objectB.body.shapes[0]
    shapeB.halfExtents.y += 0.01
    shapeB.updateBoundingSphereRadius()
    shapeB.updateConvexPolyhedronRepresentation()
    objectB.body.updateBoundingRadius()
    objectB.body.updateMassProperties()
    objectB.updateMeshFromBody()

    const shapeA = objectA.body.shapes[0]
    shapeA.halfExtents.y -= 0.01
    shapeA.updateBoundingSphereRadius()
    shapeA.updateConvexPolyhedronRepresentation()
    objectA.body.updateBoundingRadius()
    objectA.body.updateMassProperties()
    objectA.updateMeshFromBody()

    // Check if merge completed
    if (this.mergeData.currentHeightIncrease >= this.mergeData.heightIncrease) {
      this.mergeInProgress = false
      objectA.delete()
      this.sceneSubjects = this.sceneSubjects.filter(subject => subject !== objectA)
    }
  }

  highlightSubject(subject) {
    if (this.highlightedSubject) {
      this.highlightedSubject.unhighlight()
    }

    if (subject) {
      subject.highlight()
      this.highlightedSubject = subject
    } else {
      this.highlightedSubject = null
    }
  }
}

export default SceneManager

goog.provide('app.Board')

goog.require('Constants')

app.Board = class Board {
  constructor(context) {
    this.context = context
    this.height = Constants.GRID_DIMENSIONS.UNIT_SIZE * Constants.GRID_DIMENSIONS.HEIGHT
    this.width = Constants.GRID_DIMENSIONS.UNIT_SIZE * Constants.GRID_DIMENSIONS.WIDTH
    this.ratio = Constants.GRID_DIMENSIONS.WIDTH / Constants.GRID_DIMENSIONS.HEIGHT
    this.context.style.height = `${this.height}px`
    this.context.style.width = `${this.width}px`
    this.cells = [...Array(Constants.GRID_DIMENSIONS.WIDTH)].map(
        e => [...Array(Constants.GRID_DIMENSIONS.HEIGHT)].map(
            el => []))

    if (Constants.DEBUG) {
      this.initDebugView()
    }

    this.onResize()
    window.addEventListener('resize', this.onResize.bind(this))
  }

  reset() {
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = 0; j < this.cells[i].length; j++) {
        this.cells[i][j] = []
      }
    }
  }

  onResize() {
    let container = document.getElementById('main')
    if (container) {
      let containerRatio = container.offsetWidth / container.offsetHeight
      if (containerRatio < this.ratio) {
        // top bottom letterboxing
        this.context.style.left = '0'
        this.context.style.top = '50%'
        this.context.style.transform = `scale(${container.offsetWidth / this.width}) translateY(-50%)`
      } else {
        // left right letterboxing
        this.context.style.left = '50%'
        this.context.style.top = '0'
        this.context.style.transform = `scale(${container.offsetHeight / this.height}) translateX(-50%)`
      }
    }
  }

  initDebugView() {
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = 0; j < this.cells[i].length; j++) {
        let debugCell = document.createElement('div')
        debugCell.setAttribute('class', 'debug-cell')
        debugCell.style.transform = `translate(${i * Constants.GRID_DIMENSIONS.UNIT_SIZE}px, ${j * Constants.GRID_DIMENSIONS.UNIT_SIZE}px)`
        this.context.append(debugCell)
      }
    }
  }

  updateDebugCell(x, y) {
    if (!Constants.DEBUG) {
      return
    }

    const index = x * Constants.GRID_DIMENSIONS.HEIGHT + y
    const debugCell = this.context.getElementsByClassName('debug-cell')[index]
    let names = ''
    for (const entity of this.cells[x][y]) {
      names += ' ' + entity.elem.classList
    }
    debugCell.textContent = names
  }

  updateEntityPosition(entity, oldX, oldY, newX, newY, width = 1, height = 1) {
    if (Math.round(oldX) != Math.round(newX) ||
        Math.round(oldY) != Math.round(newY)) {
      this.removeEntityFromBoard(entity, oldX, oldY, width, height)
      this.addEntityToBoard(entity, newX, newY, width, height)
    }
  }

  addEntityToBoard(entity, x, y, width = 1, height = 1) {
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    for (let i = roundedX; i < roundedX + width; i++) {
      for (let j = roundedY; j < roundedY + height; j++) {
        this.cells[i][j].push(entity)
        this.updateDebugCell(i, j)
      }
    }

    // console.log(this.cells)
  }

  removeEntityFromBoard(entity, x, y, width = 1, height = 1) {
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    for (let i = roundedX; i < roundedX + width; i++) {
      for (let j = roundedY; j < roundedY + height; j++) {
        let index = this.cells[i][j].indexOf(entity)
        if (index > -1) {
          this.cells[i][j].splice(index, 1)
          this.updateDebugCell(i, j)
        }
      }
    }

    // console.log(this.cells)
  }

  getEntitiesAroundPosition(entity) {
    const { x, y } = entity.position
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)

    // colocated entities
    const colocatedEntities = this.cells[roundedX][roundedY].filter(item => item !== entity)

    // around entities
    const offsetTrigger = 0.49

    const topY = Math.max(Math.round(y - offsetTrigger), 0)
    const rightX = Math.min(Math.round(x + offsetTrigger), Constants.GRID_DIMENSIONS.WIDTH - 1)
    const bottomY = Math.min(Math.round(y + offsetTrigger), Constants.GRID_DIMENSIONS.HEIGHT - 1)
    const leftX = Math.max(Math.round(x - offsetTrigger), 0)

    // Get blocking entities around
    // Only one entity can stop you right? So we can take the first item of the entities array [0]
    const topEntity = this.cells[roundedX][topY].filter(item => item.config.triggerAction === 'on-border')[0]
    const rightEntity = this.cells[rightX][roundedY].filter(item => item.config.triggerAction === 'on-border')[0]
    const bottomEntity = this.cells[roundedX][bottomY].filter(item => item.config.triggerAction === 'on-border')[0]
    const leftEntity = this.cells[leftX][roundedY].filter(item => item.config.triggerAction === 'on-border')[0]

    if (Constants.DEBUG) {
      if (this.lastCellInContact) {
        this.lastCellInContact.elem.style.opacity = 1
      }

      if (topEntity) {
        this.lastCellInContact = topEntity
      }

      if (rightEntity) {
        this.lastCellInContact = rightEntity
      }

      if (bottomEntity) {
        this.lastCellInContact = bottomEntity
      }

      if (leftEntity) {
        this.lastCellInContact = leftEntity
      }

      if (topEntity || rightEntity || bottomEntity || leftEntity) {
        this.lastCellInContact.elem.style.opacity = 0.5
      }
    }

    return {
      colocatedEntities,
      blockingEntities: {
        topEntity,
        rightEntity,
        bottomEntity,
        leftEntity,
      }
    }
  }
}
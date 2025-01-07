import { Entity } from '../../../engine/core/entity.js';
import { Circle, Rectangle } from '../../../engine/utils/collision-2d.js';

const { Math } = self.THREE;

/**
 * @constructor
 * @implements {EntityInterface}
 */
const EntityClass = Entity();

export class Tree extends EntityClass {
  constructor(tileIndex, position) {
    super();

    this.tileIndex = tileIndex;
    this.position = position;
    this.position.y += 15;
    this.static = true;
    this.uuid = Math.generateUUID();
    this.collider = null;
  }

  setup(game) {
    this.collider = Circle.allocate(14, this.position);
    //this.collider = Rectangle.allocate(24, 32, this.position);
  }

  teardown(game) {
    Circle.free(this.collider);
    this.collider = null;
  }
};

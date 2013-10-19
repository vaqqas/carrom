var Vqs = Vqs || {};

Vqs.b2Vec2 = Box2D.Common.Math.b2Vec2;
Vqs.b2BodyDef = Box2D.Dynamics.b2BodyDef;
Vqs.b2Body = Box2D.Dynamics.b2Body;
Vqs.b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
Vqs.b2Fixture = Box2D.Dynamics.b2Fixture;
Vqs.b2World = Box2D.Dynamics.b2World;
Vqs.b2MassData = Box2D.Collision.Shapes.b2MassData;
Vqs.b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
Vqs.b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
Vqs.b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
Vqs.b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;
Vqs.b2ContactListener = Box2D.Dynamics.b2ContactListener;

Vqs.b2Vec2.prototype.ScaleDown = function (scale) {
   this.x /= scale;
   this.y /= scale;
   return this;
};

Vqs.b2Vec2.prototype.ScaleBack = function (scale) {
   this.x *= scale;
   this.y *= scale;
   return this;
};

Vqs.bodyShape = {
   circle: "circle",
   box: "box"
};

Vqs.PhysicsWorld = function (intervalRate, gravity, width, height, scale) {
   this.intervalRate = parseInt(intervalRate);
   this.width = width;
   this.height = height;
   this.scale = scale;
   this.enableDebugDraw = false;
   this.subSteps = 2;
   this.velocityIterations = 8;
   this.positionIterations = 2;

   this.bodies = {};

   this.world = new Vqs.b2World(gravity, true /*allow inactive bodies to sleep*/);

   this.fixDef = new Vqs.b2FixtureDef;
   this.bodyDef = new Vqs.b2BodyDef;
};

Vqs.PhysicsWorld.prototype.update = function () {
	var start = Date.now();
	var stepRate = (start - this.lastTimestamp) / 1000;  //adaptive

	for (var i = 0; i < this.subSteps; i++) {
		this.world.Step(stepRate / this.subSteps, this.velocityIterations, this.positionIterations);
	}

	if (this.enableDebugDraw)
		this.world.DrawDebugData();

	this.world.ClearForces();
	this.lastTimestamp = Date.now();
};

Vqs.PhysicsWorld.prototype.getState = function () {
   var state = {};
   for (var b = this.world.GetBodyList(); b; b = b.m_next) {
      if (b.IsActive() && typeof b.GetUserData() !== 'undefined' && b.GetUserData() != null) {
         state[b.GetUserData()] = this.getBodyState(b);
      }
   }
   return state;
};

Vqs.PhysicsWorld.prototype.getBodyState = function (b) {
   return {
      position: (new Vqs.b2Vec2(b.GetPosition().x, b.GetPosition().y)).ScaleBack(this.scale),
      angle: b.GetAngle(),
      center: (new Vqs.b2Vec2(b.GetWorldCenter().x, b.GetWorldCenter().y)).ScaleBack(this.scale),
      isStationary: (b.GetLinearVelocity().Length() == 0)
   };
};

Vqs.PhysicsWorld.prototype.SetBodies = function (bodyInfoList) {
	for (var id in bodyInfoList) {
		//this.bodies[id] = this.CreateBody(bodyInfoList[id]);
		this.SetBody(bodyInfoList[id]);
	}
};

Vqs.PhysicsWorld.prototype.SetBody = function (bodyInfo) {
	if (this.bodies[bodyInfo.id]) {
		//this.placeBody(bodyInfo.id, bodyInfo.position);
		//remove if this body already exists
		//this.world.DestroyBody(this.bodies[bodyInfo.id]);
		//delete this.bodies[bodyInfo.id];
	}
	else
		this.bodies[bodyInfo.id] = this.CreateBody(bodyInfo);
};

Vqs.PhysicsWorld.prototype.CreateBody = function (bodyInfo) {
   //bodyDef.fixedRotation = true;
   this.bodyDef.angularDamping = bodyInfo.material.angularDamping;
   this.bodyDef.linearDamping = bodyInfo.material.linearDamping;
   this.bodyDef.position = bodyInfo.position.ScaleDown(this.scale);
   this.bodyDef.userData = bodyInfo.id;
   this.bodyDef.angle = bodyInfo.angle;
   this.bodyDef.bullet = bodyInfo.material.isBullet;
   this.bodyDef.type = bodyInfo.b2BodyType;

   this.fixDef.density = bodyInfo.material.density;
   this.fixDef.friction = bodyInfo.material.friction;
   this.fixDef.restitution = bodyInfo.material.restitution;

   var body = this.world.CreateBody(this.bodyDef);
   switch (bodyInfo.shape) {
      case Vqs.bodyShape.circle:
         this.fixDef.shape = new Vqs.b2CircleShape(bodyInfo.radius / this.scale);
         break;

      case Vqs.bodyShape.box:
         this.fixDef.shape = new Vqs.b2PolygonShape;
         this.fixDef.shape.SetAsBox(bodyInfo.width / this.scale / 2, bodyInfo.height / this.scale / 2);
         break;
   }

   body.CreateFixture(this.fixDef);
   return body;
};

Vqs.PhysicsWorld.prototype.applyImpulse = function (bodyId, angle, power) {
	var body = this.bodies[bodyId];
	if (body) {
		body.ApplyImpulse(new Vqs.b2Vec2(Math.cos(angle) * power, //impulse in direction - x
                                 Math.sin(angle) * power), //impulse in direction - y
                                 body.GetWorldCenter());
	}
	else 
		throw "body " + id + " doesn't exists in the physics";
};

Vqs.PhysicsWorld.prototype.debugDraw = function (enable, context) {
   this.enableDebugDraw = enable;
   if (enable) {
      var debugDraw = new Vqs.b2DebugDraw();
      debugDraw.SetSprite(context);
      debugDraw.SetDrawScale(this.scale);
      debugDraw.SetFillAlpha(0.3);
      debugDraw.SetLineThickness(1.0);
      debugDraw.SetFlags(Vqs.b2DebugDraw.e_shapeBit | Vqs.b2DebugDraw.e_jointBit);
      this.world.SetDebugDraw(debugDraw);
   }
};

Vqs.PhysicsWorld.prototype.removeBody = function (id) {
	if (this.bodies[id]) {
		this.world.DestroyBody(this.bodies[id]);
		delete this.bodies[id];
	}
	else
		throw "body " + id + " doesn't exists in the physics";
};

Vqs.PhysicsWorld.prototype.placeBody = function(bid, pos){
  	if (this.bodies[bid])
  		this.bodies[bid].SetPositionAndAngle(new Vqs.b2Vec2(pos.x, pos.y).ScaleDown(this.scale), 0);
  	else
  		throw "body " + bid + " doesn't exists in the physics";
};
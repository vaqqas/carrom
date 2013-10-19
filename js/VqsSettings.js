/*
Copyright 2013 M. Vaqqas
*/
function Material(density, friction, restitution, angularDamping, linearDamping, b2BodyType, isBullet) {
	this.density = density || 0; //ivory= 1.8 to 1.9, oak wood= 0.6 to 0.9, pine= 0.5 to 0.6
	this.friction = friction || 0;
	this.restitution = restitution || 0;
	this.angularDamping = angularDamping || 0;
	this.linearDamping = linearDamping || 0;
	this.b2BodyType = b2BodyType || Vqs.b2Body.b2_staticBody;
	this.isBullet = isBullet || false;
};

var PieceMaterial = new Material;
PieceMaterial.density = 0.9;
PieceMaterial.friction = 0.5;
PieceMaterial.restitution = 0.8;
PieceMaterial.angularDamping = 1.5;
PieceMaterial.linearDamping = 2.2;
PieceMaterial.b2BodyType = Vqs.b2Body.b2_dynamicBody;
PieceMaterial.isBullet = true;

var BoarderMaterial = new Material;
BoarderMaterial.density = 0.9;
BoarderMaterial.friction = 0.4;
BoarderMaterial.restitution = 0.9;

var StrikerMaterial = new Material;
StrikerMaterial.density = 1.2;
StrikerMaterial.friction = 0.5;
StrikerMaterial.restitution = 0.8;
StrikerMaterial.angularDamping = 1.5;
StrikerMaterial.linearDamping = 1.9;
PieceMaterial.b2BodyType = Vqs.b2Body.b2_dynamicBody;
StrikerMaterial.isBullet = true;

var Settings = {
	strikerColor: "BlueViolet",
	queenColor: "#FF0040",
	whiteManColor: "#FBFBEF",
	blackManColor: "Gray",//"#2E2E2E",
	strikerRadius: 13,
	pieceRadius: 10,
	//aimLineColor: 'LightGray',
	strikerHomePosition: new Vqs.b2Vec2(250, 404),
	queenHomePosition: new Vqs.b2Vec2(250, 250),
	strikerLeftMostX: 147,
	strikerRightMostX: 353,
	strikerTopMostY: 401,
	strikerBottomMostY: 407,
	strikerLeftCircleX: 125,
	strikerRightCircleX: 375,
	boardBorderWidth: 24,
	pocketRadius: 16,
	scale: 30, //Box2d multiplier to convert meters into pixels
	boardHeight: 500,
	borderWidth: 23,
	strikingPowerDefault: 50,
	aimingLineOpacity: 0.18,
	pieceCount: 6
};

var PieceType = {
	striker: 'Striker',
	white: 'White',
	black: 'Black',
	queen: 'Queen'
};

var TurnColor = {
	black: PieceType.black, //black piece should be pocketed
	white: PieceType.white, //white piece should be pocketed
	free: 'Free' //any piece can be pocketed. Black=10 points, White=20 points
};

function Player(turnColor, name) {
	this.color = turnColor;
	this.name = name;
	this.score = 0;
	this.hasQueen = false;
}

var GameState = {
	aiming: "aim",
	positioning: "pos",
	running: "run",
	shoot: "shoot",
	stopped: "stopped"
};

var PieceState = {
	out: "out",
	inGame: "in"
};

window.requestAnimFrame = (function (callback) {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function (callback) {
			window.setTimeout(callback, 1000 / 60);
		};
})();

Vqs.b2ContactListener.prototype.PreSolve = function (contact, oldManifold) {
	//document.getElementById("Sound").innerHTML += "bing!!";
};

var sounds = {
	singleHit: new Audio("./sounds/hit.wav")
};

function RulesResult() {
	this.piecesToPutBack = new Array();
	this.switchStrike = false;
	this.winner = null;
	this.putBackQueen = false;
	this.foul = false;
	this.queenPocketed = false;
}

Vqs.b2ContactListener.prototype.BeginContact = function (contact) {
	setTimeout(function () {
		var audio = new Audio("./sounds/hit.wav");
		audio.play();
		delete audio;
	});
};
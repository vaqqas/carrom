/*
Copyright 2013 M. Vaqqas
*/
function line(p1, p2, width, color, opacity) {
	this.start = p1;
	this.end = p2;
	this.width = width || 1;
	this.color = color || "Black";
	this.opacity = opacity || 1;

	this.draw = function (context) {
		context.save();
		context.beginPath();
		context.moveTo(this.start.x, this.start.y);
		context.lineTo(this.end.x, this.end.y);
		context.strokeStyle = this.color;
		context.globalAlpha = this.opacity;
		context.lineWidth = this.width;
		context.stroke();
		context.restore();
	}
}

function Entity(that, id, b2BodyType, position, angle, shape, material) {
	that.id = id || "";
	that.b2BodyType = b2BodyType || Vqs.b2Body.b2_staticBody;
	that.position = position ? new Vqs.b2Vec2(position.x, position.y) : new Vqs.b2Vec2(0, 0);
	that.shape = shape || Vqs.bodyShape.box;
	that.angle = angle || 0;
	that.material = material || PieceMaterial;
}

function Boundary(id, position, angle) {
	Entity(this, id, Vqs.b2Body.b2_staticBody, position, angle, Vqs.bodyShape.box, BoarderMaterial);
	//this.base(id, Vqs.b2Body.b2_staticBody, position, angle, Vqs.bodyShape.box, BoarderMaterial);
	this.width = Settings.borderWidth;
	this.height = Settings.boardHeight;
}
//Boundary.prototype = new Entity();
//Boundary.prototype.base = Entity;

function Piece(that, id, position, material, type, color) {
	Entity(that, id, Vqs.b2Body.b2_dynamicBody, position, 0, Vqs.bodyShape.circle, material);
	//this.base(id, Vqs.b2Body.b2_dynamicBody, position, 0, Vqs.bodyShape.circle, material);
	that.radius = Settings.pieceRadius;
	that.type = type || PieceType.black;
	that.color = color || Settings.blackManColor;
	//that.state = PieceState.inGame;
	that.isInPocket = false;

	that.draw = function (ctx) {
		//if (that.state != PieceState.inGame)
		if( that.isInPocket )
			return;

		//ctx.save();
		ctx.beginPath();
		ctx.arc(that.position.x, that.position.y, that.radius, 0, Math.PI * 2, true); // Outer circle
		ctx.fillStyle = that.color;
		//ctx.strokeStyle = "White";
		//ctx.stroke();
		ctx.fill();
		//ctx.restore();

		//document.getElementById("strikerPos").innerHTML = "Striker Position: " + that.position.x + ", " + that.position.y;
	};

	that.update = function (state) {
		that.position = state.center; //postion is same as its center for a circle
		that.angle = state.angle;
	}
}
//Piece.prototype = new Entity();
//Piece.prototype.base = Entity;

function BlackPiece(id, position) {
	Piece(this, id, position, PieceMaterial, PieceType.black, Settings.blackManColor);
}
//BlackPiece.prototype = new Piece();
//BlackPiece.prototype.base = Piece;

function WhitePiece(id, position) {
	Piece(this, id, position, PieceMaterial, PieceType.white, Settings.whiteManColor);
}
//WhitePiece.prototype = new Piece();
//WhitePiece.prototype.base = Piece;

function Queen(id, position) {
	Piece(this, id, position, PieceMaterial, PieceType.queen, Settings.queenColor);
}
//Queen.prototype = new Piece();
//Queen.prototype.base = Piece;

function Striker(id, position) {
	Piece(this, id, position, StrikerMaterial, PieceType.striker, Settings.strikerColor);
	this.radius = Settings.strikerRadius;
}
//Striker.prototype = new Piece();
//Striker.prototype.base = Piece;

function Board() {
	this.state = GameState.aiming;
	this.canvas = document.getElementById('canvasCarrom');
	this.ctx = document.getElementById('canvasCarrom').getContext('2d');
	this.bgctx = document.getElementById('canvasBackground').getContext('2d');
	this.msgCtx = document.getElementById('canvasMessages').getContext('2d');
	this.scoreCard1 = document.getElementById('player1Score');
	this.scoreCard2 = document.getElementById('player2Score');
	this.messageBoard = document.getElementById('spanMessages');
	this.noMovement = true;

	//this.strikerImage = document.getElementById("strikerImage"); //striker image
	//this.cursors = new Cursors("canvasCarrom");

	//load and draw the background image
	this.bgImage = document.getElementById("bgBoardImage"); //bacground board image
	this.bgctx.clearRect(0, 0, this.bgctx.canvas.width, this.bgctx.canvas.height);
	this.bgctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);

	this.mousePosition = new Vqs.b2Vec2(0, 0);
	this.aimLine = null;

	//////init the physics world/////
	var gravity = new Vqs.b2Vec2(0, 0); //zero gravity
	this.PhysicsWorld = new Vqs.PhysicsWorld(60, gravity, this.canvas.width, this.canvas.height, Settings.scale);

	this.pieces = {};
	this.strikingAngle = 3 * Math.PI / 2; //270 deg
	this.strikingPower = Settings.strikingPowerDefault;

	this.obstructingPieces = new Array();

	this.strikerId = "S1";
	this.queenId = "Q1";
	this.createStriker();
	this.createQueen();

	///////////////generate rest of the pieces////////////////
	var count = 2, angle = 0, i, row, pos; //count=2 as two pieces (striker and queen) are already there
	var basePos = new Vqs.b2Vec2(Settings.queenHomePosition.x + Settings.pieceRadius * 2, Settings.queenHomePosition.y);
	for (row = 1; row <= 2 && count < Settings.pieceCount; row++) {
		pos = basePos;
		for (i = 1; i <= 6 * row && count < Settings.pieceCount; i++) {
			var prefix = (i % 2 == 0) ? TurnColor.black : TurnColor.white;
			var id = prefix + (count - 2);
			var piece = (i % 2 == 0) ? new BlackPiece(id, pos) : new WhitePiece(id, pos);
			this.pieces[id] = piece;
			count++;
			angle += (60 / row);
			pos = Vqs.Geometry.Rotate(Settings.queenHomePosition, basePos, angle);			
		}
		basePos = new Vqs.b2Vec2(basePos.x + Settings.pieceRadius * 2, basePos.y);
	}

	/////////generate boundaries///////////////////
	this.boundaries = {};
	var d = Settings.borderWidth / 2;
	this.boundaries["Bound0"] = new Boundary("Bound0", new Vqs.b2Vec2(Settings.boardHeight - d, Settings.queenHomePosition.y), 0);
	this.boundaries["Bound1"] = new Boundary("Bound1", new Vqs.b2Vec2(d, Settings.queenHomePosition.y), 0);
	this.boundaries["Bound2"] = new Boundary("Bound2", new Vqs.b2Vec2(Settings.queenHomePosition.x, d), Math.PI / 2);
	this.boundaries["Bound3"] = new Boundary("Bound3", new Vqs.b2Vec2(Settings.queenHomePosition.x, Settings.boardHeight - d), Math.PI / 2);

	this.setupPhysics = function (enableDebugDraw) {
		//setup the physics
		this.PhysicsWorld.SetBodies(this.boundaries);
		this.PhysicsWorld.SetBodies(this.pieces);
		this.PhysicsWorld.debugDraw(enableDebugDraw, this.ctx);
	};

	/////////////Create Pockets//////////////
	/*pockets positions on the board:
	+---+---+
	| A | B |
	+---+---+
	| D | C |
	+---+---+
	*/
	var p = Settings.borderWidth + Settings.pocketRadius;
	var q = Settings.boardHeight - p;
	this.pockets = {
		A: new Vqs.b2Vec2(p, p),	//left top
		B: new Vqs.b2Vec2(q, p),	//right top
		C: new Vqs.b2Vec2(q, q),	//right bottom
		D: new Vqs.b2Vec2(p, q)		//left bottom
	};

	this.players = {};
	this.players[1] = new Player(TurnColor.white, "player 1");
	this.players[2] = new Player(TurnColor.black, "player 2");
	this.turn = 1;

	this.queenNeedsCover = false;
	//this.queenPocketed = false;
	this.piecesPocketed = {};

	this.displayMessage("Strike: " + this.players[this.turn].name);
}

//////check if a piece has been pocketed/////
Board.prototype.isInPocket = function (pos) {
	var pocket;
	if (pos.x >= Settings.queenHomePosition.x) {
		if (pos.y >= Settings.queenHomePosition.y) {
			pocket = this.pockets.C;
		}
		else {
			pocket = this.pockets.B;
		}
	}
	else {
		if (pos.y >= Settings.queenHomePosition.y) {
			pocket = this.pockets.D;
		}
		else {
			pocket = this.pockets.A;
		}
	}

	var distance = Vqs.Geometry.GetDistance(pos, pocket);
	return distance < Settings.pocketRadius;
};

////Update/////////////////
Board.prototype.update = function () {
	this.PhysicsWorld.update(); //simulate the physics
	var worldState = this.PhysicsWorld.getState(); //get the lattest state of bodies
	this.noMovement = true;
	//this.queenPocketed = false;

	for (var id in worldState) {
		if (this.pieces.hasOwnProperty(id) && this.pieces[id]) {
			var pieceState = worldState[id];

			var radius = Settings.pieceRadius;
			if (id == this.strikerId)
				radius = Settings.strikerRadius;

			//check if the piece has been pocketed
			if (this.state == GameState.running && !this.pieces[id].isInPocket && this.isInPocket(pieceState.center)) {
				this.pieces[id].isInPocket = true;
				this.PhysicsWorld.removeBody(id);
				this.piecesPocketed[id] = this.pieces[id];

//				if (id == this.queenId)
//					this.queenPocketed = true;

				//delete this.pieces[id];

				this.noMovement = this.noMovement && true; //just for the sake of clarity
			}
			else {
				this.pieces[id].update(pieceState);
				this.noMovement = this.noMovement && pieceState.isStationary;
			}
		}
	}

	if (this.noMovement && this.state == GameState.running) {
		var result = applyRules(this.players, this.pieces, this.turn, this.piecesPocketed, this.queenNeedsCover);
		this.prepareForNextShot(result);
	}
};

Board.prototype.prepareForNextShot = function (result) {

	this.displayScores();

	if (result.winner != null) {
		this.stopGame(result.winner)
		return;
	}

	this.queenNeedsCover = result.queenPocketed;

	if (result.putBackQueen) {
		this.putBackQueen();
		this.queenNeedsCover = false;
	}

//	if (result.foul) {
//		this.displayMessage("foul!!");
//	}

	if (result.piecesToPutBack.length > 0)
		this.putBackPieces(result.piecesToPutBack);

	if (result.switchStrike)
		this.switchStrike();

	this.piecesPocketed = {};
	this.putBackStriker();
	this.state = GameState.aiming;
};

Board.prototype.stopGame = function (winner) {
	alert(winner.name + " Won the Game by " + winner.score + " points!!");
	this.state = GameState.stopped;
};

Board.prototype.putBackPieces = function (piecesToPutBack) {
	for (var i = 0; i < piecesToPutBack.length; i++ ) {
		this.putBackPiece(piecesToPutBack[i]);
	}
};

Board.prototype.switchStrike = function () {
	this.turn = (this.turn == 1) ? 2 : 1;
	this.displayMessage("Strike " + this.players[this.turn].name);
};

Board.prototype.displayScores = function () {
	this.scoreCard1.innerHTML = this.players[1].score + (this.players[1].hasQueen ? "+Q" : "");
	this.scoreCard2.innerHTML = this.players[2].score + (this.players[2].hasQueen ? "+Q" : "");
};

Board.prototype.displayMessage = function (message) {
	this.messageBoard.innerHTML = message;
};

applyRules = function (players, pieces, turn, piecesPocketed, queenNeedsCover) {
	var player = players[turn];
	var otherPlayer = players[(turn == 1 ? 2 : 1)];

	var result = new RulesResult();
	var score = 0;
	var otherPlayerScore = 0;
	var queenPocketed = false;

	for (var id in piecesPocketed) {
		if (id && piecesPocketed.hasOwnProperty(id) && piecesPocketed[id]) {
			switch (piecesPocketed[id].type) {
				case PieceType.striker:
					result.foul = true;
					break;
				case PieceType.queen:
					queenPocketed = true;
					break;
				case PieceType.white:
					if (player.color == TurnColor.white)
						score++;
					else
						otherPlayerScore++;
					break;
				case PieceType.black:
					if (player.color == TurnColor.black)
						score++;
					else
						otherPlayerScore++;
					break;
			}
		}
	}

	//if no piece or queen is pocketed the you lose the turn
	result.switchStrike = (score == 0) && !queenPocketed;

	if (!result.foul) {
		if (queenNeedsCover) { //if queen is waiting for a cover
			if (score > 0 && otherPlayerScore == 0) //cover is provided
				player.hasQueen = true;
			else //cover not provided
				result.putBackQueen = true; //put the queen back in game
		}
		else if (queenPocketed && score > 0 && otherPlayerScore == 0) { //queen and cover in same shot!!
			player.hasQueen = true;
		}

		//payback time if you own a penalty
		if (player.score < 0 && score > 0) {
			for (var id in piecesPocketed) {
				if (id && piecesPocketed.hasOwnProperty(id) && piecesPocketed[id]
						&& piecesPocketed[id].type == player.color) {
					result.piecesToPutBack.push(id);
					player.score++;
					score--;
					if (player.score == 0 || score == 0)
						break;
				}
			}
		}

		player.score += score;
	}
	else { //if you pocket your striker
		if (queenNeedsCover || queenPocketed)
			result.putBackQueen = true; //then you have to putback the queen

		for (var id in piecesPocketed) { //putback all the pieces you pocketed in this shot
			if (id && piecesPocketed.hasOwnProperty(id) && piecesPocketed[id]
					&& piecesPocketed[id].type == player.color)
				result.piecesToPutBack.push(id);
		}

		//and putback an extra piece which was pocketed earlier
		if (player.score > 0) {
			for (var id in pieces) { //putback all the pieces you pocketed in this shot
				if (id && pieces.hasOwnProperty(id) && pieces[id]
						&& pieces[id].type == player.color && pieces[id].isInPocket
						&& !result.piecesToPutBack.contains(id)) { //not already in putback list
					result.piecesToPutBack.push(id);
					break;
				}
			}
		}

		player.score--;
	}

	//payback for the other player if he owns a penalty and you scored for him
	if (otherPlayer.score < 0 && otherPlayerScore > 0) {
		for (var id in piecesPocketed) {
			if (id && piecesPocketed.hasOwnProperty(id) && piecesPocketed[id]
						&& piecesPocketed[id].type == otherPlayer.color) {
				result.piecesToPutBack.push(id);
				otherPlayer.score++;
				otherPlayerScore--;
				if (otherPlayer.score == 0 || otherPlayerScore == 0)
					break;
			}
		}
	}
	otherPlayer.score += otherPlayerScore;

	var maxScore = (Settings.pieceCount - 2) / 2;

	if (otherPlayer.score >= maxScore) {
		if (otherPlayer.hasQueen)
			otherPlayer.score += 3; //credit the score of the queen to the winner
		result.winner = otherPlayer;
	}
	else if (player.score >= maxScore) {
		if (player.hasQueen) {
			player.score += 3; //credit the score of the queen to the winner
			result.winner = player;
		}
		else if (otherPlayer.hasQueen)
			result.winner = player;
		else //God forbid!! you left thee queen unpocketed
			result.winner = otherPlayer
	}

	//update the scores for the winner
	if (result.winner != null) {
		var loser = (result.winner.name == player.name) ? otherPlayer : player;
		result.winner.score += (maxScore - loser.score); //remaining pieces of the opponent go to the winner's pocket

		if (result.winner.score <= 0)
			result.winner.score = 1;

		loser.score = 0;
	}

	result.queenPocketed = queenPocketed;
	return result;
};

////update the list of pieces of list that might be blocking the striker
Board.prototype.updateObstructingPieces = function () {
	this.obstructingPieces = new Array(); //initialize the array

	for (var id in this.pieces) {
		if (id && id != this.strikerId && this.pieces.hasOwnProperty(id) && this.pieces[id] && !this.pieces[id].isInPocket ){// this.pieces[id].state == PieceState.inGame) {
			var inRegion = Vqs.Geometry.IsInRegion(this.pieces[id].position,
								Settings.strikerLeftCircleX - Settings.strikerRadius - Settings.pieceRadius,
								Settings.strikerRightCircleX + Settings.strikerRadius + Settings.pieceRadius,
								Settings.strikerTopMostY - Settings.strikerRadius - Settings.pieceRadius,
								Settings.strikerBottomMostY + Settings.strikerRadius + Settings.pieceRadius);
			if (inRegion) {
				this.obstructingPieces.push(id);
			}
		}
	}
};

///create queen and striker/////////
Board.prototype.createStriker = function () {
	this.pieces[this.strikerId] = new Striker(this.strikerId, Settings.strikerHomePosition);
	//this.pieces[this.strikerId] = this.pieces[this.strikerId];
	this.PhysicsWorld.SetBody(this.pieces[this.strikerId]);
}

Board.prototype.putBackStriker = function () {
	if (this.pieces[this.strikerId])
		delete this.pieces[this.strikerId];

	this.createStriker();

	var newPos = Settings.strikerHomePosition;
	this.updateObstructingPieces();

	if (!this.strikerPositionValid(newPos)) {
		var x = Settings.strikerLeftMostX;
		var stop = false;
		while (x <= Settings.strikerRightMostX) {
			var y = Settings.strikerTopMostY;
			while (y <= Settings.strikerBottomMostY) {
				newPos = new Vqs.b2Vec2(x, y);
				if (this.strikerPositionValid(newPos)) {
					stop = true;
					break;
				}
				y++;
			}
			if (stop)
				x = Settings.strikerRightMostX;
			x++;
		}
	}

	this.PhysicsWorld.placeBody(this.strikerId, newPos);
	this.pieces[this.strikerId].isInPocket = false;
	//this.state = GameState.aiming;
};

Board.prototype.createQueen = function () {
	this.pieces[this.queenId] = new Queen(this.queenId, Settings.queenHomePosition);
	this.PhysicsWorld.SetBody(this.pieces[this.queenId]);
};

Board.prototype.getNewPositionAtCenter = function (id) {
	var newPos = new Vqs.b2Vec2(Settings.queenHomePosition.x, Settings.queenHomePosition.y);
	//mark(this.ctx, newPos);

	if (!this.piecePositionValid(id, newPos)) {
		var row = 0;
		var basePos = new Vqs.b2Vec2(newPos.x + 5, newPos.y);
		var found = false;
		while (!found) {
			row++;
			var angle = 0;
			while (!found && angle < 360) {
				angle += (30 / row);
				newPos = Vqs.Geometry.Rotate(Settings.queenHomePosition, basePos, angle);
				//mark(this.ctx, newPos);
				if (this.piecePositionValid(id, newPos))
					found = true;
			}
			basePos.x += 5;
		}
	}

	return newPos;
}

////put back the piece into the game
Board.prototype.putBackPiece = function (pieceId) {
	if (!pieceId || pieceId == null || !this.pieces[pieceId] || this.pieces[pieceId] == null)
		throw new Error("piece not in the list:" + pieceId);

	//this.pieces[pieceId] = this.createPiece(pieceId);
	this.pieces[pieceId].isInPocket = false;
	this.pieces[pieceId].position = this.getNewPositionAtCenter(pieceId);
	this.PhysicsWorld.SetBody(this.pieces[pieceId]);
};

//Board.prototype.createPiece = function (pieceId) {
//	var prefix = pieceId.charAt(0);
//	if (prefix == TurnColor.white)
//		return new WhitePiece(pieceId, new Vqs.b2Vec2(0, 0));
//	else
//		return new BlackPiece(pieceId, new Vqs.b2Vec2(0, 0));

//	throw new Error("invalid pieceId: " + pieceId);
//}

////put back the queen into the game
Board.prototype.putBackQueen = function () {
	if (this.pieces[this.queenId] )
		delete this.pieces[this.queenId];

	this.createQueen();

	this.pieces[this.queenId].isInPocket = false;
	var newPos = this.getNewPositionAtCenter(this.queenId);
	this.PhysicsWorld.placeBody(this.queenId, newPos);
};

//////Check if queen will be overlapping another piece at the new position
Board.prototype.piecePositionValid = function(pieceId, newPos) {
	var willOverlap = false;
	var newPieceCircle = new Vqs.Geometry.Circle(newPos, Settings.pieceRadius);
	for (var id in this.pieces) {
		if (id && id != pieceId && this.pieces.hasOwnProperty(id) && this.pieces[id] && this.pieces[id].isInPocket == false){//&& this.pieces[id].state == PieceState.inGame) {
			var pieceCircle = new Vqs.Geometry.Circle(this.pieces[id].position, this.pieces[id].radius);
			willOverlap = Vqs.Geometry.CirclesOverlapping(pieceCircle, newPieceCircle);
			if (willOverlap)
				break;
		}
	}

	return !willOverlap;
};

function mark (ctx, pos, radius) {
	//ctx.save();
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2, true); // Outer circle
	//ctx.fillStyle = "White";
	ctx.strokeStyle = "White";
	ctx.stroke();
	//ctx.fill();
	//ctx.restore();

	//document.getElementById("strikerPos").innerHTML = "Striker Position: " + that.position.x + ", " + that.position.y;
};

/////Score///////////////////////////////////
//Board.prototype.updateScore = function (id) {
//	if (this.pieces[id]) {
//		this.putBackPiece(id);
//	}
//};

//////Draw the board onto the canvas/////////////////
Board.prototype.draw = function () {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	//if (this.strikerImage.ready)
	//this.ctx.drawImage(this.strikerImage, 240, Settings.strikerHomePosition, 25, 25);

	//this.pieces[this.strikerId].draw(this.ctx);
	for (var id in this.pieces) {
		if (this.pieces.hasOwnProperty(id) && this.pieces[id]) {
			var p = this.pieces[id];
			if (p && !p.isInPocket)
				p.draw(this.ctx);
		}
	}
	if (this.aimLine != null && this.state == GameState.aiming) {
		this.aimLine.draw(this.ctx);
	}

//	mark(this.ctx, this.pockets.C, Settings.pocketRadius);
//	mark(this.ctx, this.pockets.A, Settings.pocketRadius);
//	mark(this.ctx, this.pockets.B, Settings.pocketRadius);
//	mark(this.ctx, this.pockets.D, Settings.pocketRadius);
};

////check if cursor is on striker///////////////////
Board.prototype.cursorOnStriker = function () {
	if (!this.pieces[this.strikerId])
		return false;

	var sx = this.pieces[this.strikerId].position.x;
	var sy = -this.pieces[this.strikerId].position.y;
	var mx = this.mousePosition.x;
	var my = -this.mousePosition.y;

	var r = this.pieces[this.strikerId].radius;

	if (Math.pow((sy - my), 2) + Math.pow((sx - mx), 2) < Math.pow(r, 2))
		return true;
	return false;
};

////Let the player aim/////////////
Board.prototype.aim = function () {
	if (this.state != GameState.aiming || !this.pieces[this.strikerId])
		return;

	var line = Vqs.Geometry.GetAimingLine(this.pieces[this.strikerId].position, this.mousePosition, this.canvas.width, this.canvas.height);
	if (line != null) {
		line.color = Settings.strikerColor;
		line.opacity = Settings.aimingLineOpacity;
		line.width = Settings.strikerRadius * 2;
		this.aimLine = line;
	}

	this.strikingAngle = Vqs.Geometry.GetAngle(this.pieces[this.strikerId].position, this.mousePosition);
	//document.getElementById("aimingAngle").innerHTML = "Angle: " + Vqs.Geometry.ToDegree(this.strikingAngle)
};

////place the striker on the board/////////////
Board.prototype.placeStriker = function () {
	if (this.state != GameState.positioning || !this.pieces[this.strikerId] || this.pieces[this.strikerId].isInPocket)
		return;

	var newPos = new Vqs.b2Vec2(0, 0);
	if (this.mousePosition.x <= Settings.strikerLeftCircleX)
		newPos.x = Settings.strikerLeftCircleX;
	else if (this.mousePosition.x >= Settings.strikerRightCircleX)
		newPos.x = Settings.strikerRightCircleX;
	else if (this.mousePosition.x < Settings.strikerLeftMostX)
		newPos.x = Settings.strikerLeftMostX;
	else if (this.mousePosition.x > Settings.strikerRightMostX)
		newPos.x = Settings.strikerRightMostX;
	else
		newPos.x = this.mousePosition.x;

	if (this.mousePosition.y > Settings.strikerBottomMostY)
		newPos.y = Settings.strikerBottomMostY;
	else if (this.mousePosition.y < Settings.strikerTopMostY)
		newPos.y = Settings.strikerTopMostY;
	else
		newPos.y = this.mousePosition.y;

	this.updateObstructingPieces();
	if (this.strikerPositionValid(newPos))
		this.pieces[this.strikerId].position = newPos;

	this.PhysicsWorld.placeBody(this.strikerId, this.pieces[this.strikerId].position);
};

Board.prototype.strikerPositionValid = function (newPos) {
	var willOverlap = false;
	var strikerCircle = new Vqs.Geometry.Circle(newPos, this.pieces[this.strikerId].radius);

	//check if striker will be overlapping another piece at new position
	for (var i = 0; i < this.obstructingPieces.length; i++) {
		var id = this.obstructingPieces[i];
		if (this.pieces[id]) {
			var pieceCircle = new Vqs.Geometry.Circle(this.pieces[id].position, this.pieces[id].radius);
			willOverlap = Vqs.Geometry.CirclesOverlapping(pieceCircle, strikerCircle);
			if (willOverlap)
				break;
		}
	}

	return !willOverlap;
};

Board.prototype.go = function () {
	if (this.state != GameState.shoot)
		return;

	//document.getElementById("message").innerHTML = "<br /> Go!!";
	if (this.noMovement && this.state == GameState.shoot) {
		this.PhysicsWorld.applyImpulse(this.strikerId, this.strikingAngle, this.strikingPower);
	}
	this.state = GameState.running;
};

function waitInit() {
	setTimeout(init, 20000);
}

function play(board) {
	if (board.state != GameState.stopped) {
		board.aim();
		board.placeStriker();
		board.go();
		board.update();
		board.draw();
		requestAnimFrame(function () { play(board); });
	}
}

function init() {
	var board = new Board();
	var mainDiv = document.getElementById('mainDiv');
	mainDiv.addEventListener("mousemove", function (event) { onMouseMove(event, board); }, false);
	mainDiv.addEventListener("mouseup", function (event) { onMouseUp(event, board); }, false);
	mainDiv.addEventListener("mousedown", function (event) { onMouseDown(event, board); }, false);

	var rangePower = document.getElementById('rngStrikingPower');
	var rangePowerOutput = document.getElementById('rngStrikingPower_output');
	rangePower.value = Settings.strikingPowerDefault;
	rangePowerOutput.value = rangePower.value;
	
	rangePower.addEventListener("change", function (event) {
		board.strikingPower = rangePower.value;
		rangePowerOutput.value = rangePower.value;
	}, false);

	board.setupPhysics(true); //with degug draw
	//board.draw();  ///first test with debug draw then test the actual draw

	//setInterval(function () { play(board); }, 1);
	//setTimeout(function () {
	play(board);
	//}, 100);
}

function onMouseMove(event, board) {
	board.start = true;
	var rect = board.canvas.getBoundingClientRect();

	if (event.clientX < rect.left)
		board.mousePosition.x = 0;
	else {
		board.mousePosition.x = event.clientX - rect.left;
		if (board.mousePosition.x > board.canvas.width)
			board.mousePosition.x = board.canvas.width;
	}

	if (event.clientY < rect.top)
		board.mousePosition.y = 0;
	else {
		board.mousePosition.y = event.clientY - rect.top;
		if (board.mousePosition.y > board.canvas.height)
			board.mousePosition.y = board.canvas.height;
	}

	//if (board.cursorOnStriker())
	//   board.cursors.set(CursorNames.open, new  Vqs.b2Vec2(event.clientX, event.clientY));

	//document.getElementById("mousePos").innerHTML = "Mouse Position: " + board.mousePosition.x + ", " + board.mousePosition.y;
	//document.getElementById("message").innerHTML = "Cursor Over Striker: " + board.cursorOnStriker();
}

function onMouseUp(event, board) {
	if (board.state == GameState.aiming) {
		board.state = GameState.shoot;
		//board.cursors.set(CursorNames.afterShot, new  Vqs.b2Vec2(event.clientX, event.clientY));
	}
	else if (board.state == GameState.positioning) {
		board.state = GameState.aiming;
		//board.cursors.set(CursorNames.aim, new  Vqs.b2Vec2(event.clientX, event.clientY));
	}
}

function onMouseDown(event, board) {
	if (board.state == GameState.aiming && board.cursorOnStriker()) {
		board.state = GameState.positioning;
		//board.cursors.set(CursorNames.grab, event.position);
	}
}

function restart() {
	if (confirm("Do you wish to restart the game?") == true)
		init();
}
var Vqs = Vqs || {};
Vqs.Geometry = Vqs.Geometry || {};

Vqs.Geometry.Circle = function (center, radius) {
	this.center = new Vqs.b2Vec2(center.x, center.y);
	this.radius = radius;
};

Vqs.Geometry.CirclesOverlapping = function (c1, c2) {
	var d = Vqs.Geometry.GetDistance(c1.center, c2.center);
	if (d <= (c1.radius + c2.radius))
		return true;
	return false;
};

Vqs.Geometry.IsInRegion = function (p, leftX, rightX, topY, bottomY) {
	if (p.x >= leftX && p.x <= rightX && p.y >= topY && p.y <= bottomY)
		return true;
	return false;
};

Vqs.Geometry.Rectangle = function (leftTopX, leftTopY, width, height) {
	this.leftTopCorner = new Vqs.b2Vec2(leftTopX, leftTopX);
	this.width = width;
	this.height = height;
};

Vqs.Geometry.Rotate = function (center, point, angle) {
	//convert angle to radian
	var ra = angle * Math.PI / 180;

	//translate to origin
	var p1 = new Vqs.b2Vec2(point.x - center.x, point.y - center.y);

	//rotate
	var p = new Vqs.b2Vec2;
	p.x = p1.x * Math.cos(ra) + p1.y * Math.sin(ra);
	p.y = p1.x * Math.sin(ra) - p1.y * Math.cos(ra);

	//translate back
	p.x = p.x + center.x;
	p.y = p.y + center.y;

	return p;
};

Vqs.Geometry.ToRadian = function (degrees) {
	return degrees * Math.PI / 180;
};

Vqs.Geometry.ToDegree = function (radians) {
	return radians * 180 / Math.PI;
};

Vqs.Geometry.GetDistance = function (p1, p2) {
	var l = Math.abs(p2.y - p1.y);
	var w = Math.abs(p2.x - p1.x);

	if (l == 0)
		return w;

	if (w == 0)
		return l;

	return Math.sqrt(l * l + w * w);
};

Vqs.Geometry.GetAngle = function (center, point) {
	if (center.x == point.x) {
		if (center.y <= point.y)
			return 3 * Math.PI / 2;
		else
			return Math.PI / 2;
	}

	var angle = Math.atan((center.y - point.y) / (point.x - center.x)); //notice its (y1-y2) instead of y2-y1
	if ((point.y == center.y && point.x < center.x)
            || (point.x < center.x && point.y < center.y)
            || (point.x < center.x && point.y > center.y))
		angle += Math.PI;
	else if (point.x > center.x && point.y > center.y)
		angle += 2 * Math.PI;

	angle = (3 * Math.PI) - angle;
	if (angle > (2 * Math.PI))
		angle = angle - 2 * Math.PI;

	return angle;
};

Vqs.Geometry.GetAimingLine = function (point1, point2, max_x, max_y) {
	//transform to geomatrical cordinates
	p1 = new Vqs.b2Vec2(point1.x, -point1.y);
	p2 = new Vqs.b2Vec2(point2.x, -point2.y);
	max_y = -max_y;

	var start, end;
	var count = 0;
	var x, y;

	var a = (p2.x - p1.x);
	//document.getElementById("message").innerHTML = "a= " + a;
	if (a == 0) { //indicates the line is parallel to y-axis
		start = new Vqs.b2Vec2(p1.x, 0);
		end = new Vqs.b2Vec2(p1.x, max_y);
		count = 2;
	}
	else {
		var m = (p2.y - p1.y) / a; //m = (y2-y1)/(x2-x1)
		var c = p1.y - m * p1.x; //y = mx + c => c = y - mx

		//document.getElementById("message").innerHTML = "<br /> m= " + a + ", c= " + c;

		//x-axis
		//document.getElementById("message").innerHTML = "<br /> checking for x-axis";
		if (m != 0) {
			y = 0;
			x = Math.round(-c / m);
			//document.getElementById("message").innerHTML = "<br /> x= " + x + ", y= " + y;
			if (x >= 0 && x <= max_x) {
				start = new Vqs.b2Vec2(x, y);
				count++;
			}
		}

		// document.getElementById("message").innerHTML = "<br /> count= " + count;

		//x-boundary
		//document.getElementById("message").innerHTML = "<br /> checking for x-boundary";
		x = max_x;
		y = Math.round(m * x + c);
		//document.getElementById("message").innerHTML = "<br /> x= " + x + ", y= " + y;
		if (y >= max_y && y <= 0) {
			if (count == 0)
				start = new Vqs.b2Vec2(x, y);
			else
				end = new Vqs.b2Vec2(x, y);
			count++;
		}
		//document.getElementById("message").innerHTML = "<br /> count= " + count;

		if (count < 2) {
			//document.getElementById("message").innerHTML = "<br /> checking for y-axis";
			//y-axis
			x = 0;
			y = Math.round(c);
			//document.getElementById("message").innerHTML = "<br /> x= " + x + ", y= " + y;
			if (y >= max_y && y <= 0) {
				if (count == 0)
					start = new Vqs.b2Vec2(x, y);
				else
					end = new Vqs.b2Vec2(x, y);
				count++;
			}
			//document.getElementById("message").innerHTML = "<br /> count= " + count;

			if (count < 2) {
				//y-boundary
				y = max_y;
				if (m != 0) {
					//document.getElementById("message").innerHTML = "<br /> checking for y-boundary";
					x = Math.round((y - c) / m);
					//document.getElementById("message").innerHTML = "<br /> x= " + x + ", y= " + y;
					if (x >= 0 && x <= max_x) {
						if (count == 0)
							start = new Vqs.b2Vec2(x, y);
						else
							end = new Vqs.b2Vec2(x, y);
						count++;
					} //if
				} //if
			} //if

			//document.getElementById("message").innerHTML = "<br /> count= " + count;
		} //if
	} //else

	if (count >= 2) {
		//transform back to computer graphics Coordinates
		start.y = -(start.y);
		end.y = -(end.y);
		//document.getElementById("message").innerHTML = "<br /> start=(" + start.x + ", " + start.y + ") " + ", end=(" + end.x + ", " + end.y + ")";
		return new line(start, end);
	}
	else
		return null;
};

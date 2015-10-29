var Pi2 = 3.14159 * 2;
var Time = new Date();
var lastTime = Time.getTime();

//HELPERS---------------------------------
function vectorsLength(v){
    return Math.sqrt(v.x*v.x + v.y*v.y);
}

function vectorsAngle(v1, v2){
    return Math.acos((v1.x * v2.x + v1.y * v2.y)/(vectorLength(v1) * vectorLength(v2)));
}

function orthogonalTo(v){
    return {x : -v.y, y : v.x};
}

/*function dist(v){
    var dx = p1.pos.X - p2.pos.X;
    var dy = p1.pos.Y - p2.pos.Y;
    return {x : p1.pos.X - p2.pos.X, y : p1.pos.Y - p2.pos.Y};
}*/

function MathModel(params){
    this.state = {
        pos : {X : 0, Y : 0},
        Vx : 0,
        Vy : 0,
        Ax : 0,
        Ay : 1,
        Rad : 20,
        cdX : false,
        cdY : false,
        iLove : {},
        color : 'black',
        Diam : 0,
        wallX : false,
        wallY : false,
    };
    for (var key in params) {
        this.state[key] = params[key];
    };
    this.state.Diam = 2 * this.state.Rad;
};

MathModel.prototype.update = function(forces, delta_time){

    var p = this.state;
    if(!p.wallX && p.cdX == false){
        this.state.Vx += this.state.Ax * delta_time;
        this.state.pos.X += this.state.Vx * delta_time;
    }
    this.state.Vx += forces.Ax * delta_time;

    if(!p.wallY && p.cdY == false){
        this.state.Vy += this.state.Ay * delta_time;
        this.state.pos.Y += this.state.Vy * delta_time;
    }
    this.state.Vy += forces.Ay * delta_time;

    //console.log(this.state.pos.Y);
};

MathModel.prototype.draw = function(context){
    var p = this.state;
    context.ellipse(p.pos.X, p.pos.Y, p.Rad, p.Rad, 0, 0, Pi2);
    
    var grd = context.createRadialGradient(p.pos.X - p.Rad/2 + 5, p.pos.Y - p.Rad/2, 0, p.pos.X, p.pos.Y, p.Rad + 5 );
    grd.addColorStop(0.2,'rgba(255, 255, 255, 0.5)');
    grd.addColorStop(0.95,'rgba(0, 0, 220, 0.8)');
    grd.addColorStop(1,'rgba(255, 0, 255, 0.8)');

    context.fillStyle = grd;
    context.fill();
};

MathModel.prototype.collision = function(collision_with, delta_time){
    var obj = collision_with;
    var p2 = obj.state;
    var p1 = this.state;
    var elasticity = 0.7;

    var dx = p1.pos.X - p2.pos.X;
    var dy = p1.pos.Y - p2.pos.Y;
    var dist = dx*dx + dy*dy;
    var min_dist = Math.pow(p1.Rad + p2.Rad, 2);

    if(dist <= min_dist){

        collisionPointX = ((p1.pos.X * p2.Rad) + (p2.pos.X * p1.Rad)) / (p1.Rad + p2.Rad); 
        collisionPointY = ((p1.pos.Y * p2.Rad) + (p2.pos.Y * p1.Rad)) / (p1.Rad + p2.Rad);

        var normal = orthogonalTo({x : collisionPointX - p1.pos.X, y : collisionPointY - p1.pos.Y});
        var deffLine = {
            x1 : collisionPointX + normal.x,
            y1 : collisionPointY + normal.y,
            x2 : collisionPointX - normal.x,
            y2 : collisionPointY - normal.y,
        };

        var angle = Math.atan2(dy, dx)

        var sp1 = Math.sqrt(p1.Vx * p1.Vx + p1.Vy * p1.Vy);
        var sp2 = Math.sqrt(p2.Vx * p2.Vx + p2.Vy * p2.Vy);

        var dir1 = Math.atan2(p1.Vy, p1.Vx);
        var dir2 = Math.atan2(p2.Vy, p2.Vx);

        var vx1 = sp1 * Math.cos(dir1 - angle);
        var vy1 = sp1 * Math.sin(dir1 - angle);
        var vx2 = sp2 * Math.cos(dir2 - angle);
        var vy2 = sp2 * Math.sin(dir2 - angle);

        var fvx1 = ((p1.Rad - p2.Rad) * vx1 + (2 * p2.Rad) * vx2) / (p1.Rad + p2.Rad);
        var fvx2 = ((2 * p1.Rad) * vx1 + (p2.Rad - p1.Rad) * vx2) / (p1.Rad + p2.Rad);

        p1.Vx = Math.cos(angle) * fvx1 + Math.cos(angle + Math.PI / 2) * vy1;
        p1.Vy = Math.sin(angle) * fvx1 + Math.sin(angle + Math.PI / 2) * vy1;
        p2.Vx = Math.cos(angle) * fvx2 + Math.cos(angle + Math.PI / 2) * vy2;
        p2.Vy = Math.sin(angle) * fvx2 + Math.sin(angle + Math.PI / 2) * vy2;

       /* p1.Vx *= elasticity;
        p1.Vy *= elasticity;
        p2.Vx *= elasticity;
        p2.Vy *= elasticity;*/

        //if(p1.cdX || p1.cdY){
            /*var radSum = p1.Rad + p2.Rad;
            var radDiff = p1.Rad - p2.Rad;
            var newVelX1 = (p1.Vx * radDiff + p2.Diam * p2.Vx) / radSum;
            var newVelY1 = (p1.Vy * radDiff + p2.Diam * p1.Vy) / radSum;
            var newVelX2 = (p1.Diam * p1.Vx - p2.Vx * radDiff) / radSum;
            var newVelY2 = (p1.Diam * p1.Vy - p2.Vy * radDiff) / radSum;

            p1.Vx = newVelX1;
            p1.Vy = newVelY1;
            p2.Vx = newVelX2;
            p2.Vy = newVelY2;
            p1.pos.X += p1.Vx * delta_time;
            p1.pos.Y += p1.Vy * delta_time;
            p2.pos.X += p2.Vx * delta_time;
            p2.pos.Y += p2.Vy * delta_time;*/
            /*p1.Vx *= elasticity;
            p1.Vy *= elasticity;
            p2.Vx *= elasticity;
            p2.Vy *= elasticity;
            p1.cdX = p1.cdY = false;*/
        /*}else{
            p1.cdX = p1.cdY = true;
        }*/

        console.log('collide');
        return deffLine;
    }
    return false;
};

MathModel.prototype.wallCollision = function(size, delta_time){
    var wallTolerance = 0;
    var p = this.state;
    var elasticity = 0.5;

    if(p.pos.X + p.Rad > size.width || p.pos.X - p.Rad < 0){
        if(p.wallX == false){
            p.Vx = -p.Vx;
            p.pos.X += p.Vx * delta_time;
            p.Vx *= elasticity;
            p.wallX = true;
        }
    }else{
        p.wallX = false;
    }

    if(p.pos.Y + p.Rad >= size.height || p.pos.Y - p.Rad <= 0){
        if(p.wallY == false){
            p.Vy = -p.Vy;
            p.pos.Y += p.Vy * delta_time;
            p.Vy *= elasticity;
            p.wallY = true;
        }
    }else{
        p.wallY = false;
    }

};

console.log('bubbles');

function animate(bubbles, forces, canvas) {

    canvas.width = window.innerWidth - 5;
    canvas.height = window.innerHeight - 5;

    var context = canvas.getContext('2d');
    var dT = (new Date).getTime() - lastTime;
    lastTime = (new Date).getTime();
    dT /=  100;

    // clear
    context.clearRect(0, 0, canvas.width, canvas.height);

    var collisionPoints = [];

    // collisions?
    if(bubbles.length > 0){
        for (var i = 0; i < bubbles.length; i++){
            //wall collision?
            bubbles[i].wallCollision({width : canvas.width, height : canvas.height}, dT);
            // 1 to another collision?
            for (var j = 0; j < i; j++) {
                var deffLine = bubbles[i].collision(bubbles[j], dT);
                if(deffLine != false){
                    context.beginPath();
                    context.moveTo(deffLine.x1, deffLine.y1);
                    context.lineTo(deffLine.x2, deffLine.y2);
                    context.stroke();
                }
            }
        }
    }

    // draw
    for (var item in bubbles) {    
        bubbles[item].update(forces, dT);    
        context.beginPath();
        bubbles[item].draw(context);
    };

}
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
        stability : 1,
        iDontWannaLiveAnymore : false,
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

MathModel.prototype.draw = function(canvas){
    var p = this.state;
    var context = canvas.getContext('2d');
    context.beginPath();
    if(p.Rad !== 0){
        context.ellipse(p.pos.X, p.pos.Y, p.Rad, p.Rad, 0, 0, Pi2);
        
        var grd = context.createRadialGradient(p.pos.X - p.Rad/2 + 5, p.pos.Y - p.Rad/2, 0, p.pos.X, p.pos.Y, p.Rad + 5 );
        var redness = Math.round(p.pos.X * 255 / (canvas.width / 2));
        var blueness = Math.round((canvas.width - p.pos.X) * 255 / (canvas.width / 2));
        if (redness > 255) redness = 255;
        if (blueness < 0) blueness = 0;
        grd.addColorStop(0.2,'rgba(255, 255, 255, 0.5)');
        grd.addColorStop(0.9,'rgba('+redness+', 0, '+blueness+', 0.8)');
        grd.addColorStop(1,'rgba(255, 0, 255, 0.8)');

        context.fillStyle = grd;
        context.fill();
    }
};

MathModel.prototype.collision = function(collision_with, delta_time){
    var p2 = collision_with.state;
    var p1 = this.state;

    var dx = p1.pos.X - p2.pos.X;
    var dy = p1.pos.Y - p2.pos.Y;
    var dist = dx*dx + dy*dy;
    var sumRad = p1.Rad + p2.Rad;
    var min_dist = Math.pow(sumRad, 2);

    if(dist <= min_dist){

        if(dist <= min_dist * 0.4){
            ////p1.stability -= 0.002 * p1.Rad;
            //p2.stability -= 0.002 * p2.Rad;
            ////if(p2.stability < 0){
                p1.Vx = (p1.Vx + p2.Vx) / 2;
                p1.Vy = (p1.Vy + p2.Vy) / 2;
                p1.Ax = (p1.Ax + p2.Ax) / 2;
                p1.Ay = (p1.Ay + p2.Ay) / 2;
                p1.pos.X = (p1.pos.X + p2.pos.X) / 2;
                p1.pos.Y = (p1.pos.Y + p2.pos.Y) / 2;
                p1.Rad = Math.pow(Math.pow(p1.Rad, 3) + Math.pow(p2.Rad, 3), 0.3);
                p2.Rad = 0;
                p2.wallY = p2.wallX = false;
                p1.stability = 1;
                return false;
            ////}
        }

        //p1.stability -= 0.001 * p1.Rad;

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

        var a1 = Math.atan2(p1.Vy, p1.Vx) - angle;
        var a2 = Math.atan2(p2.Vy, p2.Vx) - angle;

        var vx1 = sp1 * Math.cos(a1);
        var vy1 = sp1 * Math.sin(a1);
        var vx2 = sp2 * Math.cos(a2);
        var vy2 = sp2 * Math.sin(a2);

        var newVelX1 = ((p1.Rad - p2.Rad) * vx1 + (2 * p2.Rad) * vx2) / sumRad;
        var newVelX2 = ((2 * p1.Rad) * vx1 + (p2.Rad - p1.Rad) * vx2) / sumRad;

        var cosAngle = Math.cos(angle);
        var sinAngle = Math.sin(angle);

        p1.Vx = cosAngle * newVelX1 - sinAngle * vy1;
        p1.Vy = sinAngle * newVelX1 + cosAngle * vy1;
        p2.Vx = cosAngle * newVelX2 - sinAngle * vy2;
        p2.Vy = sinAngle * newVelX2 + cosAngle * vy2;

        //console.log('collide');
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

    if(p.wallX || p.wallY){
        p.stability -= 0.01;
    }
};

console.log('bubbles');

function animate(bubbles, forces, canvas) {

    canvas.width = window.innerWidth - 5;
    canvas.height = window.innerHeight - 5;

    var context = canvas.getContext('2d');
    var currentTime = (new Date).getTime();
    var dT = currentTime - lastTime;
    lastTime = currentTime;
    dT /= 100;

    // clear
    context.clearRect(0, 0, canvas.width, canvas.height);

    // collisions?
    if(bubbles.length > 0){
        for (var i = 0; i < bubbles.length; i++){
            //wall collision?
            bubbles[i].wallCollision({width : canvas.width, height : canvas.height}, dT);
            // 1 to another collision?
            for (var j = 0; j < i; j++) {
                var deffLine = bubbles[i].collision(bubbles[j], dT);
                //draw separation line
                /*if(deffLine != false){
                    context.beginPath();
                    context.moveTo(deffLine.x1, deffLine.y1);
                    context.lineTo(deffLine.x2, deffLine.y2);
                    context.stroke();
                }*/
            }
        }
    }

    //debugger;

    //delete bubbles with zero radius
    if(bubbles.length > 0){
        for (var i = 0; i < bubbles.length; i++){
            //if(bubbles[i].state.Rad === 0 || bubbles[i].state.stability < 0){
            if(bubbles[i].state.Rad === 0){
                bubbles[i].state.stability -= 0.01;
                if(bubbles[i].state.stability < 0){
                    bubbles.splice(i, 1);
                    console.log('delete: '+i);
                }
            }
        }
    }

    // draw
    for (var item in bubbles) {
        bubbles[item].update(forces, dT);
        bubbles[item].draw(canvas);
    };

}
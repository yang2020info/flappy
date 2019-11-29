// Load main library
var Game = window.Game || {};

Game.assert(docCookies);

Game.ui = (function() {


// UI Singleton object
var UI = function() {
    // TODO: Set the starting UI state appropriately.
    this.state = Title();
};
UI.prototype.mouseMove = function(x, y) {
    this.state.mouseMove(x, y);
};
UI.prototype.mouseDown = function(x, y) {
    if (this.state) { this.state.mouseDown(x,y); }
};
UI.prototype.worldDraw = function(ctx) {
    if (this.state) { this.state.worldDraw(ctx); }
};
UI.prototype.screenDraw = function(ctx) {
    if (this.state) { this.state.screenDraw(ctx); }
};
UI.prototype.cancel = function() {
    if (this.state) { this.state.cancel(); }
};
UI.prototype.update = function(elapsed) {
    if (this.state) { this.state.update(elapsed); }
};

// Draw debug information
var debugDraw = function(ctx, msg) {
    if(Game.DEBUG) {
        ctx.fillStyle = '#f80';
        ctx.font = '10pt sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(msg, Game.WIDTH-10, 100);
    }
};

// UI State base object
var UIState = function() {};
UIState.prototype.mouseDown = function (x, y) {};
UIState.prototype.mouseMove = function (x, y) {};
UIState.prototype.worldDraw = function (ctx) {};
UIState.prototype.screenDraw = function (ctx) {};
UIState.prototype.cancel = function() {};
UIState.prototype.update = function(elapsed) {};

var X_SPEED = 200;
var GROUND_Y = 474;
var HALF_PLAYER_WIDTH = 36;
var PLAYER_WIDTH = 69;
var PLAYER_HEIGHT = 48;
var PLAYER_X = 240 - HALF_PLAYER_WIDTH;
var INITIAL_PLAYER_Y = 250;
var ANIM_TIME = 220;
var PIPE_OPENING = 156;   // Flappy bird's is 156
var PIPE_WIDTH = 90;      // Flappy bird's is 85
var PIPE_DISTANCE = 295;  // Flappy bird's is 285
var FRAME_TIME = 10;
var JUMP_HEIGHT = (PIPE_OPENING-PLAYER_HEIGHT)* 0.65;
var INV_TEMPO = 500;
var GRAVITY = JUMP_HEIGHT / INV_TEMPO / INV_TEMPO * 8;
var JUMP_STRENGTH = GRAVITY * INV_TEMPO / 2;
var TERMINAL_V = 0.75;
Game.assert(TERMINAL_V >= JUMP_STRENGTH);

var newPipe = function() {
    var BUF = 50;
    var height = BUF + (GROUND_Y-2*BUF-PIPE_OPENING) * Math.random();
    height = 3 * Math.floor(height / 3);
    return {y: height, counted: false};
};
var drawTurtle = function(ctx, y, time) {
    var srcY = Math.floor(time/ANIM_TIME*3);
    srcY = 2 - srcY;
    if(srcY < 0)  // Shouldn't ever happen?!
        srcY += 3;
    if(srcY > 2)  // Shouldn't ever happen?!
        srcY -= 3;
    srcY *= 55;
    Game.drawImage(ctx, 'player.png',
                   0, srcY, PLAYER_WIDTH, PLAYER_HEIGHT,
                   PLAYER_X, y, PLAYER_WIDTH, PLAYER_HEIGHT);
};

var highScore = docCookies.getItem('best') || 0;
var playerTime = 0;
var groundX = 0;
var updateAnimations = function(elapsed) {
    var dx = elapsed * X_SPEED / 1000;

    groundX -= dx;
    if(groundX <= -24)
        groundX += 24;

    playerTime += elapsed;
    if(playerTime >= ANIM_TIME)
        playerTime -= ANIM_TIME;
};

var Title = function() {
    var Title = new UIState();

    Title.update = function(elapsed) {
        updateAnimations(elapsed);
    };
    Title.screenDraw = function(ctx) {
        Game.drawImage(ctx, 'background.png', 0, 0);
        Game.drawImage(ctx, 'ground.png', Math.floor(groundX), GROUND_Y);
        drawTurtle(ctx, Math.floor(INITIAL_PLAYER_Y), playerTime);
        Game.drawImage(ctx, 'title.png', 0, 100);

        ctx.font = '16pt sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText('Click to play!', 10, 26);

        if(highScore > 0) {
            ctx.font = '24pt sans-serif';
            ctx.fillStyle = '#000';
            ctx.fillText('High score: ' + highScore, Game.WIDTH/2-98, 362);
            ctx.fillStyle = '#fff';
            ctx.fillText('High score: ' + highScore, Game.WIDTH/2-100, 360);
        }

        debugDraw(ctx, 'High score: ' + highScore);
    };
    Title.mouseDown = function(x, y) {
        Game.ui.state = Flapping();
    };

    return Title;
};

var Flapping = function() {
    var hello = new UIState();

    hello.playerV = -JUMP_STRENGTH;
    hello.playerY = INITIAL_PLAYER_Y;
    hello.frameTime = 0;
    hello.pipes = [newPipe(), newPipe()];
    hello.pipeX = PLAYER_X + 300;
    hello.score = 0;
    hello._frame = function() {
        var i, pipeX, pipeY;

        this.playerY += this.playerV * FRAME_TIME;
        this.playerV += GRAVITY * FRAME_TIME;
        if(this.playerV > TERMINAL_V)
            this.playerV = TERMINAL_V;

        // Increase score if passing an obstacle
        for(i = 0;  i < this.pipes.length;  ++i) {
            pipeX = this.pipeX + PIPE_DISTANCE*i;
            if(!this.pipes[i].counted
                  &&  PLAYER_X + PLAYER_WIDTH > pipeX+PIPE_DISTANCE-20) {
                this.pipes[i].counted = true;
                ++this.score;
                if(this.score > highScore) {
                    highScore = this.score;
                    docCookies.setItem('best', highScore, Infinity);
                }
            }
        }

        // Check for death
        for(i = 0;  i < this.pipes.length;  ++i) {
            pipeX = this.pipeX + PIPE_DISTANCE*i;
            pipeY = this.pipes[i].y;
            if(      PLAYER_X < pipeX+PIPE_WIDTH
                  && PLAYER_X+PLAYER_WIDTH > pipeX
                  && (    this.playerY < pipeY
                       || this.playerY+PLAYER_HEIGHT > pipeY+PIPE_OPENING))
                Game.ui.state = Dead(this);
        }
    };
    hello.update = function(elapsed) {
        var dx = elapsed * X_SPEED / 1000;

        updateAnimations(elapsed);

        this.pipeX -= dx;
        if(this.pipeX <= -PIPE_WIDTH) {
            this.pipeX += PIPE_DISTANCE;
            this.pipes.shift();
            this.pipes.push(newPipe());
        }

        this.frameTime += elapsed;
        while(this.frameTime >= FRAME_TIME) {
            this.frameTime -= FRAME_TIME;
            this._frame();
        }
    };
    hello.screenDraw = function(ctx) {
        Game.drawImage(ctx, 'background.png', 0, 0);
        drawPipes(ctx, this);
        Game.drawImage(ctx, 'ground.png', Math.floor(groundX), GROUND_Y);
        drawTurtle(ctx, Math.floor(this.playerY), playerTime);

        ctx.font = '16pt sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText('Click to play!', 10, 26);

        ctx.font = '24pt sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#000';
        ctx.fillText(this.score, Game.WIDTH - 8, 36);
        ctx.fillStyle = '#fff';
        ctx.fillText(this.score, Game.WIDTH - 10, 34);

        debugDraw(ctx, this.score + ', ' + highScore);
    };
    hello.mouseDown = function(x, y) {
        this.playerV = -JUMP_STRENGTH;
    };

    return hello;
};

var drawPipes = function(ctx, state) {
    var i, x, y;
    for(i = 0;  i < state.pipes.length;  ++i) {
        x = state.pipeX + PIPE_DISTANCE*i;
        y = state.pipes[i].y;
        Game.drawImage(ctx, 'pipe_top.png', x, y-376);
        Game.drawImage(ctx, 'pipe_bottom.png', x, y+PIPE_OPENING);
    }
}

var Dead = function(gamestate) {
    var s = new UIState();

    s.time = 250;
    s.frameTime = 0;
    s.playerV = 0;
    s.playerY = gamestate.playerY;
    s._frame = function() {
        var i, pipeX, pipeY;

        if(this.playerY <= Game.HEIGHT) {
            this.playerY += this.playerV * FRAME_TIME;
            this.playerV += GRAVITY * FRAME_TIME;
            if(this.playerV > TERMINAL_V)
                this.playerV = TERMINAL_V;
        }
    };
    s.update = function(elapsed) {
        if(this.time > 0)
            this.time -= elapsed;
        if(this.time < 0)
            this.time = 0.0;

        this.frameTime += elapsed;
        while(this.frameTime >= FRAME_TIME) {
            this.frameTime -= FRAME_TIME;
            this._frame();
        }
    };
    s.screenDraw = function(ctx) {
        Game.drawImage(ctx, 'background.png', 0, 0);
        drawPipes(ctx, gamestate);
        Game.drawImage(ctx, 'ground.png', Math.floor(groundX), GROUND_Y);
        drawTurtle(ctx, Math.floor(this.playerY), playerTime);
        Game.drawImage(ctx, 'title.png', 0, 100);

        ctx.font = '16pt sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText('Click to play!', 10, 26);

        ctx.font = '24pt sans-serif';
        ctx.fillStyle = '#000';
        ctx.fillText('Score: ' + gamestate.score, Game.WIDTH/2-98, 332);
        ctx.fillText('High score: ' + highScore, Game.WIDTH/2-98, 362);
        ctx.fillStyle = '#fff';
        ctx.fillText('Score: ' + gamestate.score, Game.WIDTH/2-100, 330);
        ctx.fillText('High score: ' + highScore, Game.WIDTH/2-100, 360);

        var alpha = 1.0 - (250.0-this.time)/100;
        if(alpha > 0.001) {
            ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
            ctx.beginPath();
            ctx.rect(0,0,Game.WIDTH,Game.HEIGHT);
            ctx.fill();
        }

        debugDraw(ctx, 'High score: ' + highScore);
    };
    s.mouseDown = function(x, y) {
        if(this.time === 0.0)
            Game.ui.state = Flapping();
    };

    return s;
};


return new UI();


}());

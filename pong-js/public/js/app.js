// Utils
var FRAMES_PER_SECOND = 60,
    window = window || {},
    //    animate = window.requestAnimationFrame ||
    //        window.webkitRequestAnimationFrame ||
    //        window.mozRequestAnimationFrame ||
    //        function(callback) { window.setTimeout(callback, 1000/FRAMES_PER_SECOND) },
    animate = function(fn) { window.setTimeout(fn, 1000/FRAMES_PER_SECOND) },
    d = console.log.bind(console),// eslint-disable-line no-console, no-undef   
    onready = function(fn) {
        if( typeof window.onload==='function' ) {
            var oldLoad = window.onload;
            window.onload = function() {
                oldLoad();
                fn();
            };
        } else {
            window.onload = fn;
        }
    },
    now = function() {
        return  new Date().getTime();
    },
    random = function(startOrEnd, maybeEnd) {
        var start = startOrEnd, end = maybeEnd;
        if (maybeEnd===undefined) {
            start = 0;
            end = startOrEnd;
        }

        return Math.floor(Math.random() * (end-start)) + start;
    },
    object = {
        clone: function() {
            var clone = {}, obj;
            for (var i=0; i<arguments.length; i++) {
                obj = arguments[i];
                Object
                    .keys(obj)
                    .forEach(function(prop) {
                        clone[prop] = obj[prop];
                    });
            }
            return clone;
        },
        // Object1 Object2 ... Objectn -> Object
        // 
        extend: function() {
            
        }
    },
    array = {
        clone: Function.prototype.call.bind(Array.prototype.slice),
        is: function(x) {
            return Object.prototype.toString.call(x)=='[object Array]';
        },
        add: function(arr, itemOrItems) {
            if( array.is(itemOrItems) ) return arr.concat(itemOrItems);
            else return arr.concat([itemOrItems]);
        },
        /**
         Array fn [scope] -> void
         Array methodName, [ arg1, arg2, ..., argn ] -> void

         On each item in list run the function or run the methodName + args on each item.
         */
        runEach: function() {
            var args = [].slice.call(arguments),
                items = args.shift(),
                fnOrMethod = args.shift(),
                scope;

            if ( typeof fnOrMethod==='function' ) {
                scope = args.shift();
                if( scope===undefined ) items.forEach(fnOrMethod);
                else items.forEach(fnOrMethod, scope);
            } else {
                items.forEach(function(item) {
                    if( typeof item[fnOrMethod]==='function' ) item[fnOrMethod].apply(item, args);
                    else d('Item has no method: ' + fnOrMethod);
                });
            }
        }
    }
;


var
Court = function(width, height) {
    var COURT_COLOR = 'black';
    return {
        objects: [],
        render: function(ctx) {
            ctx.fillStyle = COURT_COLOR;
            ctx.fillRect(0, 0, width, height);

            array.runEach(this.objects, 'render', ctx);
            return this;
        },
        add: function(itemOrItems) {
            this.objects = array.add(this.objects, itemOrItems);
            return this;
        }
    };
},

Paddle = function(position) {
    var POSITION_LEFT = 'left',
        POSITION_RIGHT = 'right',
        PADDLE_WIDTH = 5,
        PADDLE_COLOR = 'white',
        PADDLE_HEIGHT = 100;


    function calculateX(canvasWidth) {
        if ( position===POSITION_RIGHT ) return canvasWidth-PADDLE_WIDTH;
        else return 0;
    }
    function centerY(canvasHeight, paddleHeight) {
        return (canvasHeight/2) - (paddleHeight/2);
    }

    return {
        y: null,
        height: PADDLE_HEIGHT,
        position: position,
        width: PADDLE_WIDTH,
        render: function(ctx) {
            var x = calculateX(ctx.canvas.width);
            if( this.y===null ) this.y = centerY(ctx.canvas.height, this.height);

            ctx.fillStyle = PADDLE_COLOR;
            ctx.fillRect(x, this.y, PADDLE_WIDTH, this.height);
        },
    };
},
Ball = function(x, y) {
    var COLOR = 'white',
        RADIUS = 7,
        SPEED = 3;

    return {
        color: COLOR,
        radius: RADIUS,
        x: x, y: y,
        speedx: SPEED,
        speedy: SPEED,
        render: function(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
            ctx.fill();
        }
    };
},
ElementMixin = {
    balls: [],
    paddles: [],
    addBalls: function(balls) {
        if( array.is(balls) ) this.balls = this.balls.concat(balls);
        else this.balls.push(balls);

        return this;
    },
    addPaddles: function(paddles) {
        if( array.is(paddles) ) this.paddles = this.paddles.concat(paddles);
        else this.paddles.push(paddles);

        return this;
    }
},
PhysicsEngineBasic = (function(undefined) {
    var
    moveBall = function(ball) {
        ball.x = ball.x + ball.speedx;
        ball.y = ball.y + ball.speedy;
    },
    adjustForCollisions = function(ball, canvas, paddles) {
        var adjustForObjectCollision = function(ball, canvas, paddles) {
            adjustForPaddleCollision = function(ball, p, maxX) {
                var py1 = p.y,
                    py2 = p.y + p.height;
                
                if (ball.y>py2+5 || ball.y<py1-5) {
                    // outside paddle edge
                    d('score: ' + p.position, p.y, ball.y, py1, py2);
                } else {
                    ball.speedx = -ball.speedx;
                    ball.x = maxX;
                    var deltaY = ball.y - (py1+p.height/2);
                    ball.speedy = ball.speedy + deltaY * 0.01;
                }
            };
            paddles.forEach(function(p) {
                if (p.position==='left') {
                    if (ball.x-ball.radius < p.width) {
                        adjustForPaddleCollision(ball, p, p.width+ball.radius);
                    }
                } else {
                    if (ball.x+ball.radius > canvas.width - p.width) {
                        adjustForPaddleCollision(ball, p, canvas.width-p.width-ball.radius);
                    }
                }
            });
        },
            adjustForCourtCollision = function(ball, canvas) {
                var radius = ball.radius,  
                    cy1 = radius+2,
                    cy2 = canvas.height - radius-2
                ;

                if ( ball.y>cy2) {
                    ball.speedy = -ball.speedy;
                }
                if (ball.y<cy1) {
                    ball.speedy = -ball.speedy;
                }
            };

        adjustForObjectCollision(ball, canvas, paddles);
        adjustForCourtCollision(ball, canvas);
    },
    detectScore = function(ball, canvas) {
        var radius = ball.radius,
            cx1 = radius,
            cx2 = canvas.width - radius;

        return (ball.x<cx1 || ball.x>cx2)
            ? true
            : false;
    };

    return object.clone(ElementMixin, {
        move: function(canvas) {
            var paddles = this.paddles,
                hasScored = false;

            this.balls.forEach(function(ball) {
                moveBall(ball);
                adjustForCollisions(ball, canvas, paddles);
                hasScored = hasScored || detectScore(ball, canvas);
            });
            return hasScored;
        }
    });
}()),
GameControl = {
    init: function(game, canvas, player) {
        this.initGodControls(game);
        this.initGameControls(game);
        this.initPlayerControls(canvas, player);
    },
    initGodControls: function(game) {
        var ball = game.ball;
        document.addEventListener('keydown', function(ev) {
            d(ev.keyCode);
            switch(ev.keyCode) {
            case 40:
                ball.speedy+=1;
                break;
            case 38:
                ball.speedy-=1;
                break;
            case 39:
                ball.speedx+=1;
                break;
            case 37:
                ball.speedx-=1;
                break;
            case 33: FRAMES_PER_SECOND+=5; break;
            case 34: FRAMES_PER_SECOND-=5; break;
            }
        });
    },
    initPlayerControls: function(canvas, player) {
        if(player!==undefined) {
            document.addEventListener('mousemove', function(evt) {
                var rect = canvas.getBoundingClientRect(),
                    root = document.documentElement,
                    //mousex = evt.clientX - rect.left - root.scrollLeft,
                    mousey = evt.clientY - rect.top - root.scrollTop;

                player.y = mousey - player.height/2;
            });
        }               
    },
    initGameControls: function(game) {
        document.addEventListener('mousedown', function(evt) {
            if( game.pause ) {
                game.reset();
            }
        });               
    }
},
GameStats = object.clone(ElementMixin, {
    count: 0,
    score: [0, 0],
    step: function() {
        this.count++;
    },
    // Doesn't detect scoring, just keeps track
    scoreIt: function() {
        var ball = this.balls[0];

        if( ball.x<30 ) this.score[1]++;
        else this.score[0]++;
    },
    render: function(ctx) {
        this.displayLines(ctx, [
            'Frames: ' + this.count,
            'FPS: ' + FRAMES_PER_SECOND,
            'Ball px/s: ' + Math.abs(this.balls[0].speedx),
            'P1 height: ' + this.paddles[0].height,
            'P2 height: ' + this.paddles[1].height
        ]);
        this.displayScore(ctx);
    },
    displayLines: function(ctx, lines) {
        var x = 10,
            y = 10,
            lineHeight = 15;
        ctx.fillStyle = 'white';

        lines.forEach(function(str) {
            ctx.fillText(str, x, y);
            y+=lineHeight;
        });
    },
    displayScore: function(ctx) {
        var canvas = ctx.canvas,
            width = canvas.width,
            height = canvas.height
        ;

        ctx.fillStyle = '#FFFF00';
        ctx.fillText(this.score[0], 100, height-20);
        ctx.fillText(this.score[1], width-100, height-20);
    }
}),
AiSimple = {
    paddle: null, ball: null,
    play: function() {
        var paddle = this.paddle,
            ball = this.ball,
            center = paddle.y + (paddle.height/2);

        if( center < ball.y-35 ) {
            paddle.y = paddle.y + 10;
        } else if( center > ball.y+35 ){
            paddle.y = paddle.y - 10;
        }
    }
},
AiPerfect = {
    paddle: null, ball: null,
    play: function() {
        var paddle = this.paddle,
            ball = this.ball,
            center = paddle.y + (paddle.height/2);

        paddle.y = ball.y-paddle.height/2; return;
    }
},
God = object.clone(ElementMixin, {
    lastActOfGod: 0,
    step: function() {
        var current = now();
        if( current-this.lastActOfGod>3000 ) {

            this.speedUpBalls();
            this.growRandomPaddle();

            this.lastActOfGod = now();
        }
    },
    speedUpBalls: function() {
        this.balls.forEach(function(ball) {
            if( ball.speedx<0 ) ball.speedx-=1;
            else ball.speedx+=1;
        });
    },
    growPaddle: function(p) {
        p.height+=10;
    },
    growRandomPaddle: function() {
        var which = random(0, this.paddles.length);
        this.growPaddle(this.paddles[which]);
    }
}),
Pong = {
    pause: false,
    init: function() {
        var canvasId = 'canvas',
            canvas = document.getElementById(canvasId),
            ctx    = canvas.getContext('2d'),
            ball = Ball(400, 300),
            p1 = Paddle('left'),
            p2 = Paddle('right'),
            court = Court(800, 600)
                .add([ball, p1, p2])
                .render(ctx);

        this.ctx = ctx;
        this.physicsEngine = PhysicsEngineBasic
            .addBalls(ball)
            .addPaddles([p1, p2]);

        this.god = God
            .addBalls(ball)
            .addPaddles([p1, p2]);

        this.stats = GameStats
            .addBalls(ball)
            .addPaddles([p1, p2]);
        
        this.court = court;
        this.ball = ball;
        this.ais = [
            object.clone(AiPerfect, { paddle: p2, ball: ball }),
            object.clone(AiSimple, { paddle: p1, ball: ball })
        ];
       //GameControl.init(this, court.canvas, p1);
        GameControl.init(this, canvas);
    },
    reset: function() {
        var ball = this.ball,
            canvas = this.ctx.canvas;

        ball.speedx = ball.speedx<0 ? ball.speedx=5 : ball.speedx=-5;
        ball.x += ball.speedx*2;
        ball.speedy = 5;
        ball.x = canvas.width/2;
        ball.y = canvas.height/2;
        this.pause = false;
    },
    start: function() {
        onready(function() {
            this.init();
            this.animate();
        }.bind(this));
    },
    animate: function() {
        var step = this.step.bind(this);
        animate(function frame() {
            step();
            animate(frame);
        });
    },
    lastIncrease: new Date().getTime(),
    step: function() {
        if ( !this.pause ) {
            this.stepAis();
            this.god.step();
            this.stats.step();

            var scored = this.pause = this.physicsEngine.move(this.ctx.canvas);
            this.court.render(this.ctx);

            if( scored ) {
                this.stats.scoreIt();
            }
            this.stats.render(this.ctx);
        }
    },
    stepAis: function() {
        this.ais.forEach(function(ai) {
            ai.play();
        });
    }
};


Pong.start();

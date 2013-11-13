define([
    'behaviors/beating',
    'views/ship',
    'objects/bullet',
], function(Beating, ShipView, Bullet) {
    "use strict";

    var Ship = function(ctx, bounds, options) {
        /*
         * map's bounds, should restrict a moving area
         */
        this.bounds = bounds;

        this.options = _.extend({
            coords: [ 100, 100 ],
            size: 40,
            color: [ 0, 0, 0 ],
            movingStep: 4,
            resizingStep: 2
        }, options);

        /*
         * a helper object to delegate partial rendering
         */
        this.view = new ShipView(ctx, this.options.size);

        this.id = null;

        /*
         * coords of object's center
         */
        this.coords = this.options.coords;

        /*
         * diameter [px]
         */
        this.size = this.options.size;

        /*
         * [ red, green, blue ]
         */
        this.color = this.options.color;

        this.opacity = 0.4;

        this.movingDirections = { up: false, down: false, left: false, right: false };

        this.shieldDirections = _.clone(this.movingDirections);

        this.bulletsLimit = 100;

        /*
         * number of bullets in queue
         * ship can't produce more bullets than this.bulletsLimit
         */
        this.bulletsInQueue = 0;

        /*
         * registry of bullets that a fired currently
         */
        this.bullets = [];

        _.extend(this, new Beating());

        this
            .initEvents()
            .runBeating(10);
    };

    Ship.prototype.render = function() {
        /*
         * draw both static and dynamic bodies
         */
        this.view
            .applyColor(this.color, this.opacity)
            .drawBody(this.coords)
            .drawBody(this.coords, this.size / Math.sqrt(2));

        /*
         * draw a front arc for each moving direction
         */
        for (var moveDirection in this.movingDirections) {
            if (this.movingDirections[moveDirection]) {
                this.view.drawFrontArc(this.coords, this.size / 2, Math.PI * 0.4, moveDirection);
            }
        }

        /*
         * draw shields (directions are set on turning shields on)
         */
        for (var shieldDirection in this.shieldDirections) {
            if (this.shieldDirections[shieldDirection]) {
                this.view.drawFrontArc(this.coords, this.size * 0.8, Math.PI * 0.7, shieldDirection);
            }
        }

        this.view.showBulletsInQueue(this.coords, this.bulletsInQueue);

        return this.trigger('render');
    };

    Ship.prototype.destroy = function() {
        this.on('beat', function() {
            this.opacity -= 0.01;
        });

        return this;
    };

    Ship.prototype.move = function(coords) {
        this.coords = coords;

        return this.trigger('move', { coords: this.coords });
    };

    Ship.prototype.shift = function(direction) {
        var coords = this.coords,
            axis = +_.contains([ 'up', 'down' ], direction),
            isPositive = +_.contains([ 'right', 'down' ], direction);

        coords[axis] += this.options.movingStep * (isPositive ? 1 : -1);

        return this.move(coords);
    };

    Ship.prototype.isMoving = function() {
        for (var direction in this.movingDirections) {
            if (this.movingDirections[direction]) {
                return true;
            }
        }

        return false;
    };

    Ship.prototype.changeColor = function() {
        _.each(this.color, function(value, index) {
            var randomSign = Math.round(Math.random() * 2) - 1;
            this.color[index] = Math.min(100, this.color[index] + randomSign * 10);
        }, this);

        return this;
    };

    Ship.prototype.isFacingBound = function(direction) {
        var radius = this.options.size / 2;

        switch (direction) {
            case 'left':
                return this.coords[0] <= radius + this.bounds.thickness;
            case 'right':
                return this.coords[0] >= this.bounds.width - radius - this.bounds.thickness;
            case 'up':
                return this.coords[1] <= radius + this.bounds.thickness;
            case 'down':
                return this.coords[1] >= this.bounds.height - radius - this.bounds.thickness;
        }
    };

    Ship.prototype.toggleShield = function(toProceed) {
        for (var direction in this.shieldDirections) {
            if (!toProceed) {
                this.shieldDirections[direction] = false;
                continue;
            }

            if (this.shieldDirections[direction]) {
                continue;
            }

            /*
             * A shield can be activated only while moving along current directions
             */
            this.shieldDirections[direction] = this.movingDirections[direction];
        }

        return this;
    };

    Ship.prototype.resize = function() {
        if (!this.isMoving()) {
            if (this.size > this.options.size) {
                this.size -= this.options.resizingStep * 2;
            }
        } else if (this.size < this.options.size * 4) {
            this.size += this.options.resizingStep;
        }

        return this;
    };

    Ship.prototype.queueBullet = function() {
        if (this.bulletsInQueue < this.bulletsLimit) {
            this.bulletsInQueue++;
        }

        return this;
    };

    Ship.prototype.shot = function() {
        for (var direction in this.movingDirections) {
            if (!this.movingDirections[direction]) { continue; }

            if (!this.bulletsInQueue) { continue; }

            this.bulletsInQueue--;

            var bullet = new Bullet(this.view.ctx, _.clone(this.coords), direction, {
                color: this.color
            });

            this.bullets.push(bullet);

            bullet.on('stop', this.reduceBullets, this);
        }

        return this.trigger('shot');
    };

    Ship.prototype.reduceBullets = function() {
        this.bullets.shift();

        return this;
    };

    Ship.prototype.initEvents = function() {
        this.on('beat', function() {
            _.each(this.movingDirections, function(isMoving, direction) {
                if (!isMoving || this.isFacingBound(direction)) { return; }

                this.shift(direction);
            }, this);
        });

        this.on('beat', this.resize);

        this.on('control:shift', function(data) {
            this.movingDirections[data.direction] = !data.toStop;

            if (data.toStop && !this.isMoving()) {
                this.trigger('stop');
            }
        });

        this.on('control:shield', function(data) {
            this.toggleShield(!data.toStop);
        });

        this.on('control:weapon', function(data) {
            /*
             * start/stop charging a gun
             */
            this[data.toFire ? 'off' : 'on']('beat', this.queueBullet);

            if (data.toFire) {
                /*
                 * fire all bullets, one at a time
                 */
                this.on('beat', this.shot);
            }
        });

        this.on('shot', function() {
            if (this.bulletsInQueue <= 0) {
                this.off('beat', this.shot);
            }
        });

        this.on('render', function() {
            _.each(this.bullets, function(bullet) {
                if (!bullet) { return; }
                bullet.render();
            });
        });

        return this;
    };

    return Ship;
});

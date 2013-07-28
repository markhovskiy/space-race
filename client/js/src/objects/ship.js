define([
], function() {
	var Ship = function(ctx, options) {
        this.ctx = ctx;

        this.options = _.extend({
            color: [ 0, 0, 0 ],
            opacity: 0.4,
            coords: [ 100, 100 ],
            size: 20,
            step: 5
        }, options);

        /*
         * coords of object's center
         */
        this.coords = [ this.options.coords[0], this.options.coords[1] ];

        this.size = this.options.size;

        this.direction = 'Up';

        this.domEvents = {
            'keydown': this.handleKeyDown
        };
        this.attachedDomEvents = {};

        this.toggleDomEvents(true);
    };

    Ship.prototype.destroy = function() {
        return this.toggleDomEvents(false);
    };

	Ship.prototype.toggleDomEvents = function(toAttach) {
        var self = this;
		_.each(this.domEvents, function(handler, type) {
            /*
             * storing binded event handlers to be able to detach them by reference
             */
            if (toAttach) {
                self.attachedDomEvents[type] = function(e) { return handler.call(self, e); };
            }

			document[toAttach ? 'addEventListener' : 'removeEventListener'](type, self.attachedDomEvents[type], false);
		});

        return this;
	};

    Ship.prototype.render = function() {
        var getRectCoord = function(coord, size) { return coord - size / 2; },
            directionAngles = {
                Right: 0,
                Up: - Math.PI * 0.5,
                Left: - Math.PI,
                Down: - Math.PI * 1.5
            },
            arcStartAngle = Math.PI * 0.2;

        this.ctx.fillStyle = 'rgba(' + this.options.color.join(',') + ',' + this.options.opacity + ')';

        this.ctx.fillRect(
            getRectCoord(this.coords[0], this.size),
            getRectCoord(this.coords[1], this.size),
            this.size,
            this.size
        );

        this.ctx.beginPath();
        this.ctx.arc(
            this.coords[0],
            this.coords[1],
            this.size,
            arcStartAngle + directionAngles[this.direction],
            - arcStartAngle + directionAngles[this.direction],
            true
        );
        // this.ctx.stroke();
        this.ctx.fill();

        return this;
    };

	Ship.prototype.handleKeyDown = function(e) {
        var key = e.keyIdentifier;
        if (!_.contains([ 'Up', 'Right', 'Down', 'Left' ], key)) { return; }

        var axis = +_.contains([ 'Up', 'Down' ], key),
            shift = function(coord, step, isPositive) {
                return isPositive ? coord + step : coord - step;
            };

        this.direction = key;

        this.coords[axis] = shift(this.coords[axis], this.options.step, _.contains([ 'Down', 'Right' ], key));

        return this.render();
	};

	return Ship;
});

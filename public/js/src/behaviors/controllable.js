define([
], function() {
    "use strict";

    var Controllable = function() {
        _.extend(this, Backbone.Events);

        this.domEvents = {
            'keydown': this.handleKey,
            'keyup': this.handleKey
        };

        this.attachedDomEvents = {};

        this.keys = {
            up: 'Up',
            down: 'Down',
            left: 'Left',
            right: 'Right',
            space: 'U+0020',
            ctrl: 'Control'
        };
    };

    // Controllable.prototype.stopDomListeners = function() {
    //     return this.toggleDomEvents(false);
    // };

    Controllable.prototype.toggleDomEvents = function(toAttach) {
        var self = this;
        _.each(this.domEvents, function(handler, type) {
            /*
             * storing binded event handlers to be able to detach them by reference
             */
            if (toAttach) {
                self.attachedDomEvents[type] = function(e) {
                    return handler.call(self, e);
                };
            }

            document[toAttach ? 'addEventListener' : 'removeEventListener'](type, self.attachedDomEvents[type], false);
        });

        return this;
    };

    Controllable.prototype.handleKey = function(e) {
        var key = e.keyIdentifier;
        if (!_.contains(this.keys, key)) { return; }

        if (this.keys.space == key) {
            return this.trigger('control:shield', { toStop: 'keyup' == e.type });
        }

        if (this.keys.ctrl == key) {
            return this.trigger('control:weapon', { toFire: 'keyup' == e.type });
        }

        return this.trigger('control:shift', {
            direction: _.invert(this.keys)[key],
            toStop: 'keyup' == e.type
        });
    };

    return Controllable;
});

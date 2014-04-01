define(function(require, exports, module) {
    var Utility = require('famous/utilities/Utility');

    var PhysicsEngine = require('famous/physics/PhysicsEngine');
    var Particle = require('famous/physics/bodies/Particle');
    var Drag = require('famous/physics/forces/Drag');
    var Spring = require('famous/physics/forces/Spring');

    var Transform = require('famous/core/Transform');
    var EventHandler = require('famous/core/EventHandler');
    var GenericSync = require('famous/inputs/GenericSync');
    var ViewSequence = require('famous/core/ViewSequence');
    var Group = require('famous/core/Group');
    var Entity = require('famous/core/Entity');
    var OptionsManager = require('famous/core/OptionsManager');

    function Scrollview(options) {
        this.options = Object.create(Scrollview.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);

        this.node = null;

        this.physicsEngine = new PhysicsEngine();
        this.particle = new Particle();
        this.physicsEngine.addBody(this.particle);

        this.spring = new Spring({anchor: [0, 0, 0]});

        this.drag = new Drag({forceFunction: Drag.FORCE_FUNCTIONS.QUADRATIC});
        this.friction = new Drag({forceFunction: Drag.FORCE_FUNCTIONS.LINEAR});

        this.sync = new GenericSync((function() {
            return -this.getPosition();
        }).bind(this), {direction: (this.options.direction == Utility.Direction.X) ? GenericSync.DIRECTION_X : GenericSync.DIRECTION_Y});

        this.eventInput = new EventHandler();
        this.eventOutput = new EventHandler();

        this.rawInput = new EventHandler();
        this.rawInput.pipe(this.sync);
        this.sync.pipe(this.eventInput);
        this.sync.pipe(this.eventOutput);
        this.rawInput.pipe(this.eventInput);

        EventHandler.setInputHandler(this, this.rawInput);
        EventHandler.setOutputHandler(this, this.eventOutput);

        this._outputFunction = null;
        this._masterOutputFunction = null;
        this.setOutputFunction(); // use default

        this.touchCount = 0;
        this._springAttached = false;
        this._onEdge = 0; // -1 for top, 1 for bottom
        this._springPosition = 0;
        this._earlyEnd = false;

        this._masterOffset = 0; // minimize writes
        this._offsetDifferential = 0; // avoid batch
        this._lastFrameNode = null;

        if(options) this.setOptions(options);
        else this.setOptions({});

        _bindEvents.call(this);

        this.group = new Group();
        this.group.add({render: _innerRender.bind(this)});

        this._entityId = Entity.register(this);
        this._contextSize = [window.innerWidth, window.innerHeight];
        this._size = [this._contextSize[0], this._contextSize[1]];

        this._offsets = {};
    }

    Scrollview.DEFAULT_OPTIONS = {
        direction: Utility.Direction.X,
        rails: true,
        clipSize: undefined,
        margin: undefined,
        friction: 0.001,
        drag: 0.0001,
        edgeGrip: 0.5,
        edgePeriod: 300,
        edgeDamp: 1,
        paginated: false,
        pagePeriod: 500,
        pageDamp: 0.8,
        pageStopSpeed: Infinity,
        pageSwitchSpeed: 1,
        speedLimit: 10
    };

    function _handleStart(event) {
        this.touchCount = event.count;
        if(event.count === undefined) this.touchCount = 1;

        _detachAgents.call(this);
    }

    function _handleMove(event) {
        var pos = -event.p;
        this.setPosition(pos);
    }

    function _handleEnd(event) {
        this.touchCount = event.count || 0;
        if(!this.touchCount) {
            _detachAgents.call(this);
            if(this._onEdge) this._springAttached = true;
            _attachAgents.call(this);
        }
    }

    function _bindEvents() {
        this.eventInput.on('start', _handleStart.bind(this));
        this.eventInput.on('update', _handleMove.bind(this));
        this.eventInput.on('end', _handleEnd.bind(this));
    }

    function _attachAgents() {
        if(this._springAttached) this.physicsEngine.attach([this.spring], this.particle);
        else this.physicsEngine.attach([this.drag, this.friction], this.particle);
    }

    function _detachAgents() {
        this._springAttached = false;
        this.physicsEngine.detachAll();
    }

    function _sizeForDir(size) {
        if(!size) size = this._contextSize;
        var dimension = (this.options.direction === Utility.Direction.X) ? 0 : 1;
        return (size[dimension] === undefined) ? this._contextSize[dimension] : size[dimension];
    }

    function _shiftOrigin(amount) {
        this._springPosition += amount;
        this._offsetDifferential -= amount;
        this.setPosition(this.getPosition() + amount);
        this.spring.setOptions({anchor: [this._springPosition, 0, 0]});
    }


    function _handleEdge(edgeDetected) {
        if(!this._onEdge && edgeDetected) {
            this.sync.setOptions({scale: this.options.edgeGrip});
            if(!this.touchCount && !this._springAttached) {
                this._springAttached = true;
                this.physicsEngine.attach([this.spring], this.particle);
            }
        }
        else if(this._onEdge && !edgeDetected) {
            this.sync.setOptions({scale: 1});
            if(this._springAttached) {
                this.setPosition(this._springPosition);
                // reset agents, detaching the spring
                _detachAgents.call(this);
                _attachAgents.call(this);
            }
        }
        this._onEdge = edgeDetected;
    }

    function _handlePagination() {
        if(this.touchCount == 0 && !this._springAttached && !this._onEdge) {
            if(this.options.paginated) {
                var nodeSize = this.node.getSize ? this.node.getSize() : this._contextSize;
                // parameters to determine when to switch

                var posNext = this.getPosition() > 0.5*_sizeForDir.call(this, nodeSize);

                if(posNext) this.goToNextPage();
                else this.goToPreviousPage();
                // no need to handle prev case since the origin is already the 'previous' page
            }
        }
    }

    function _attachPageSpring() {
        _setSpring.call(this, 0, {period: this.options.pagePeriod, damp: this.options.pageDamp});
        if(!this._springAttached) {
            this._springAttached = true;
            this.physicsEngine.attach([this.spring], this.particle);
        }
    }

    function _setSpring(position, parameters) {
        this._springPosition = position;
        this.spring.setOptions({
            anchor: [this._springPosition, 0, 0],
            period: parameters ? parameters.period : this.options.edgePeriod,
            dampingRatio: parameters ? parameters.damp : this.options.edgeDamp
        });
    }

    function _output(node, offset, target) {
        var size = node.getSize ? node.getSize() : this._contextSize;
        var transform = this._outputFunction(offset);
        target.push({transform: transform, target: node.render()});
        return _sizeForDir.call(this, size);
    }

    function _getClipSize() {
        if(this.options.clipSize) return this.options.clipSize;
        else return _sizeForDir.call(this, this._contextSize);
    }

    /**
     * Returns the position associated with the Scrollview instance's current node
     * (generally the node currently at the top).
     * @method getPosition
     * @param {number} [node] If specified, returns the position of the node at that index in the
     * Scrollview instance's currently managed collection.
     * @return {number} The position of either the specified node, or the Scrollview's current Node,
     * in pixels translated.
     */
    Scrollview.prototype.getPosition = function(node) {
        var pos = (this.particle.getPosition()).x;
        if( node === undefined ) return pos;
        else {
            var offset = this._offsets[node];
            if(offset !== undefined) return pos - offset + this._offsetDifferential;
            else return undefined;
        }
    };

    /**
     * Sets position of the physics particle that controls Scrollview instance's "position"
     * @method setPosition
     * @param {number} pos The amount of pixels you want your scrollview to progress by.
     */
    Scrollview.prototype.setPosition = function(pos) {
        this.particle.setPosition([pos, 0, 0]);
    };

    /**
     * Patches the Scrollview instance's options with the passed-in ones.
     * @method setOptions
     * @param {Options} options An object of configurable options for the Scrollview instance.
     */
    Scrollview.prototype.setOptions = function(options) {
        this._optionsManager.setOptions(options);

        if(options.direction !== undefined) {
            if(this.options.direction === 'x') this.options.direction = Utility.Direction.X;
            else if(this.options.direction === 'y') this.options.direction = Utility.Direction.Y;
        }
        if(options.clipSize !== undefined) {
            if(options.clipSize !== this.options.clipSize) this._onEdge = 0; // recalculate edge on resize
        }

        if(this.options.margin === undefined) this.options.margin = 0.5*Math.max(window.innerWidth, window.innerHeight);

        this.drag.setOptions({strength: this.options.drag});
        this.friction.setOptions({strength: this.options.friction});

        this.spring.setOptions({
            period: this.options.edgePeriod,
            dampingRatio: this.options.edgeDamp
        });

        this.sync.setOptions({
            rails: this.options.rails,
            direction: (this.options.direction == Utility.Direction.X) ? GenericSync.DIRECTION_X : GenericSync.DIRECTION_Y
        });
    };

    /**
     * setOutputFunction is used to apply a user-defined output transform on each processed renderable.
     * For a good example, check out Scrollview's own DEFAULT_OUTPUT_FUNCTION in the code, or the DynamicScroll demo.
     * @method setOutputFunction
     * @param {Function} outputFunction An output processer for each renderable in the Scrollview
     * instance.
     */
    Scrollview.prototype.setOutputFunction = function(fn, masterFn) {
        if(!fn) {
            fn = (function(offset) {
                return (this.options.direction == Utility.Direction.X) ? Transform.translate(offset, 0) : Transform.translate(0, offset);
            }).bind(this);
            if(!masterFn) masterFn = fn;
        }
        this._outputFunction = fn;
        this._masterOutputFunction = masterFn ? masterFn : function(offset) {
            return Transform.inverse(fn(-offset));
        };
    };

    /**
     * goToPreviousPage paginates your Scrollview instance backwards by one item.
     * @method goToPreviousPage
     * @return {ViewSequence} The previous node.
     */
    Scrollview.prototype.goToPreviousPage = function() {
        if(!this.node) return;
        var prevNode = this.node.getPrevious ? this.node.getPrevious() : null;
        if(prevNode) {
            var positionModification = _sizeForDir.call(this, this.node.getSize());
            this.node = prevNode;
            this._springPosition -= positionModification;
            _shiftOrigin.call(this, positionModification);
            _attachPageSpring.call(this);
        }
        return prevNode;
    };

    /**
     * goToNextPage paginates your Scrollview instance forwards by one item.
     * @method goToNextPage
     * @return {ViewSequence} The next node.
     */
    Scrollview.prototype.goToNextPage = function() {
        if(!this.node) return;
        var nextNode = this.node.getNext ? this.node.getNext() : null;
        if(nextNode) {
            var positionModification = _sizeForDir.call(this, this.node.getSize());
            this.node = nextNode;
            this._springPosition += positionModification;
            _shiftOrigin.call(this, -positionModification);
            _attachPageSpring.call(this);
        }
        return nextNode;
    };

    /**
     * Returns the Scrollview instance's current node (generally the node currently at the top).
     * The current node is a Famous ViewSequence used to obtain information about the next
     * and previous ViewSequences.
     * @method getCurrentNode
     * @return {ViewSequence} The Node your Scrollview instance is currently sequencing from.
     */
    Scrollview.prototype.getCurrentNode = function() {
        return this.node;
    };

    /**
     * Sets the collection of renderables under the Scrollview instance's control, by
     * setting its current node to the passed in ViewSequence. If you
     * pass in an array, the Scrollview instance will set its node as a ViewSequence instantiated with
     * the passed-in array.
     *
     * @method sequenceFrom
     * @param {Array|ViewSequence} sequence Either an array of renderables or a Famous viewSequence.
     */
    Scrollview.prototype.sequenceFrom = function(node) {
        if(node instanceof Array) node = new ViewSequence(node);
        this.node = node;
        this._lastFrameNode = node;
    };

    /**
     * Returns the width and the height of the Scrollview instance.
     *
     * @method getSize
     * @return {Array} A two value array of the Scrollview instance's current width and height (in that order).
     */
    Scrollview.prototype.getSize = function() {
        return this._size;
    };

    Scrollview.prototype.render = function() {
        if(!this.node) return;
        return this._entityId;
    };

    Scrollview.prototype.commit = function(context) {
        var transform = context.transform;
        var opacity = context.opacity;
        var origin = context.origin;
        var size = context.size;

        // reset edge detection on size change
        if(!this.options.clipSize && (size[0] !== this._contextSize[0] || size[1] !== this._contextSize[1])) {
            this._onEdge = 0;
            this._contextSize = size;

            if(this.options.direction === Utility.Direction.X) {
                this._size[0] = _getClipSize.call(this);
                this._size[1] = undefined;
            }
            else {
                this._size[0] = undefined;
                this._size[1] = _getClipSize.call(this);
            }
        }

        // _normalizeState.call(this);
        var pos = this.getPosition();
        var scrollTransform = this._masterOutputFunction(-(pos + this._masterOffset));

        return {
            transform: Transform.multiply(transform, scrollTransform),
            opacity: opacity,
            origin: origin,
            target: this.group.render()
        };
    };

    function _innerRender() {
        var offsets = {};
        var pos = this.getPosition();
        var result = [];

        var edgeDetected = 0; // -1 for top, 1 for bottom

        // forwards
        var offset = 0;
        var currNode = this.node;
        offsets[currNode] = 0;
        while(currNode && offset - pos < _getClipSize.call(this) + this.options.margin) {
            offset += _output.call(this, currNode, offset + this._masterOffset, result);
            currNode = currNode.getNext ? currNode.getNext() : null;
            offsets[currNode] = offset;
            if(!currNode && offset - pos <= _getClipSize.call(this)) {
                if(!this._onEdge) _setSpring.call(this, offset - _getClipSize.call(this));
                edgeDetected = 1;
            }
        }

        // backwards
        currNode = (this.node && this.node.getPrevious) ? this.node.getPrevious() : null;
        offset = 0;
        if(currNode) {
            var size = currNode.getSize ? currNode.getSize() : this._contextSize;
            offset -= _sizeForDir.call(this, size);
        }
        else {
            if(pos <= 0) {
                if(!this._onEdge) _setSpring.call(this, 0);
                edgeDetected = -1;
            }
        }
        while(currNode && ((offset - pos) > -(_getClipSize.call(this) + this.options.margin))) {
            offsets[currNode] = offset;
            _output.call(this, currNode, offset + this._masterOffset, result);
            currNode = currNode.getPrevious ? currNode.getPrevious() : null;
            if(currNode) {
                var size = currNode.getSize ? currNode.getSize() : this._contextSize;
                offset -= _sizeForDir.call(this, size);
            }
        }

        this._offsetDifferential = 0;
        this._offsets = offsets;

        _handleEdge.call(this, edgeDetected);
        _handlePagination.call(this);

        if(this.options.paginated && (this._lastFrameNode !== this.node)) {
            console.log(this.node)
            this.eventOutput.emit('pageChange');
            this._lastFrameNode = this.node;
        }

        return result;
    }

    module.exports = Scrollview;

});

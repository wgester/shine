define(function(require, exports, module) {
    var Surface          = require('famous/core/Surface');
    var Modifier         = require('famous/core/Modifier');
    var Transform        = require('famous/core/Transform');
    var View             = require('famous/core/View');
    var ImageSurface     = require("famous/surfaces/ImageSurface");
    var ContainerSurface = require("famous/surfaces/ContainerSurface");

    function PageView() {
        View.apply(this, arguments);

        _createBackgroundSurface.call(this);
    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.DEFAULT_OPTIONS = {};

    function _createBackgroundSurface() {
        this.container = new ContainerSurface({
            properties:{
                overflow: 'hidden'
            }
        });
        var view = new View();
        this.backgroundSurface = new Surface({
            content: '<img height="' + window.innerHeight + '" src="' + this.options.backgroundUrl + '"/>'
        });
        this.backgroundModifier = new Modifier({
            transform: Transform.translate(this.options.start, 0, 0)
        });
        view._add(this.backgroundModifier).add(this.backgroundSurface);
        this.container.add(view);
        this.backgroundSurface.pipe(this._eventOutput);

        this._add(this.container); 
    }

    PageView.prototype.transition = function(){
        this.backgroundModifier.setTransform(Transform.translate(this.options.end, 0, 0), {
            duration: 3000,
            curve: 'easeInOut'
        });
    }

    PageView.prototype.resetTransition = function() {
        this.backgroundModifier.setTransform(Transform.translate(this.options.start, 0, 0));
    }

    module.exports = PageView;
});
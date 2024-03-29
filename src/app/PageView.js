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
        this.backgroundContainer = new ContainerSurface({
            properties:{
                overflow: 'hidden'
            }
        });
        var backgroundView = new View();
        this.backgroundSurface = new Surface({
            content: '<img height="' + window.innerHeight + '" src="' + this.options.backgroundUrl + '.png"/>'
        });
        this.backgroundModifier = new Modifier({
            transform: Transform.translate(this.options.start, 0, 0)
        });
        backgroundView._add(this.backgroundModifier).add(this.backgroundSurface);
        this.backgroundContainer.add(backgroundView);

        this._add(this.backgroundContainer); 


        this.foregroundContainer = new ContainerSurface({
            properties:{
                overflow: 'hidden'
            }
        });
        var foregroundView = new View();

        this.foregroundSurface = new Surface({
            content: '<img height="' + window.innerHeight + '" src="' + this.options.backgroundUrl + 'Head.png"/>'
        });
        this.foregroundModifier = new Modifier({
            transform: Transform.translate(this.options.start, 0, 2)
        });

        this.foregroundContainerModifier = new Modifier({
            transform: Transform.translate(0, 0, 2)
        });

        foregroundView._add(this.foregroundModifier).add(this.foregroundSurface);
        this.foregroundContainer.add(foregroundView);

        this.foregroundSurface.pipe(this._eventOutput);

        this._add(this.foregroundContainerModifier).add(this.foregroundContainer); 
    }

    PageView.prototype.transition = function(){
        this.backgroundModifier.setTransform(Transform.translate(this.options.end, 0, 0), {
            duration: 3000,
            curve: 'easeInOut'
        });
        this.foregroundModifier.setTransform(Transform.translate(this.options.end, 0, 2), {
            duration: 3000,
            curve: 'easeInOut'
        });
    }

    PageView.prototype.resetTransition = function() {
        this.backgroundModifier.setTransform(Transform.translate(this.options.start, 0, 0));
        this.foregroundModifier.setTransform(Transform.translate(this.options.start, 0, 2));
    }

    module.exports = PageView;
});
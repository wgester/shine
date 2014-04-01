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
        this.backgroundSurface = new Surface({
            content: '<img height="' + window.innerHeight + '" src="' + this.options.backgroundUrl + '"/>'
        });
        this.backgroundModifier = new Modifier({
            transform: Transform.translate(-500, 0, 0)
        });

        var view = new View();
        view._add(this.backgroundModifier).add(this.backgroundSurface);
        this.container.add(view);

        this._add(this.container); 
    }

    module.exports = PageView;
});
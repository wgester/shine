define(function(require, exports, module) {
    var Surface         = require('famous/core/Surface');
    var Modifier        = require('famous/core/Modifier');
    var Transform       = require('famous/core/Transform');
    var View            = require('famous/core/View');
    var PageSwipe      = require('./PageSwipe');

    var PageView        = require('./PageView');

    function AppView() {
        View.apply(this, arguments);
        this.pages = [];

        _createPageViews.call(this);
    }

    AppView.prototype = Object.create(View.prototype);
    AppView.prototype.constructor = AppView;

    AppView.DEFAULT_OPTIONS = {};

    var images = [['img/svelteMan.png', -140, -480], ['img/swimmer.png', 0, -310], ['img/soccerPlayer.png', -70, -315], ['img/breakDancer.png', 0, -220]];

    function _createPageViews() {
        this.pageSwipe = new PageSwipe({
            direction: 'x',
            paginated: true
        });
        for (var i = 0; i < images.length; i++) {
            var pageView = new PageView({
                backgroundUrl : images[i][0],
                start : images[i][1],
                end : images[i][2]
            });
            this.pageSwipe.pipe(pageView);
            pageView._eventOutput.pipe(this.pageSwipe);
            this.pages.push(pageView);
        }
        this.pageSwipe.sequenceFrom(this.pages);
        this._add(this.pageSwipe);
    }

    module.exports = AppView;
});
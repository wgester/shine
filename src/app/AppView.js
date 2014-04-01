define(function(require, exports, module) {
    var Surface         = require('famous/core/Surface');
    var Modifier        = require('famous/core/Modifier');
    var Transform       = require('famous/core/Transform');
    var View            = require('famous/core/View');
    var ScrollView      = require('famous/views/ScrollView');

    var PageView        = require('./PageView');

    function AppView() {
        View.apply(this, arguments);
        this.pages = [];

        _createPageViews.call(this);
    }

    AppView.prototype = Object.create(View.prototype);
    AppView.prototype.constructor = AppView;

    AppView.DEFAULT_OPTIONS = {};

    var images = [['img/svelteMan.png', -140, -480], ['img/swimmer.png', -70, -410]];

    function _createPageViews() {
        this.scrollView = new ScrollView({
            direction: 'x',
            paginated: true
        });
        for (var i = 0; i < images.length; i++) {
            var pageView = new PageView({
                backgroundUrl : images[i][0],
                start : images[i][1],
                end : images[i][2]
            });
            this.scrollView.pipe(pageView);
            pageView._eventOutput.pipe(this.scrollView);
            this.pages.push(pageView);
        }
        this.scrollView.sequenceFrom(this.pages);
        this._add(this.scrollView);
    }

    module.exports = AppView;
});
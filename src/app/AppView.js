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
        this.prevIndex = 0;

        _createPageViews.call(this);
        _addFacebookOverlay.call(this);
        _addEmailOverlay.call(this);
        _addTextOverlay.call(this);
        _pageSwipeEventHandler.call(this);
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

    function _addFacebookOverlay() {
        var facebook = new Surface({
            content: '<img height="50" width="120" src="img/facebook.png"/>',
            size: [50,120]
            });
        var facebookModifier = new Modifier({
            transform: Transform.translate(170, 470, 0)
        });
        console.log('add border-radius')
        this._add(facebookModifier).add(facebook);
    };

    function _addEmailOverlay() {
        var email = new Surface({
            content: '<img height="50" width="120" src="img/email.png"/>',
            size: [50,120]
            });
        var emailModifier = new Modifier({
            transform: Transform.translate(28, 470, 0)
        });
        this._add(emailModifier).add(email);
    };

    function _addTextOverlay() {
        this.shine = new Surface({
            size: [0,0],
            content: 'SHINE',
            properties: {
                fontFamily: 'Comic Sans, Comic Sans MS, cursive',
                fontSize: '4em',
                color:'white'
            }
        });
        this.shineModifier = new Modifier({
            transform: Transform.translate(8, 20, 0)
        });
        this._add(this.shineModifier).add(this.shine);
    };

    function _shineTransition() {
        this.shineModifier.setTransform(Transform.translate(20, 0, 0), {
            duration: 3000,
            curve: 'easeInOut'
        });
    };

    function _pageSwipeEventHandler() {
        this.pageSwipe.eventOutput.on('pageChange', _transitionBackground.bind(this));
    };

    function _transitionBackground(index) {
        if (this.prevIndex > index) {
            setTimeout(function(){
                if (this.pages[index - 1]) this.pages[index - 1].resetTransition();
            }.bind(this), 350);
        } else if (index < this.prevIndex) {
            setTimeout(function(){
                if (this.pages[index + 1]) this.pages[index + 1].resetTransition();
            }.bind(this), 350);
        }
        this.pages[index].transition();
        this.prevIndex = index;
    };

    module.exports = AppView;
});
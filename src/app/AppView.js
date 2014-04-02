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
        _addNavbar.call(this);
        _pageSwipeEventHandler.call(this);
        this.pages[0].transition();
    }

    AppView.prototype = Object.create(View.prototype);
    AppView.prototype.constructor = AppView;

    AppView.DEFAULT_OPTIONS = {};

    var stories = {
        0:'An elegant personal activity tracker<br>you can wear anywhere.',
        1: 'Walk, cycle, swim or sleep,<br>Shine tracks your activity level.',
        2: 'Use the app to see activity trends and watch<br>yourself improve over time.',
        3: 'Crafted from solid aluminum,<br>Shine is ready for wherever life takes you.'
    };

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
            size: [50,120],
            properties: {
                borderRadius: '3px'
            }
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

        var account = new Surface({
            size: [undefined,0],
            content: 'Already have an account? <b>Sign in now.</b>',
            properties: {
                fontFamily: 'Comic Sans, Comic Sans MS, cursive',
                fontSize: '1em',
                color:'white',
                textAlign: 'center'
            }
        });
        var accountModifier = new Modifier({
            transform: Transform.translate(0, 530, 0)
        });
        this._add(accountModifier).add(account);

        var text = new Surface({
            size: [undefined,0],
            content: stories[0],
            properties: {
                fontFamily: 'Comic Sans, Comic Sans MS, cursive',
                fontSize: '1em',
                color:'white',
                textAlign: 'center'
            }
        });
        var textModifier = new Modifier({
            transform: Transform.translate(0, 410, 0)
        });
        this._add(textModifier).add(text);
    };

    function _addNavbar() {
        var navbar = new Surface({
            content: '<img width="' + window.innerWidth + '" src="img/navbar.png"/>',
            size: [undefined,20]
            });
    
        this._add(navbar);
    };

    function _pageSwipeEventHandler() {
        this.pageSwipe.eventOutput.on('pageChange', _transitionBackground.bind(this));
    };

    function _transitionBackground(index) {
        if (this.prevIndex > index) {
            setTimeout(function(){
                if (this.pages[index + 1]) this.pages[index + 1].resetTransition();
            }.bind(this), 350);
            this.shineModifier.setTransform(Transform.translate(8 + 20 * index, 20, 0), {
                duration: 2000
            });
        } else if (index > this.prevIndex) {
            setTimeout(function(){
                if (this.pages[index - 1]) this.pages[index - 1].resetTransition();
            }.bind(this), 350);
            this.shineModifier.setTransform(Transform.translate(8 + 20 * index, 20, 0), {
                duration: 2000
            });
        }
        this.pages[index].transition();
        this.prevIndex = index;
    };

    module.exports = AppView;
});
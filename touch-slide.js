function TouchSlide (container, options) {
  "use strict";

  var noop = function () {}
  var offloadFn = function(fn) { setTimeout(fn || noop, 0); }

  // check browser capabilities
  var browser = {
    addEventListener: !!window.addEventListener,
    touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
    transitions: (function(temp) {
      var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
      for ( var i in props ) if (temp.style[ props[i] ] !== undefined) return true;
      return false;
    })(document.createElement('slide'))
  };

  if(!container) return;
  var element = container.children[0],
      options = options || {},
      space = options.space || 10,
      index = options.index || 0,
      speed = options.speed || 300,
      slides = element.children,
      slidePos;

  function next () {
    if(index + 1 > slides.length - 1)return;
    slide(index + 1);
  }
  function prev () {
    if(index - 1 < 0)return;
    slide(index - 1);
  }
  function circle(index) {
    index % slides.length;
  }
  function translate (dist, speed) {
    var style = element && element.style;

    if(!style)return;

    style.webkitTransitionDuration =
    style.MozTransitionDuration =
    style.msTransitionDuration =
    style.OTransitionDuration =
    style.transitionDuration = speed + 'ms';

    style.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
    style.msTransform =
    style.MozTransform =
    style.OTransform = 'translateX(' + dist + 'px)';
  }

  function slide(to, speed) {
    var l = slides.length, elWidth = (element.getBoundingClientRect().width - container.getBoundingClientRect().width) || (element.offsetWidth - container.offsetWidth);
    if(elWidth<0)elWidth = 0;
    if(to > l - 1)return;
    if(elWidth > slidePos[to]) {
      translate(-slidePos[to], speed);
      index = to;
    } else {
      translate(-elWidth, speed);
      var i = 0;
      do { if(slidePos[i] >= elWidth){ index = i; break; };i++; } while(i < l);
    }

    offloadFn(options.callback && options.callback(index, slides[index]));
  }

  function setup () {
    if(slides.length < 2)return;

    slidePos = new Array(slides.length);

    var originLeft = slides[0].offsetLeft, pos = slides.length;
    while(pos--) {
      var slideP = slides[pos];

      slideP.setAttribute("data-index", pos);

      slidePos[pos] = slideP.offsetLeft - originLeft;
    }

    slide(index, speed);
  }

  var start = {}, delta = {}, isScrolling;

  var events = {

    handleEvent: function(event) {
      switch (event.type) {
        case 'touchstart': this.start(event); break;
        case 'touchmove': this.move(event); break;
        case 'touchend': offloadFn(this.end(event)); break;
        case 'webkitTransitionEnd':
        case 'msTransitionEnd':
        case 'oTransitionEnd':
        case 'otransitionend':
        case 'transitionend': offloadFn(this.transitionEnd(event)); break;
        case 'resize': offloadFn(setup); break;
      }

      if (options.stopPropagation) event.stopPropagation();

    },
    start: function (event) {
      var touches = event.touches[0];

      // measure start values
      start = {
        // get initial touch coords
        x: touches.pageX,
        y: touches.pageY,

        // store time to determine touch duration
        time: +new Date
      }

      // used for testing first move event
      isScrolling = undefined;

      // reset delta and end measurements
      delta = {};

      // attach touchmove and touchend listeners
      element.addEventListener('touchmove', this, false);
      element.addEventListener('touchend', this, false);
    },
    move: function (event) {
      // ensure swiping with one touch and not pinching
      if (event.touches.length > 1 || event.scale && event.scale !== 1) return;

      if (options.disableScroll) event.preventDefault();

      var touches = event.touches[0];

      // measure change in x and y
      delta = {
        x: touches.pageX - start.x,
        y: touches.pageY - start.y
      }

      // determine if scrolling test has run - one time test
      if ( typeof isScrolling == 'undefined') {
        isScrolling = !!( isScrolling || Math.abs(delta.x) < Math.abs(delta.y) );
      }

      // if user is not trying to scroll vertically
      if (!isScrolling) {
        // prevent native scrolling
        event.preventDefault();
      }
    },
    end: function (event) {
      // measure duration
      var duration = +new Date - start.time;

      // determine if slide attempt triggers next/prev slide
      var isValidSlide =
            Number(duration) < 250               // if slide duration is less than 250ms
            && Math.abs(delta.x) > 20            // and if slide amt is greater than 20px
            || Math.abs(delta.x) > (container.getBoundingClientRect().width || container.offsetWidth)/2;      // or if slide amt is greater than half the width

      if(!isScrolling && isValidSlide) {
        //delta.x > 0 #=> true:right, false:left
        delta.x > 0 ? prev() : next();
      }

      // kill touchmove and touchend event listeners until touchstart called again
      element.removeEventListener('touchmove', events, false)
      element.removeEventListener('touchend', events, false)
    },
    transitionEnd: function (event) {
      options.transitionEnd && options.transitionEnd.call(this, event, index, slides[index]);
    }
  }

  setup();

  // add event listeners
  if (browser.addEventListener) {

    // set touchstart event on element
    if (browser.touch) element.addEventListener('touchstart', events, false);

    if (browser.transitions) {
      element.addEventListener('webkitTransitionEnd', events, false);
      element.addEventListener('msTransitionEnd', events, false);
      element.addEventListener('oTransitionEnd', events, false);
      element.addEventListener('otransitionend', events, false);
      element.addEventListener('transitionend', events, false);
    }

    // set resize event on window
    window.addEventListener('resize', events, false);

  } else {

    window.onresize = function () { setup() }; // to play nice with old IE

  }

  return {
    next: function () { next(); },
    prev: function () { prev(); },
    slide: function (to, speed) { slide(to, speed); }
  }
}

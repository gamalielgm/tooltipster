/*

Tooltipster 2.2 | 10/26/13
A rockin' custom tooltip jQuery plugin

Developed by: Caleb Jacob - calebjacob.com
Released under the MIT license

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;(function ($, window, document, undefined) {

	var pluginName = "tooltipster",
		defaults = {
			animation: 'fade',
			arrow: true,
			arrowColor: '',
			content: null,
			delay: 200,
			fixedWidth: 0,
			maxWidth: 0,
			functionInit: function(origin, content) {},
			functionBefore: function(origin, continueTooltip) {
				continueTooltip();
			},
			functionReady: function(origin, tooltip) {},
			functionAfter: function(origin) {},
			icon: '(?)',
			iconDesktop: false,
			iconTouch: false,
			iconTheme: '.tooltipster-icon',
			interactive: false,
			interactiveTolerance: 350,
			interactiveAutoClose: true,
			offsetX: 0,
			offsetY: 0,
			onlyOne: false,
			position: 'top',
			speed: 350,
			timer: 0,
			theme: '.tooltipster-default',
			touchDevices: true,
			trigger: 'hover',
			updateAnimation: true
		};
	
	function Plugin(element, options) {
		
		// list of instance variables
		
		this.checkInterval = null;
		// this will be the user content shown in the tooltip
		this.content;
		// this is the original element which is being applied the tooltipster plugin
		this.$el = $(element);
		// this will be the element which triggers the appearance of the tooltip on hover/click/custom events.
		// it will be the same as this.$el if icons are not used (see in the options), otherwise it will correspond to the created icon
		this.$elProxy;
		this.options = $.extend({}, defaults, options);
		this.timer = null;
		// this will be the tooltip element (jQuery wrapped HTML element)
		this.$tooltip;
		this.tooltipArrowReposition;
		
		// launch
		
		this.init();
	}
	
	Plugin.prototype = {
		
		init: function() {
			
			var self = this,
				run = true;
			
			// if this is a touch device and touch devices are disabled, disable the plugin
			if (!self.options.touchDevices && touchDevice) {
				run = false;
			}
			
			// if IE7 or lower, disable the plugin
			if (document.all && !document.querySelector) {
				run = false;
			}

			if (run) {
				
				// the content is null (empty) by default and can stay that way if the plugin remains initialized but not fed any content. The tooltip will just not appear.
				var content = null;
				// if content is provided in the options, its has precedence over the title attribute. Remark : an empty string is considered content, only 'null' represents the absence of content.
				if (self.options.content !== null){
					if(typeof self.options.content === 'object'){
						// clone the object as each instance needs its own version of the content (if a same object was provided for several instances)
						content = self.options.content.clone(true);
					}
					else {
						// other types need no cloning (not passed by reference)
						content = self.options.content;
					}
				}
				else {
					// the same remark as above applies : empty strings (like title="") are considered content and will be shown. Do not define any attribute at all if you want to initialize the plugin without content at start.
					var t = self.$el.attr('title');
					if(typeof t !== 'undefined') content = t;
				}
				
				var c = self.options.functionInit(self.$el, content);
				if(c) content = c;
				
				self.content = content;
				
				self.$el
					// strip the title off of the element to prevent the default tooltips from popping up
					.removeAttr('title')
					// to be able to find all instances on the page later (upon window events in particular)
					.addClass('tooltipstered');

				// detect if we're changing the tooltip origin to an icon
				if ((self.options.iconDesktop) && (!touchDevice) || ((self.options.iconTouch) && (touchDevice))) {
					
					// TODO : the tooltip should be automatically be given an absolute position to be near the origin. Otherwise, when the origin is floating or what, it's going to be nowhere near it and disturb the position flow of the page elements. It will imply that the icon also detects when its origin moves, to follow it : not trivial.
					// Until it's done, the icon feature does not really make sense since the user still has most of the work to do by himself
					
					// if the icon provided is in the form of a string
					if(typeof self.options.icon === 'string'){
						// wrap it in a span with the icon class
						self.$elProxy = $('<span class="'+ self.options.iconTheme.replace('.', '') +'"></span>');
						self.$elProxy.append(self.options.icon);
					}
					// if it is an object (sensible choice)
					else {
						// (deep) clone the object, as every instance needs its own proxy. We use the icon without wrapping, no need to. We do not give it a class either, as the user will undoubtedly style the object on his own and since our css properties may conflict with his own
						self.$elProxy = self.options.icon.clone(true);
					}
					
					self.$elProxy.insertAfter(self.$el);
				}
				else {
					self.$elProxy = self.$el;
				}
				
				// if this is a touch device, add some touch events to launch the tooltip
				if ((self.options.touchDevices) && (touchDevice) && ((self.options.trigger == 'click') || (self.options.trigger == 'hover'))) {
					self.$elProxy.on('touchstart.tooltipster', function() {
						self.showTooltip();
					});
				}
				
				// if this is a desktop, deal with adding regular mouse events
				else {
				
					// if hover events are set to show and hide the tooltip, attach those events respectively
					if (self.options.trigger == 'hover') {
						self.$elProxy.on('mouseenter.tooltipster', function() {
							self.showTooltip();
						});
						
						// if this is an interactive tooltip, delay getting rid of the tooltip right away so you have a chance to hover on the tooltip
						if (self.options.interactive) {
							self.$elProxy.on('mouseleave.tooltipster', function() {
								
								var keepAlive = false;
								
								if (self.$tooltip) {
									self.$tooltip.mouseenter(function() {
										keepAlive = true;
									});
									self.$tooltip.mouseleave(function() {
										keepAlive = false;
									});
									
									var tolerance = setTimeout(function() {

										if (keepAlive) {
											if (self.options.interactiveAutoClose) {

												self.$tooltip.mouseleave(function(e) {
													var $target = $(e.target);

													if ($target.parents('.tooltipster-base').length === 0 || $target.hasClass('tooltipster-base')) {
														self.hideTooltip();
													}

													else {
														$target.on('mouseleave', function(e) {
															self.hideTooltip();
														});
													}
												});
											}
										}
										else {
											self.hideTooltip();
										}
									}, self.options.interactiveTolerance);
								}
								else {
									self.hideTooltip();
								}
							});
						}
						
						// if this is a dumb tooltip, just get rid of it on mouseleave
						else {
							self.$elProxy.on('mouseleave.tooltipster', function() {
								self.hideTooltip();
							});
						}
					}
					
					// if click events are set to show and hide the tooltip, attach those events respectively
					else if (self.options.trigger == 'click') {
						self.$elProxy.on('click.tooltipster', function() {
							if (!self.$tooltip) {
								self.showTooltip();
							}
							else {
								self.hideTooltip();
							}
						});
					}
				}
			}
		},
		
		showTooltip: function(options) {
			
			var self = this;
			
			// continue if this tooltip is enabled and has any content, otherwise just ignore it completely
			if (!self.$elProxy.hasClass('tooltipster-disable') && self.content !== null) {
			
				// if we only want one tooltip open at a time, close all tooltips currently open and not already dying
				if(self.options.onlyOne){
					$('.tooltipstered').not(self.$el).not('.tooltipster-dying')
						.addClass('tooltipster-kill')
						// hide using the object public method
						[pluginName]('hide');
				}
				
				//get rid of any appearance effect that might be queued
				self.$elProxy.clearQueue();
				// delay the showing of the tooltip according to the delay time, if there is one
				if(self.options.delay > 0) self.$elProxy.delay(self.options.delay);
				
				self.$elProxy.queue(function() {
				
					// call our custom function before continuing
					self.options.functionBefore(self.$elProxy, function() {
						
						// if this origin already has its tooltip open, keep it open and do nothing else
						if (self.$tooltip) {
							
							if (!self.$tooltip.hasClass('tooltipster-kill')) {
	
								var animation = 'tooltipster-'+ self.options.animation;
								
								self.$tooltip.removeClass('tooltipster-dying');
								
								if (supportsTransitions()) {
									self.$tooltip.clearQueue().addClass(animation +'-show');
								}
								
								if (self.options.timer > 0) {
									
									// if we have a timer set, we need to reset it
									clearTimeout(self.timer);
									
									self.timer = setTimeout(function() {
										self.timer = null;
										self.hideTooltip();
									}, self.options.timer);
								}
								
								// if this is a touch device, hide the tooltip on body touch
								if ((self.options.touchDevices) && (touchDevice)) {
									
									//reference the anonymous function for specific unbinding
									var f = function(event) {
										if (self.options.interactive) {
											var touchTarget = $(event.target),
												closeTooltip = true;
											
											touchTarget.parents().each(function() {
												if ($(this).hasClass('tooltipster-base')) {
													closeTooltip = false;
												}
											});
											
											if (closeTooltip) {
												self.hideTooltip();
												$('body').off(f);
											}
										}
										else {
											self.hideTooltip();
											$('body').off(f);
										}
									};
									
									$('body').on('touchstart.tooltipster', f);
								}
							}
						}
						
						// if the tooltip isn't already open, open that sucker up!
						else {
							// disable horizontal scrollbar to keep overflowing tooltips from jacking with it and then restore it to its previous value
							self.options._bodyOverflowX = $('body').css('overflow-x');
							$('body').css('overflow-x', 'hidden');
							
							// get some other settings related to building the tooltip
							var theme = self.options.theme,
								themeClass = theme.replace('.', ''),
								animation = 'tooltipster-' + self.options.animation,
								animationSpeed = '-webkit-transition-duration: '+ self.options.speed +'ms; -webkit-animation-duration: '+ self.options.speed +'ms; -moz-transition-duration: '+ self.options.speed +'ms; -moz-animation-duration: '+ self.options.speed +'ms; -o-transition-duration: '+ self.options.speed +'ms; -o-animation-duration: '+ self.options.speed +'ms; -ms-transition-duration: '+ self.options.speed +'ms; -ms-animation-duration: '+ self.options.speed +'ms; transition-duration: '+ self.options.speed +'ms; animation-duration: '+ self.options.speed +'ms;',
								fixedWidth = self.options.fixedWidth > 0 ? 'width:'+ Math.round(self.options.fixedWidth) +'px;' : '',
								maxWidth = self.options.maxWidth > 0 ? 'max-width:'+ Math.round(self.options.maxWidth) +'px;' : '',
								pointerEvents = self.options.interactive ? 'pointer-events: auto;' : '';
							
							// build the base of our tooltip
							self.$tooltip = $('<div class="tooltipster-base '+ themeClass +' '+ animation +'" style="'+ fixedWidth +' '+ maxWidth +' '+ pointerEvents +' '+ animationSpeed +'"><div class="tooltipster-content"></div></div>');
							self.$tooltip
								.children()
									.append(self.content)
									.end()
								.appendTo('body');
							
							// do all the crazy calculations and positioning
							self.positionTooltip();
							
							// call our custom callback since the content of the tooltip is now part of the DOM
							self.options.functionReady(self.$el, self.$tooltip);
							
							// animate in the tooltip
							if (supportsTransitions()) {
								self.$tooltip.addClass(animation + '-show');
							}
							else {
								self.$tooltip.css('display', 'none').removeClass(animation).fadeIn(self.options.speed);
							}
							
							// check to see if our tooltip origin is removed while the tooltip is alive
							self.setCheckInterval();
							
							// if we have a timer set, let the countdown begin!
							if (self.options.timer > 0) {
								self.timer = setTimeout(function() {
									self.timer = null;
									self.hideTooltip();
								}, self.options.timer + self.options.speed);
							}
							
							// if this is a touch device, hide the tooltip on body touch
							if ((self.options.touchDevices) && (touchDevice)) {
								
								var f = function(event) {
									if (self.options.interactive) {
										
										var touchTarget = $(event.target),
											closeTooltip = true;
										
										touchTarget.parents().each(function() {
											if ($(this).hasClass('tooltipster-base')) {
												closeTooltip = false;
											}
										});
										
										if (closeTooltip) {
											self.hideTooltip();
											$('body').off(f);
										}
									}
									else {
										self.hideTooltip();
										$('body').off(f);
									}
								};
								
								$('body').on('touchstart.tooltipster', f);
							}
						}
					});
					
					self.$elProxy.dequeue();
				});
			}
		},
		
		setCheckInterval: function(){
			
			var self = this;
			
			self.checkInterval = setInterval(function() {
				
				// if this tooltip's origin is removed, remove the tooltip if it's still here
				if ($('body').find(self.$el).length === 0 && self.$tooltip) {
					self.hideTooltip();
				}
				
				// clear this interval if it is no longer necessary
				if (
						// if the origin has been removed
						($('body').find(self.$el).length === 0)
						// if the elProxy has been removed
					||	($('body').find(self.$elProxy).length === 0)
						// if the tooltip has been closed
					||	!self.$tooltip
						// if the tooltip has been somehow removed
					||	($('body').find(self.$tooltip).length === 0)
				) {
					self.cancelCheckInterval();
				}
			}, 200);
		},
		
		cancelCheckInterval: function(){
			clearInterval(this.checkInterval);
			// clean delete
			this.checkInterval = null;
		},
		
		hideTooltip: function() {
			
			var self = this;
			
			//TODO : remove this unless there is a good reason behind that
			// if the origin has been removed, find all tooltips assigned to death
			// if (!tooltipster) {
				// tooltipster = $('.tooltipster-dying');
			// }
			
			// clear any possible queues handling delays and such
			self.$elProxy.clearQueue();
			
			if (self.$tooltip) {
				
				// just in case we needed to clear a timer
				clearTimeout(self.timer);
				self.timer = null;

				var animation = 'tooltipster-'+ self.options.animation;
				
				if (supportsTransitions()) {
					
					self.$tooltip
						.clearQueue()
						.removeClass(animation +'-show')
						.addClass('tooltipster-dying');
					
					if(self.options.speed > 0) self.$tooltip.delay(self.options.speed);
					
					self.$tooltip.queue(function() {
						self.$tooltip.remove();
						self.$tooltip = null;
						$('body').css('overflow-x', self.options._bodyOverflowX);
						
						// finally, call our custom callback function
						self.options.functionAfter(self.$elProxy);
					});
				}
				else {
					self.$tooltip
						.clearQueue()
						.addClass('tooltipster-dying')
						.fadeOut(self.options.speed, function() {
							self.$tooltip.remove();
							self.$tooltip = null;
							$('body').css('overflow-x', self.options._bodyOverflowX);
							
							// finally, call our custom callback function
							self.options.functionAfter(self.$elProxy);
						});
				}
			}
		},
		
		updateTooltip: function(data){
			
			var self = this;
			
			self.content = data;
			
			if(self.content !== null){
				
				// update the tooltip if it is open
				if(self.$tooltip){
				
					// set the new content in the tooltip
					self.$tooltip.find('.tooltipster-content')
						.empty()
						.append(self.content);
					
					// if we want to play a little animation showing the content changed
					if (self.options.updateAnimation) {
						if (supportsTransitions()) {
							self.$tooltip.css({
								'width': '',
								'-webkit-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
								'-moz-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
								'-o-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
								'-ms-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
								'transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms'
							}).addClass('tooltipster-content-changing');
							
							// reset the CSS transitions and finish the change animation
							setTimeout(function() {
								self.$tooltip.removeClass('tooltipster-content-changing');
								// after the changing animation has completed, reset the CSS transitions
								setTimeout(function() {
									self.$tooltip.css({
										'-webkit-transition': self.options.speed + 'ms',
										'-moz-transition': self.options.speed + 'ms',
										'-o-transition': self.options.speed + 'ms',
										'-ms-transition': self.options.speed + 'ms',
										'transition': self.options.speed + 'ms'
									});
								}, self.options.speed);
							}, self.options.speed);
						}
						else {
							self.$tooltip.fadeTo(self.options.speed, 0.5, function() {
								self.$tooltip.fadeTo(self.options.speed, 1);
							});
						}
					}
					
					// reposition and resize the tooltip
					self.positionTooltip();
				}
			}
			else {
				self.hideTooltip();
			}
		},

		positionTooltip: function() {

			var self = this;
			
			if (self.$tooltip) {
				
				// reset width
				self.$tooltip.css('width', '');
				
				// find variables to determine placement
				var windowWidth = $(window).width(),
					containerWidth = self.$elProxy.outerWidth(false),
					containerHeight = self.$elProxy.outerHeight(false),
					tooltipWidth = self.$tooltip.outerWidth(false),
					tooltipInnerWidth = self.$tooltip.innerWidth() + 1, // this +1 stops FireFox from sometimes forcing an additional text line
					tooltipHeight = self.$tooltip.outerHeight(false),
					offset = self.$elProxy.offset(),
					offsetTop = offset.top,
					offsetLeft = offset.left,
					resetPosition = null;
				
				// if this is an <area> tag inside a <map>, all hell breaks loose. Recaclulate all the measurements based on coordinates
				if (self.$elProxy.is('area')) {
					var areaShape = self.$elProxy.attr('shape'),
						mapName = self.$elProxy.parent().attr('name'),
						map = $('img[usemap="#'+ mapName +'"]'),
						mapOffsetLeft = map.offset().left,
						mapOffsetTop = map.offset().top,
						areaMeasurements = self.$elProxy.attr('coords') !== undefined ? self.$elProxy.attr('coords').split(',') : undefined;
					
					if (areaShape == 'circle') {
						var areaLeft = parseInt(areaMeasurements[0]),
							areaTop = parseInt(areaMeasurements[1]),
							areaWidth = parseInt(areaMeasurements[2]);
						containerHeight = areaWidth * 2;
						containerWidth = areaWidth * 2;
						offsetTop = mapOffsetTop + areaTop - areaWidth;
						offsetLeft = mapOffsetLeft + areaLeft - areaWidth;
					}
					else if (areaShape == 'rect') {
						var areaLeft = parseInt(areaMeasurements[0]),
							areaTop = parseInt(areaMeasurements[1]),
							areaRight = parseInt(areaMeasurements[2]),
							areaBottom = parseInt(areaMeasurements[3]);
						containerHeight = areaBottom - areaTop;
						containerWidth = areaRight - areaLeft;
						offsetTop = mapOffsetTop + areaTop;
						offsetLeft = mapOffsetLeft + areaLeft;
					}
					else if (areaShape == 'poly') {
						var areaXs = [],
							areaYs = [],
							areaSmallestX = 0,
							areaSmallestY = 0,
							areaGreatestX = 0,
							areaGreatestY = 0,
							arrayAlternate = 'even';
						
						for (i = 0; i < areaMeasurements.length; i++) {
							var areaNumber = parseInt(areaMeasurements[i]);
							
							if (arrayAlternate == 'even') {
								if (areaNumber > areaGreatestX) {
									areaGreatestX = areaNumber;
									if (i === 0) {
										areaSmallestX = areaGreatestX;
									}
								}
								
								if (areaNumber < areaSmallestX) {
									areaSmallestX = areaNumber;
								}
								
								arrayAlternate = 'odd';
							}
							else {
								if (areaNumber > areaGreatestY) {
									areaGreatestY = areaNumber;
									if (i == 1) {
										areaSmallestY = areaGreatestY;
									}
								}
								
								if (areaNumber < areaSmallestY) {
									areaSmallestY = areaNumber;
								}
								
								arrayAlternate = 'even';
							}
						}
					
						containerHeight = areaGreatestY - areaSmallestY;
						containerWidth = areaGreatestX - areaSmallestX;
						offsetTop = mapOffsetTop + areaSmallestY;
						offsetLeft = mapOffsetLeft + areaSmallestX;
					}
					else {
						containerHeight = map.outerHeight(false);
						containerWidth = map.outerWidth(false);
						offsetTop = mapOffsetTop;
						offsetLeft = mapOffsetLeft;
					}
				}
				
				// hardcoding the width and removing the padding fixed an issue with the tooltip width collapsing when the window size is small
				if(self.options.fixedWidth === 0) {
					self.$tooltip.css({
						'width': Math.round(tooltipInnerWidth) + 'px',
						'padding-left': '0px',
						'padding-right': '0px'
					});
				}
				
				// our function and global vars for positioning our tooltip
				var myLeft = 0,
					myLeftMirror = 0,
					myTop = 0,
					offsetY = parseInt(self.options.offsetY),
					offsetX = parseInt(self.options.offsetX),
					// this is the arrow position that will eventually be used. It may differ from the position option if the tooltip cannot be displayed in this position
					practicalPosition = self.options.position;
				
				// a function to detect if the tooltip is going off the screen horizontally. If so, reposition the crap out of it!
				function dontGoOffScreenX() {
				
					var windowLeft = $(window).scrollLeft();
					
					// if the tooltip goes off the left side of the screen, line it up with the left side of the window
					if((myLeft - windowLeft) < 0) {
						var arrowReposition = myLeft - windowLeft;
						myLeft = windowLeft;
						
						self.tooltipArrowReposition = arrowReposition;
					}
					
					// if the tooltip goes off the right of the screen, line it up with the right side of the window
					if (((myLeft + tooltipWidth) - windowLeft) > windowWidth) {
						var arrowReposition = myLeft - ((windowWidth + windowLeft) - tooltipWidth);
						myLeft = (windowWidth + windowLeft) - tooltipWidth;
						
						self.tooltipArrowReposition = arrowReposition;
					}
				}
				
				// a function to detect if the tooltip is going off the screen vertically. If so, switch to the opposite!
				function dontGoOffScreenY(switchTo, switchFrom) {
					// if it goes off the top off the page
					if(((offsetTop - $(window).scrollTop() - tooltipHeight - offsetY - 12) < 0) && (switchFrom.indexOf('top') > -1)) {
						practicalPosition = switchTo;
					}
					
					// if it goes off the bottom of the page
					if (((offsetTop + containerHeight + tooltipHeight + 12 + offsetY) > ($(window).scrollTop() + $(window).height())) && (switchFrom.indexOf('bottom') > -1)) {
						practicalPosition = switchTo;
						myTop = (offsetTop - tooltipHeight) - offsetY - 12;
					}
				}
				
				if(practicalPosition == 'top') {
					var leftDifference = (offsetLeft + tooltipWidth) - (offsetLeft + containerWidth);
					myLeft =  (offsetLeft + offsetX) - (leftDifference / 2);
					myTop = (offsetTop - tooltipHeight) - offsetY - 12;
					dontGoOffScreenX();
					dontGoOffScreenY('bottom', 'top');
				}
				
				if(practicalPosition == 'top-left') {
					myLeft = offsetLeft + offsetX;
					myTop = (offsetTop - tooltipHeight) - offsetY - 12;
					dontGoOffScreenX();
					dontGoOffScreenY('bottom-left', 'top-left');
				}
				
				if(practicalPosition == 'top-right') {
					myLeft = (offsetLeft + containerWidth + offsetX) - tooltipWidth;
					myTop = (offsetTop - tooltipHeight) - offsetY - 12;
					dontGoOffScreenX();
					dontGoOffScreenY('bottom-right', 'top-right');
				}
				
				if(practicalPosition == 'bottom') {
					var leftDifference = (offsetLeft + tooltipWidth) - (offsetLeft + containerWidth);
					myLeft =  offsetLeft - (leftDifference / 2) + offsetX;
					myTop = (offsetTop + containerHeight) + offsetY + 12;
					dontGoOffScreenX();
					dontGoOffScreenY('top', 'bottom');
				}
				
				if(practicalPosition == 'bottom-left') {
					myLeft = offsetLeft + offsetX;
					myTop = (offsetTop + containerHeight) + offsetY + 12;
					dontGoOffScreenX();
					dontGoOffScreenY('top-left', 'bottom-left');
				}
				
				if(practicalPosition == 'bottom-right') {
					myLeft = (offsetLeft + containerWidth + offsetX) - tooltipWidth;
					myTop = (offsetTop + containerHeight) + offsetY + 12;
					dontGoOffScreenX();
					dontGoOffScreenY('top-right', 'bottom-right');
				}
				
				if(practicalPosition == 'left') {
					myLeft = offsetLeft - offsetX - tooltipWidth - 12;
					myLeftMirror = offsetLeft + offsetX + containerWidth + 12;
					var topDifference = (offsetTop + tooltipHeight) - (offsetTop + self.$elProxy.outerHeight(false));
					myTop =  offsetTop - (topDifference / 2) - offsetY;
					
					// if the tooltip goes off boths sides of the page
					if((myLeft < 0) && ((myLeftMirror + tooltipWidth) > windowWidth)) {
						var borderWidth = parseFloat(self.$tooltip.css('border-width')) * 2,
							newWidth = (tooltipWidth + myLeft) - borderWidth;
						self.$tooltip.css('width', newWidth + 'px');
						
						tooltipHeight = self.$tooltip.outerHeight(false);
						myLeft = offsetLeft - offsetX - newWidth - 12 - borderWidth;
						topDifference = (offsetTop + tooltipHeight) - (offsetTop + self.$elProxy.outerHeight(false));
						myTop =  offsetTop - (topDifference / 2) - offsetY;
					}
					
					// if it only goes off one side, flip it to the other side
					else if(myLeft < 0) {
						myLeft = offsetLeft + offsetX + containerWidth + 12;
						self.tooltipArrowReposition = 'left';
					}
				}
				
				if(practicalPosition == 'right') {
					myLeft = offsetLeft + offsetX + containerWidth + 12;
					myLeftMirror = offsetLeft - offsetX - tooltipWidth - 12;
					var topDifference = (offsetTop + tooltipHeight) - (offsetTop + self.$elProxy.outerHeight(false));
					myTop =  offsetTop - (topDifference / 2) - offsetY;
					
					// if the tooltip goes off boths sides of the page
					if(((myLeft + tooltipWidth) > windowWidth) && (myLeftMirror < 0)) {
						var borderWidth = parseFloat(self.$tooltip.css('border-width')) * 2,
							newWidth = (windowWidth - myLeft) - borderWidth;
						self.$tooltip.css('width', newWidth + 'px');
						
						tooltipHeight = self.$tooltip.outerHeight(false);
						topDifference = (offsetTop + tooltipHeight) - (offsetTop + self.$elProxy.outerHeight(false));
						myTop =  offsetTop - (topDifference / 2) - offsetY;
					}
						
					// if it only goes off one side, flip it to the other side
					else if((myLeft + tooltipWidth) > windowWidth) {
						myLeft = offsetLeft - offsetX - tooltipWidth - 12;
						self.tooltipArrowReposition = 'right';
					}
				}
				
				// if arrow is set true, style it and append it
				if (self.options.arrow) {
	
					var arrowClass = 'tooltipster-arrow-' + practicalPosition;
					
					// set color of the arrow
					if(self.options.arrowColor.length < 1) {
						var arrowColor = self.$tooltip.css('background-color');
					}
					else {
						var arrowColor = self.options.arrowColor;
					}
					
					// if the tooltip was going off the page and had to re-adjust, we need to update the arrow's position
					var arrowReposition = self.tooltipArrowReposition;
					if (!arrowReposition) {
						arrowReposition = '';
					}
					else if (arrowReposition == 'left') {
						arrowClass = 'tooltipster-arrow-right';
						arrowReposition = '';
					}
					else if (arrowReposition == 'right') {
						arrowClass = 'tooltipster-arrow-left';
						arrowReposition = '';
					}
					else {
						arrowReposition = 'left:'+ Math.round(arrowReposition) +'px;';
					}
					
					// building the logic to create the border around the arrow of the tooltip
					if ((practicalPosition == 'top') || (practicalPosition == 'top-left') || (practicalPosition == 'top-right')) {
						var tooltipBorderWidth = parseFloat(self.$tooltip.css('border-bottom-width')),
							tooltipBorderColor = self.$tooltip.css('border-bottom-color');
					}
					else if ((practicalPosition == 'bottom') || (practicalPosition == 'bottom-left') || (practicalPosition == 'bottom-right')) {
						var tooltipBorderWidth = parseFloat(self.$tooltip.css('border-top-width')),
							tooltipBorderColor = self.$tooltip.css('border-top-color');
					}
					else if (practicalPosition == 'left') {
						var tooltipBorderWidth = parseFloat(self.$tooltip.css('border-right-width')),
							tooltipBorderColor = self.$tooltip.css('border-right-color');
					}
					else if (practicalPosition == 'right') {
						var tooltipBorderWidth = parseFloat(self.$tooltip.css('border-left-width')),
							tooltipBorderColor = self.$tooltip.css('border-left-color');
					}
					else {
						var tooltipBorderWidth = parseFloat(self.$tooltip.css('border-bottom-width')),
							tooltipBorderColor = self.$tooltip.css('border-bottom-color');
					}
					
					if (tooltipBorderWidth > 1) {
						tooltipBorderWidth++;
					}
					
					var arrowBorder = '';
					if (tooltipBorderWidth !== 0) {
						var arrowBorderSize = '',
							arrowBorderColor = 'border-color: '+ tooltipBorderColor +';';
						if (arrowClass.indexOf('bottom') !== -1) {
							arrowBorderSize = 'margin-top: -'+ Math.round(tooltipBorderWidth) +'px;';
						}
						else if (arrowClass.indexOf('top') !== -1) {
							arrowBorderSize = 'margin-bottom: -'+ Math.round(tooltipBorderWidth) +'px;';
						}
						else if (arrowClass.indexOf('left') !== -1) {
							arrowBorderSize = 'margin-right: -'+ Math.round(tooltipBorderWidth) +'px;';
						}
						else if (arrowClass.indexOf('right') !== -1) {
							arrowBorderSize = 'margin-left: -'+ Math.round(tooltipBorderWidth) +'px;';
						}
						arrowBorder = '<span class="tooltipster-arrow-border" style="'+ arrowBorderSize +' '+ arrowBorderColor +';"></span>';
					}
					
					// if the arrow already exists, remove and replace it
					self.$tooltip.find('.tooltipster-arrow').remove();
					
					// build out the arrow and append it		
					var arrowConstruct = '<div class="'+ arrowClass +' tooltipster-arrow" style="'+ arrowReposition +'">'+ arrowBorder +'<span style="border-color:'+ arrowColor +';"></span></div>';
					self.$tooltip.append(arrowConstruct);
				}
				
				// position the tooltip
				self.$tooltip.css({'top': Math.round(myTop) + 'px', 'left': Math.round(myLeft) + 'px'});
			}
		}
	};
	
	$.fn[pluginName] = function () {
		
		// for using in closures
		var args = arguments;
		
		// if we are not in the context of jQuery wrapped HTML element(s) :
		// this happens when calling static methods in the form $.fn.tooltipster('methodName'), or when calling $(sel).tooltipster('methodName or options') where $(sel) does not match anything
		if (this.length === 0) {
			
			// if the first argument is a method name
			if (typeof args[0] === 'string') {
				
				var methodIsStatic = true;
				
				// list static methods here (usable by calling $.fn.tooltipster('methodName');)
				switch (args[0]) {
					
					case 'setDefaults':
						// change default options for all future instances
						$.extend(defaults, args[1]);
						break;
					
					default:
						methodIsStatic = false;
						break;
				}
				
				// $.fn.tooltipster('methodName') calls will return true
				if (methodIsStatic) return true;
				// $(sel).tooltipster('methodName') calls will return the list of objects event though it's empty because chaining should work on empty lists
				else return this;
			}
			// the first argument is undefined or an object of options : we are initalizing but there is no element matched by selector
			else {
				// still chainable : same as above
				return this;
			}
		}
		// this happens when calling $(sel).tooltipster('methodName or options') where $(sel) matches one or more elements
		else {
			
			// method calls
			if (typeof args[0] === 'string') {
				
				var v = null;
				
				this.each(function() {
					
					// self represent the instance of the tooltipster plugin associated to the current HTML object of the loop
					var self = $(this).data('tooltipster');
					
					// if the current element is a tooltipster instance
					if(self){
						switch (args[0]) {

							case 'content':
							// 'update' is deprecated but kept for retrocompatibility
							case 'update':
								// getter method
								if(typeof args[1] === 'undefined'){
									v = self.content;
									// return false to stop .each iteration on the first element matched by the selector
									return false;
								}
								// setter method
								else {
									self.updateTooltip(args[1]);
									break;
								}
			
							case 'destroy':
								self.hideTooltip();
								
								if(self.$el[0] !== self.$elProxy[0]) self.$elProxy.remove();
								
								// old school technique when outerHTML is not supported
								var stringifiedContent = $('<div></div>').append(self.content).html();
								
								self.$el
									.removeClass('tooltipstered')
									.attr('title', stringifiedContent)
									.removeData('tooltipster')
									.off('.tooltipster');
								break;
							
							case 'disable':
								self.$elProxy.addClass('tooltipster-disable');
								break;
								
							case 'elementIcon':
								v = (self.$el[0] !== self.$elProxy[0]) ? self.$elProxy[0] : undefined;
								// return false : same as above
								return false;
								
							case 'elementTooltip':
								v = self.$tooltip ? self.$tooltip[0] : undefined;
								// return false : same as above
								return false;
							
							case 'enable':
								self.$elProxy.removeClass('tooltipster-disable');
								break;
			
							case 'hide':
								self.hideTooltip();
								break;
								
							case 'reposition':
								self.positionTooltip();
								break;
							
							case 'show':
								self.showTooltip();
								break;
							
							default:
								throw "Unknown method .tooltipster('" + args[0] + "')";
								break;
						}
					}
					else {
						throw 'You called a tooltipster method on an unitialized element';
					}
				});
				
				return (v !== null) ? v : this;
			}
			// first argument is undefined or an object : the tooltip is initializing
			else {
				// initialize a tooltipster instance for each element if it doesn't already have one, and attach the object to it
				return this.each(function () {

					if (!$(this).data('tooltipster')) {
						$(this).data('tooltipster', new Plugin( this, args[0] ));
					}
				});
			}
		}
	};
	
	
	// detect if this device is mouse driven over purely touch
	var touchDevice = !!('ontouchstart' in window);
	// on mousemove, double confirm that this is a desktop - not a touch device
	$(window).on('mousemove.tooltipster', function() {
		touchDevice = false;
		$(window).off('mousemove.tooltipster');
	});
	
	// detecting support for CSS transitions
	function supportsTransitions() {
		var b = document.body || document.documentElement,
			s = b.style,
			p = 'transition';
		
		if(typeof s[p] == 'string') {return true; }

		v = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'],
		p = p.charAt(0).toUpperCase() + p.substr(1);
		for(var i=0; i<v.length; i++) {
			if(typeof s[v[i] + p] == 'string') { return true; }
		}
		return false;
	}
	
	// hide tooltips on orientation change
	$(window).on('orientationchange', function() {
		$('.tooltipstered').each(function(){
			$(this)[pluginName]('hide');
		})
	});
	
	// reposition on scroll (otherwise position:fixed element's tooltips will move away form their origin) and on resize (in case position can/has to be changed)
	$(window).on('scroll resize', function() {
		$('.tooltipstered').each(function(){
			$(this)[pluginName]('reposition');
		})
	});
})( jQuery, window, document );
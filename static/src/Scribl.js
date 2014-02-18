/**
 * **Scribl Class**
 *
 * _sets defaults, defines how to add features
 * to chart/view and some methods to help
 * coordinate drawing_
 * 
 * Chase Miller 2011
 */
function writeMessage (message) {
    chart1.text.setText(message);
    chart1.messageLayer.draw();
}

//From stackoverflow: http://stackoverflow.com/questions/14075014/jquery-function-to-to-format-number-with-commas-and-decimal
function replaceNumberWithCommas(yourNumber) {
    //Seperates the components of the number
    var n= yourNumber.toString().split(".");
    //Comma-fies the first part
    n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //Combines the two sections
    return n.join(".");
}

function mean(arr) {
    var sum=0;
    for (var j=0;j<arr.length;j++)
        sum += arr[j];
    return sum/arr.length;
}

/**
 * Uncorrected standard deviation of array
 * @param arr array of numbers
 * @returns {number}
 */
function std (arr) {
    var ave = mean(arr);
    var sum=0;
    for (var j=0;j<arr.length;j++)
        sum += Math.pow(arr[j] - ave, 2);
    return Math.pow(sum / arr.length, .5);
}

var COLOR_1='#4A6395';
var COLOR_2='#C4D85F';
var COLOR_3='#8F4091'
var COLOR_BG='#E2D7C2';
var isDragging=false;
var initCoords= 0, currentCoords = 0;
var initAdjXPos;
var actualOffset;
var dragDisplayLayer;
var dragDisplayRect;
var lastScrollTime=0; // In the callback, store the time and don't allow another event until enough time has processed
DRAWINGS_HEIGHT=300;
TFBS_HEIGHT=25;
GENE_HEIGHT=2*TFBS_HEIGHT;
RESULT_HEIGHT=300; //height of the panel where we draw the experimental data
function adjustMouseX (mouseX) {
    return mouseX-chart1.offset-$('.kineticjs-content').offset().left;
}

function getCoordsFromOrigMouseX (mouseX){
    var adjXPos = adjustMouseX(mouseX);
    var ret=Math.round(adjXPos*(chart1.scale.max-chart1.scale.min)/chart1.width+chart1.scale.min);
    return ret;
}

function startDrag (mouseX,mouseY,which) {
    if (which>1){ //not a left-click, cancel everything
        dragDisplayRect.setVisible(false);
        dragDisplayLayer.draw();
        isDragging=false;
        chart1.text.setText('Aborting drag');
        chart1.messageLayer.draw();
    } else { //start dragging
        isDragging=true;
        var adjXPos=adjustMouseX(mouseX);
        initAdjXPos=adjXPos;
        initCoords=getCoordsFromOrigMouseX(mouseX);
        chart1.text.setText('Drag to zoom');
        chart1.messageLayer.draw();
        dragDisplayRect.setVisible(true);
        dragDisplayRect.setX(adjXPos);
        dragDisplayRect.setWidth(1);
        dragDisplayLayer.draw();
    }
}

function checkDrag (mouseX,mouseY) {
    if (isDragging) {
        var adjXPos=adjustMouseX(mouseX);
        var currentCoords=getCoordsFromOrigMouseX(mouseX);
        chart1.text.setText('Zooming from '+chart1.getTickText(initCoords)+' to '+chart1.getTickText(currentCoords));
        chart1.messageLayer.draw();
        dragDisplayRect.setWidth(adjXPos-initAdjXPos);
        dragDisplayLayer.draw();
    }
}

function stopDrag (mouseX,mouseY) {
    if (isDragging) {
        isDragging=false;
        var adjXPos=adjustMouseX(mouseX);
        if (Math.abs(adjXPos-initAdjXPos) < 100 )
        {
            chart1.text.setText('Canceling zoom (select wider region)');
            chart1.messageLayer.draw();
            dragDisplayRect.setVisible(false);
            dragDisplayLayer.draw();
            return;
        }
        var currentCoords=getCoordsFromOrigMouseX(mouseX);
        chart1.text.setText('Zoomed from '+initCoords+' to '+currentCoords);
        chart1.messageLayer.draw();
        if (initAdjXPos > adjXPos){//We dragged from right to left
            var t=initCoords;
            initCoords=currentCoords;
            currentCoords=t;
        }
        dragDisplayRect.setWidth(adjXPos-initAdjXPos);
        dragDisplayLayer.draw();

        $('input[name="left"]').val(Math.round(initCoords));
        $('input[name="right"]').val(Math.round(currentCoords));
        updateAjax();
    }
}

var Scribl = Class.extend({

    /** **init**

     * _ Constructor, call this with `new Scribl()`_

     * @param {Object} canvasHTML object
     * @param {Int} width of chart in pixels
     * @return {Object} Scribl object
     * @api public
     */
    init: function (canvas) {
        this.scrolled = false;
        // create canvas contexts
        var ctx;
        if (canvas)
            ctx = canvas.getContext('2d');
        var chart = this;


        // chart defaults
        this.width = window.innerWidth - 80;
        this.uid = _uniqueId('chart');
        this.laneBuffer = 5;
        this.trackBuffer = 25;
        this.offset = undefined;
        this.canvas = canvas;
        this.ctx = ctx;

        this.featureTrack = new FeatureTrack(this, this.laneSizes);

        // scale defaults
        this.scale = {};
        this.scale.pretty = true;
        this.scale.max = undefined;
        this.scale.min = undefined;
        this.scale.auto = false;
        this.scale.userControlled = false;
        this.scale.positions = [0]; // by default scale goes on top
        this.scale.off = false;
        this.scale.size = 15; // in pixels
        this.scale.font = {};
        this.scale.font.size = 15; // in pixels
        this.scale.font.color = 'black';
        this.scale.font.buffer = 10; // in pixels - buffer between two scale numbers
        // (e.g. 1k and 2k)

        // glyph defaults
        this.glyph = {};
        this.glyph.roundness = 6;
        this.glyph.borderWidth = 1; // in pixels
        this.glyph.color = ['#99CCFF', 'rgb(63, 128, 205)'];
        this.glyph.text = {};
        this.glyph.text.color = 'black';
        this.glyph.text.size = '13'; // in pixels
        this.glyph.text.font = 'arial';
        this.glyph.text.align = 'center';

        // tick defaults
        this.tick = {};
        this.tick.auto = true;
        this.tick.major = {};
        this.tick.major.size = 10; // width between major ticks in nucleotides
        this.tick.major.color = 'black';
        this.tick.minor = {};
        this.tick.minor.size = 1; // width between minor ticks in nucleotides
        this.tick.minor.color = 'rgb(55,55,55)';
        this.tick.halfColor = 'rgb(10,10,10)';

        // draw defaults
        this.drawStyle = 'expand';

        var scaleSize = this.scale.size;
        var scaleFontSize = this.scale.font.size
    },

    /** **getScaleHeight**

     * _Get the height of the scale/ruler_

     * @return {Integer} height in pixels
     * @api public
     */
    getScaleHeight: function () {
        return (this.scale.font.size + this.scale.size);

    },

    /** **getHeight**

     * _Get the height of the entire Scribl chart/view_

     * @return {Integer} height in pixels
     * @api public
     */
    getHeight: function () {
        var wholeHeight = 0;

        if (!this.scale.off) wholeHeight += this.getScaleHeight();
        var numTracks = this.tracks.length

        for (var i = 0; i < numTracks; i++) {
            wholeHeight += this.trackBuffer;
            wholeHeight += this.tracks[i].getHeight();
        }

        return wholeHeight;
    },

    /** **getFeatures**

     * _Returns an array of features (e.g. gene)_

     * @return {Array} of features
     * @api public
     */

    getFeatures: function () {
        var features = [];
        for (var i = 0; i < this.tracks.length; i++) {
            for (var k = 0; k < this.tracks[i].lanes.length; k++) {
                features = features.concat(this.tracks[i].lanes[k].features);
            }
        }
        return features;
    },

    /** **setCanvas**

     * _Changes the canvas that Scribl draws to_

     * @param {Html Canvas Element} the canvas to draw to
     * @api public
     */
    setCanvas: function (canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // this.registerEventListeners();
    },

    /** **addScale**

     * _Inserts a scale at the end of the last track currently added to the chart_

     * @api public
     */
    addScale: function () {
        if (this.scale.userControlled)
            this.scale.positions.push(this.tracks.length);
        else {
            this.scale.positions = [ this.tracks.length ];
            this.scale.userControlled = true;
        }
    },

    /** **addTrack**

     * _Creates a new track and adds it to the Scribl chart/view_

     * @return {Object} the new track
     * @api public
     */
    addTrack: function () {
        var track = new Track(this);
        if (this.tracks.length == 1 && this.tracks[0] == undefined)
            this.tracks = [];
        this.tracks.push(track);
        return track;
    },

    /** **removeTrack**

     * _removes a track_

     * @param {Object} the track to be removed
     * @api public
     */
    removeTrack: function (track) {
        var chart = this;

        for (var i = 0; i < chart.tracks.length; i++) {
            if (track.uid == chart.tracks[i].uid)
                chart.tracks.splice(i, 1);
        }
        delete track;
    },

    /** **loadFeatures**

     * _adds the features to the Scribl chart/view_

     * @param {Array} features - array of features, which can be any of the derived Glyph classes (e.g. Rect, Arrow, etc..)
     * @api public
     */
    loadFeatures: function (features) {
        for (var i = 0; i < features.length; i++)
            this.addFeature(features[i]);
    },

    addGene: function (position, length, strand, name) {
        return this.featureTrack.addGene(position, length,name, strand);
    },

    /** **addFeature**

     * _addFeature to Scribl chart/view and let Scribl manage track and lane placement to avoid overlaps_

     * example:
     * `chart.addFeature( new Rect('complex',3500, 2000) );`

     * @param {Object} feature - any of the derived Glyph classes (e.g. Rect, Arrow, etc..)
     * @return {Object} feature
     * @api public
     */
    addFeature: function (feature) {
        var track = this.tracks[0] || this.addTrack();
        track.addFeature(feature);
        return feature;
    },

    addSRNA: function (left, length, name, strand) {
        return this.featureTrack.addSRNA(left, length, name, strand);
    },

    addPromoter: function (left, length, name, strand) {
        return this.featureTrack.addPromoter(left, length, name, strand);
    },

    addTFBS: function (left, length, name, strand) {
        strand = strand || '+';
        return this.featureTrack.addTFBS(left, length, name, strand);
    },

    addTicker: function (left, strand, yVals) {
        return this.featureTrack.addTicker(left, strand, yVals);
    },


    /** **slice**

     * _slices the Scribl chart/view at given places and returns a smaller chart/view_

     * @param {Int} from - nucleotide position to slice from
     * @param {Int} to - nucleotide position to slice to
     * @param {String} type - _inclusive_ (defaulte) includes any feature that has any part in region, _exclusive_, includes only features that are entirely in the region, _strict_ if feature is partly in region, it'll cut that feature at the boundary and include the cut portion
     * @return {Object} Scribl
     * @api public
     */
    slice: function (from, to, type) {
        type = type || 'inclusive';
        var chart = this;
        var sliced_features = [];

        // iterate through tracks
        var numTracks = this.tracks.length;
        var newChart = new Scribl(this.canvas, this.width);

        // TODO: make this more robust
        newChart.scale.min = this.scale.min;
        newChart.scale.max = this.scale.max;
        newChart.offset = this.offset;
        newChart.scale.off = this.scale.off;
        newChart.scale.pretty = this.scale.pretty;
        newChart.laneSizes = this.laneSizes;
        newChart.drawStyle = this.drawStyle;
        newChart.glyph = this.glyph;
        newChart.glyphHooks = this.glyphHooks;
        newChart.trackHooks = this.trackHooks;
//      newChart.mouseHandler = this.mouseHandler;
//      newChart.clickHandler = this.clickHandler;
        newChart.previousDrawStyle = this.previousDrawStyle;

        // for ( var i in object.getOwnPropertyNames(this) ) {
        //    newChart[i] = this[i];
        // }

        // Aliases for the rather verbose methods on ES5
        // var descriptor  = Object.getOwnPropertyDescriptor
        //   , properties  = Object.getOwnPropertyNames
        //   , define_prop = Object.defineProperty

        // (target:Object, source:Object) → Object
        // Copies properties from `source' to `target'

        // properties(chart).forEach(function(key) {
        //     define_prop(newChart, key, descriptor(chart, key)) })


        for (var j = 0; j < numTracks; j++) {
            var track = this.tracks[j];
            var newTrack = newChart.addTrack();
            newTrack.drawStyle = track.drawStyle;
            var numLanes = track.lanes.length;
            for (var i = 0; i < numLanes; i++) {
                var newLane = newTrack.addLane();
                var s_features = track.lanes[i].features;
                for (var k = 0; k < s_features.length; k++) {
                    var end = s_features[k].position + s_features[k].length;
                    var start = s_features[k].position;
                    // determine if feature is in slice/region
                    if (type == 'inclusive') {
                        if (start >= from && start <= to)
                            newLane.addFeature(s_features[k].clone())
                        else if (end > from && end < to)
                            newLane.addFeature(s_features[k].clone())
                        else if (start < from && end > to)
                            newLane.addFeature(s_features[k].clone())
                        else if (start > from && end < to)
                            newLane.addFeature(s_features[k].clone())
                    } else if (type == 'strict') {
                        if (start >= from && start <= to) {
                            if (end > from && end < to)
                                newLane.addFeature(s_features[k].clone())
                            else {
                                // turn first half into rect to stop having two block arrows features
                                if (s_features[k].glyphType == "BlockArrow" && s_features[k].strand == "+")
                                    var f = s_features[k].clone("Rect");
                                else
                                    var f = s_features[k].clone();

                                f.length = Math.abs(to - start);
                                newLane.addFeature(f);
                            }
                        } else if (end > from && end < to) {
                            // turn first half into rect to stop having two block arrows features
                            if (s_features[k].glyphType == "BlockArrow" && s_features[k].strand == "-")
                                var f = s_features[k].clone("Rect");
                            else
                                var f = s_features[k].clone();

                            f.position = from;
                            f.length = Math.abs(end - from);
                            newLane.addFeature(f);
                        }
                        else if (start < from && end > to) {
                            // turn first half into rect to stop having two block arrows features
                            if (s_features[k].glyphType == "BlockArrow")
                                var f = s_features[k].clone("Rect");
                            else
                                var f = s_features[k].clone();
                            f.position = from;
                            f.length = Math.abs(to - from);
                            newLane.addFeature(f);
                        }
                    } else if (type == 'exclusive') {
                        if (start >= from && start <= to && end > from && end < to)
                            newLane.addFeature(s_features[k].clone())
                    }

                }

            }
        }


        // for (var attr in this) {
        //    if (this.hasOwnProperty(attr)) copy[attr] = this[attr];
        // }

        return newChart;
    },

    /** **draw**

     * _draws everything_

     * @api public
     */

    draw: function () {
        waitingToDraw=true;
        this.width=window.innerWidth - 80;
        this.stage = new Kinetic.Stage({container: 'container', width :this.width , height: 800});
        this.initScale();
        if (!this.messageLayer) {
            var messageLayer = new Kinetic.Layer({});
            this.messageLayer=messageLayer;
            this.text = new Kinetic.Text({
            x: 70,
            y: 10,
            fontFamily: 'Calibri',
            fontSize: 24,
            text: '',
            fill: 'black'
          });
            messageLayer.add(this.text);
            this.stage.add(messageLayer);
        }else{
            this.stage.add(this.messageLayer);
        }

        this.scaleLayer=this.drawScale(new Kinetic.Layer({offsetY:-(DRAWINGS_HEIGHT)}));
        this.stage.add(this.scaleLayer);

        var tracks=this.tracks;
        this.featuresLayer = new Kinetic.Layer({offsetY:-DRAWINGS_HEIGHT,scaleY:1});
      // draw tracks
        this.resultsLayer=new Kinetic.Layer({offsetX:-this.offset, offsetY:-DRAWINGS_HEIGHT-this.getScaleHeight()});
        this.featureTrack.draw(this.featuresLayer,this.resultsLayer);
         this.stage.add(this.featuresLayer);
        this.stage.add(this.resultsLayer);

        dragDisplayLayer = new Kinetic.Layer({offsetX:-this.offset});
        dragDisplayRect=new Kinetic.Rect({visible:false,height:DRAWINGS_HEIGHT+this.getScaleHeight()+RESULT_HEIGHT,y:50,width:1,x:0,stroke:'purple'});
        dragDisplayLayer.add(dragDisplayRect);
        this.stage.add(dragDisplayLayer);
        this.renderedAtMin=this.scale.min;
        waitingToDraw=false;
   },

    /**
     * Deletes everything, like if we just did init()
     */
    clear:function(){
        //this.scale.max = undefined;
        //this.scale.min = undefined;
        if (this.stage) {
            this.stage.clear();
            delete this.stage;
        }
        //this.tracks[0]=new Track(this);
        //this.featureTrack = new FeatureTrack(this, this.laneSizes);
    },

	/** **initScale**
   
    * _initializes scale_
    
    * @api internal
    */
	initScale: function() {
	   if (this.scale.pretty) {					
		
         // determine reasonable tick intervals
         if (this.tick.auto) {
            // set major tick interval
            this.tick.major.size = this.determineMajorTick();

            // set minor tick interval
            this.tick.minor.size = Math.round(this.tick.major.size / 10);
         }			
		
         // make scale end on major ticks
         if (this.scale.auto) { 
            this.scale.min -= this.scale.min % this.tick.major.size;
            this.scale.max = Math.round(this.scale.max / this.tick.major.size + .4) 
               * this.tick.major.size;
         }
      }
	},
	
	/** **drawScale**
   
    * _draws scale_
    
    * @api public
    */
	drawScale: function(layer){
      var firstMinorTick;

      // determine tick vertical sizes and vertical tick positions
      var tickStartPos = this.scale.font.size + this.scale.size;
      var majorTickEndPos = this.scale.font.size + 2;
      var minorTickEndPos = this.scale.font.size + this.scale.size * 0.66;
      var halfTickEndPos = this.scale.font.size + this.scale.size * 0.33;
//      tickStartPos=-1*tickStartPos;
//      majorTickEndPos=-1*majorTickEndPos;
//        minorTickEndPos=-1*minorTickEndPos;
//        halfTickEndPos=-1*halfTickEndPos;
      
      this.offset=new Kinetic.Text({text:this.getTickText(this.scale.min)}).width()/2;

      // determine the place to start first minor tick
      if (this.scale.min % this.tick.minor.size == 0)
         firstMinorTick = this.scale.min;
      else {
         firstMinorTick = this.scale.min - (this.scale.min % this.tick.minor.size)
            + this.tick.minor.size;
          this.scale.min=firstMinorTick;
      }
 		    
      // draw
      for(var i = firstMinorTick; i <= this.scale.max; i += this.tick.minor.size){		    
          var newLine;
         var curr_pos = this.convertNtsToPixels(i - this.scale.min) + this.offset;
         if ( i % this.tick.major.size == 0) { // draw major tick
            // create text
            var tickText = this.getTickText(i);
            //ctx.textAlign = 'center';
             var textObj = new Kinetic.Text({text: tickText, x: curr_pos, y: 0, fill: 'black',offsetY:-tickStartPos-5});
             layer.add(textObj);
             textObj.offsetX(textObj.width() / 2);
             newLine=new Kinetic.Line({points:[curr_pos,tickStartPos,curr_pos,majorTickEndPos],stroke:this.tick.major.color});

            } else { // draw minor tick
//               ctx.moveTo( curr_pos, tickStartPos );

               // create half tick - tick between two major ticks
               if ( i % (this.tick.major.size/2) == 0 ) {
                   newLine=new Kinetic.Line({points: [curr_pos, tickStartPos, curr_pos, halfTickEndPos], stroke: this.tick.halfColor});
  //                ctx.strokeStyle = this.tick.halfColor;
   //               ctx.lineTo( curr_pos, halfTickEndPos );
               }
               // create minor tick
               else{
                   newLine=new Kinetic.Line({points: [curr_pos, tickStartPos, curr_pos, minorTickEndPos], stroke: this.tick.minor.color});
               }
            }
          newLine.msg='Chromosome location: '+replaceNumberWithCommas(i);
          newLine.on('mouseover', function() {
            writeMessage(this.msg);
          });
          newLine.on('mouseout', function() {
            writeMessage('');
          });
          layer.add(newLine);
         }

                           
         // restore fillstyle
  //       ctx.fillStyle = fillStyleRevert;


        return layer;
    //     ctx.translate(0, this.getScaleHeight() + this.laneBuffer);
      },
	
	/** **convertNtsToPixels**
   
    * _Get the number of nucleotides per the given pixels_
   
    * @param {Integer} [nts] optional - if not given, the ratio of pixels/nts will be returned
    * @return {Integer} nucleotides or pixels/nts ratio
    * @api internal    
    */
	convertNtsToPixels: function(nts) {
      if (nts == undefined)
         return ( this.width / ( this.scale.max - this.scale.min) );
      else
         return ( this.width / ( this.scale.max - this.scale.min) * nts  );
	},
	
   /** **convertPixelstoNts**
   
    * _Get the number of pixels shown per given nucleotides_
   
    * @param {Int} [nucleotides] optional - if not given, the ratio of nts/pixel will be returned
    * @return {Integer} pixels or nts/pixel ratio
    * @api internal
    */
	convertPixelstoNts: function(pixels) {
      if (pixels == undefined)
         return ( 1 / this.convertNtsToPixels() );
      else {
          return Math.round( pixels*1.0 *(this.scale.max-this.scale.min)/ this.width );
      }

   },

   /** **determineMajorTick**
   
    * _intelligently determines a major tick interval based on size of the chart/view and size of the numbers on the scale_
   
    * @return {Integer} major tick interval
    * @api internal
    */
	determineMajorTick: function() {
      this.ctx.font = this.scale.font.size + 'px arial';
      var numtimes = this.width/(this.ctx.measureText(this.getTickTextDecimalPlaces(this.scale.max)).width + this.scale.font.buffer);

      // figure out the base of the tick (e.g. 2120 => 2000)
      var irregularTick = (this.scale.max - this.scale.min) / numtimes;
      var baseNum =  Math.pow(10, parseInt(irregularTick).toString().length -1);
      this.tick.major.size = Math.ceil(irregularTick / baseNum) * baseNum;		
				
		// round up to a 5* or 1* number (e.g 5000 or 10000)
      var digits = (this.tick.major.size + '').length;
      var places = Math.pow(10, digits);
      var first_digit = this.tick.major.size / places;
      
      if (first_digit > .1 && first_digit <= .5)
      	first_digit = .5;
      else if (first_digit > .5)
      	first_digit = 1;
      
      // return major tick interval
      return (first_digit * places);
	},


   /** **getTickText**
   
    * _abbreviates tick text numbers using 'k', or 'm' (e.g. 10000 becomes 10k)_
   
    * @param {Number} tickNumber - the tick number that needs to be abbreviated
    * @return {String} abbreviated tickNumber
    * @api internal
    */
	getTickText: function(tickNumber) {
       tickNumber = Math.round(tickNumber);
      if ( !this.tick.auto )
         return tickNumber;
		
      var tickText = tickNumber;
      if (tickNumber >= 1000000 ) {
         var decPlaces = 5;
         var base = Math.pow(10, decPlaces)
         tickText = Math.round(tickText / 1000000 * base) / base + 'm'; // round to decPlaces
      } else if ( tickNumber >= 1000 ) {
         var decPlaces = 2;
         var base = Math.pow(10, decPlaces)		    
         tickText = Math.round(tickText / 1000 * base) / base + 'k';
      }
		
      return tickText;
   },
	
   /** **getTickTextDecimalPlaces**
   
    * _determines the tick text with decimal places_
   
    * @param {Int} tickNumber - the tick number that needs to be abbreviated
    * @return {String} abbreviated tickNumber
    * @api internal
    */
	getTickTextDecimalPlaces: function(tickNumber){
      if ( !this.tick.auto )
         return tickNumber;
		
      var tickText = tickNumber;
      if (tickNumber >= 1000000 ) {
         var decPlaces = 5;
         tickText = Math.round( tickText / (1000000 / Math.pow(10,decPlaces)) ) + 'm'; // round to 2 decimal places
      } else if ( tickNumber >= 1000 ){
         var decPlaces = 2;
         tickText = Math.round( tickText / (1000 / Math.pow(10,decPlaces)) ) + 'k';
      }

      return tickText;
   },
	
	/** **handleMouseEvent**
   
    * _handles mouse events_
   
    * @param {Object} event - triggered event
    * @param {String} type - type of event
    * @api internal
    */
	handleMouseEvent: function(e, type) {
      this.myMouseEventHandler.setMousePosition(e);
      var positionY = this.myMouseEventHandler.mouseY;
      var lane;
      
      for( var i=0; i < this.tracks.length; i++) {
         for( var k=0; k < this.tracks[i].lanes.length; k++) {
            var yt = this.tracks[i].lanes[k].getPixelPositionY();
            var yb = yt + this.tracks[i].lanes[k].getHeight();
            if (positionY >= yt && positionY <= yb ) {
               lane = this.tracks[i].lanes[k];
               break;
            }
         }
      }
      
      // if mouse is not on any tracks then return
      if (!lane) return;
      
      var drawStyle = lane.track.getDrawStyle();
      
      if (drawStyle == 'collapse') {
         this.redraw();
      } else if (drawStyle == 'line') {
        // do nothing 
      } else {
         this.ctx.save(); 
         lane.erase();
         this.ctx.translate(0, lane.getPixelPositionY());
         lane.draw();
         var ltt;
         while (ltt =  this.lastToolTips.pop() ) {
            this.ctx.putImageData(ltt.pixels, ltt.x, ltt.y )
         }
         this.ctx.restore();
      }
      
      
      var chart = this;
		
      if (type == 'click') {
         var clicksFns = chart.events.clicks;
         for (var i = 0; i < clicksFns.length; i++)
            clicksFns[i](chart);
      } else {
         var mouseoverFns = chart.events.mouseovers;
         for (var i = 0; i < mouseoverFns.length; i++) 
            mouseoverFns[i](chart);								    
      }
		
      this.myMouseEventHandler.reset(chart);
      

	},
	
	
	/** **addClickEventListener**
   
    * _add's function that will execute each time a feature is clicked_
   
    * @param {Function} func - function to be triggered
    * @api public
    */
	addClickEventListener: function(func) {
      this.events.clicks.push(func);
	},
	
	/** **addMouseoverEventListener**
   
    * _add's function that will execute each time a feature is mouseovered_
   
    * @param {Function} func - function to be triggered
    * @api public
    */
	addMouseoverEventListener: function(func) {
		this.events.mouseovers.push(func);
	},
	
	/** **removeEventListeners**
   
    * _remove event listerners_
   
    * @param {String} event-type - e.g. mouseover, click, etc...
    * @api internal
    */
   removeEventListeners: function(eventType){
      if (eventType == 'mouseover')
         this.canvas.removeEventListener('mousemove', this.mouseHandler);
      else if (eventType == 'click')
         this.canvas.removeEventListener('click', this.clickHandler);
   },
	
	
	/** **registerEventListeners**
   
    * _adds event listerners_
   
    * @api internal
    */
	registerEventListeners: function() {
      var chart = this;

      if ( this.events.mouseovers.length > 0) {
         this.canvas.removeEventListener('mousemove', chart.mouseHandler);
         this.canvas.addEventListener('mousemove', chart.mouseHandler, false);
      }
      if ( this.events.clicks.length > 0 ) {
         $(this.canvas).unbind('click');
         $(this.canvas).bind('click', function(e) {chart.handleMouseEvent(e, 'click')})
         // this.canvas.removeEventListener('click', chart.clickHandler);
         // this.canvas.addEventListener('click', chart.clickHandler, false);
      }
      this.events.added = true;
   }
	
	
});
 // globals
// if (SCRIBL == undefined) {
    var SCRIBL = {};
    SCRIBL.chars = {};
    SCRIBL.chars.nt_color = 'white';
    SCRIBL.chars.nt_A_bg = 'red';
    SCRIBL.chars.nt_G_bg = 'blue';
    SCRIBL.chars.nt_C_bg = 'green';
    SCRIBL.chars.nt_T_bg = 'black';
    SCRIBL.chars.nt_N_bg = 'purple';
    SCRIBL.chars.nt_dash_bg = 'rgb(120,120,120)';
    SCRIBL.chars.heights = [];
    SCRIBL.chars.canvasHolder = document.createElement('canvas');
 //}

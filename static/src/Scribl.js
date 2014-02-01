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

var isDragging=false;
var initCoords= 0, currentCoords = 0;
var initAdjXPos;
var actualOffset;
var dragDisplayLayer;
var dragDisplayRect;
var lastScrollTime=0; // In the callback, store the time and don't allow another event until enough time has processed
DRAWINGS_HEIGHT=300;
function startDrag (mouseX,mouseY,which) {
    if (which>1){ //not a left-click, cancel everything
        dragDisplayRect.setVisible(false);
        dragDisplayLayer.draw();
        isDragging=false;
        chart1.text.setText('Aborting drag');
        chart1.messageLayer.draw();
    } else {
        isDragging=true;
        var adjXPos=mouseX-(chart1.offset+$('.kineticjs-content').offset().left);
        initAdjXPos=adjXPos;
        initCoords=Math.round(adjXPos*(chart1.scale.max-chart1.scale.min)/chart1.width+chart1.scale.min);
        chart1.text.setText('Drag to zoom');
        chart1.messageLayer.draw();
        dragDisplayRect.setVisible(true);
        dragDisplayRect.setX(adjXPos);
        dragDisplayLayer.draw();
    }
}


function checkDrag (mouseX,mouseY) {
    if (isDragging) {
        var adjXPos=mouseX-(chart1.offset+$('.kineticjs-content').offset().left);
        var currentCoords=adjXPos*(chart1.scale.max-chart1.scale.min)/chart1.width+chart1.scale.min;
        chart1.text.setText('Zooming from '+chart1.getTickText(initCoords)+' to '+chart1.getTickText(currentCoords));
        chart1.messageLayer.draw();
        dragDisplayRect.setWidth(adjXPos-initAdjXPos);
        dragDisplayLayer.draw();
    }
}

function stopDrag (mouseX,mouseY) {
    if (isDragging) {
        isDragging=false;
        var adjXPos=mouseX-(chart1.offset+$('.kineticjs-content').offset().left);
        if (Math.abs(adjXPos-initAdjXPos) < 100 )
        {
            chart1.text.setText('Canceling zoom (select wider region)');
            chart1.messageLayer.draw();
            dragDisplayRect.setVisible(false);
            dragDisplayLayer.draw();
            return;
        }
        var currentCoords=adjXPos*(chart1.scale.max-chart1.scale.min)/chart1.width+chart1.scale.min;
        chart1.text.setText('Finished to '+adjXPos+', coords='+currentCoords);
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


        // initialize common types
        this.gene = {};
        this.gene.text = {};
        this.protein = {};
        this.protein.text = {};

        // event defaults
        this.events = {};
        this.events.hasClick = false;
        this.events.hasMouseover = false;
        this.events.clicks = new Array;
        this.events.mouseovers = new Array;
        this.events.added = false;
        this.mouseHandler = function (e) {
            chart.handleMouseEvent(e, 'mouseover')
        };
        this.clickHandler = function (e) {
            chart.handleMouseEvent(e, 'click')
        };

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

        // tooltip defaults
        this.tooltips = {};
        this.tooltips.text = {}
        this.tooltips.text.font = 'arial';
        this.tooltips.text.size = 12; // in pixels
        this.tooltips.borderWidth = 1; // in pixels
        this.tooltips.roundness = 5;  // in pixels
        this.tooltips.fade = false;
        this.tooltips.style = 'light';  // also a 'dark' option
        this.lastToolTips = [];

        // scroll defaults
        this.scrollable = false;
        this.scrollValues = [0, undefined]; // values in nts where scroll

        this.chars = {};
        this.chars.drawOnBuild = [];

        // draw defaults
        this.drawStyle = 'expand';

        // draw hooks
        this.glyphHooks = [];
        this.trackHooks = [];

        // private variables
        this.myMouseEventHandler = new MouseEventHandler(this);
        this.tracks = [];
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

     * @return {Int} height in pixels
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


    /** **loadGenbank**

     * _parses a genbank file and adds the features to the Scribl chart/view_

     * @param {String} genbank file as a string
     * @api public
     */
    loadGenbank: function (file) {
        genbank(file, this);
    },

    /** **loadBed**

     * _parses a bed file and adds the features to the Scribl chart/view_

     * @param {String} bed file as a string
     * @api public
     */
    loadBed: function (file) {
        bed(file, this);
    },

    /** **loadBam**

     * _parses a bam file and adds the features to the Scribl chart/view_

     * @param {File} bam file as a javascript file object
     * @param {File} bai (bam index) file as a javascript file object
     * @param {Int} start
     * @param {Int} end
     * @api public
     */
    loadBam: function (bamFile, baiFile, chr, start, end, callback) {
        var scribl = this;
        // scribl.scale.min = start;
        // scribl.scale.max = end;
        var track = scribl.addTrack();
        track.status = 'waiting';
        makeBam(new BlobFetchable(bamFile),
            new BlobFetchable(baiFile),
            function (bam, reader) {
                scribl.file = bam;
                bam.fetch(chr, start, end, function (r, e) {
                    if (r) {
                        for (var i = 0; i < r.length; i += 1) {
                            track.addFeature(new BlockArrow('bam', r[i].pos, r[i].lengthOnRef, '+', {'seq': r[i].seq}))
                        }
                        track.status = "received";
                        if (track.drawOnResponse)
                            scribl.redraw();
                        //callback();
                    }
                    if (e) {
                        alert('error: ' + e);
                    }
                });
            });
        return track;
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
        this.width=window.innerWidth - 80;
        this.stage = new Kinetic.Stage({container: 'container', width :this.width , height: 800});
        this.initScale();
        var messageLayer = new Kinetic.Layer();
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

        var scaleLayer=this.drawScale(new Kinetic.Layer({offsetY:-(DRAWINGS_HEIGHT)}));
        this.stage.add(scaleLayer);
        //scaleLayer.on('mouseover',function(){alert('wtf?');});


      // initalize variables

       //My hack to shift the entire graph down to make room
      //  ctx.translate(0,300);
      //  this.drawScale();
      // ctx.translate(0,-100);

        var tracks=this.tracks;
        var featuresLayer = new Kinetic.Layer({offsetY:-DRAWINGS_HEIGHT,scaleY:1});
      // draw tracks
        tracks[0].draw(featuresLayer);
        var resultsLayer=new Kinetic.Layer({offsetX:-this.offset, offsetY:-DRAWINGS_HEIGHT-this.getScaleHeight()});
        this.featureTrack.draw(featuresLayer,resultsLayer);
         this.stage.add(featuresLayer);
        this.stage.add(resultsLayer);

        dragDisplayLayer = new Kinetic.Layer({});
        dragDisplayRect=new Kinetic.Rect({visible:false,height:490,y:50,width:10,x:0,stroke:'purple'});
        dragDisplayLayer.add(dragDisplayRect);
        this.stage.add(dragDisplayLayer);
   },

    /**
     * Deletes everything, like if we just did init()
     */
    clear:function(){
        //this.scale.max = undefined;
        //this.scale.min = undefined;
        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
        this.tracks[0]=new Track(this);
        this.featureTrack = new FeatureTrack(this, this.laneSizes);
    },

   /** **redraw**

    * _clears chart/view and draws it_
    
    * @api public
    */			
	redraw: function(){
      this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
      if (this.tracks.length > 0)
         this.draw();
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
      else
         firstMinorTick = this.scale.min - (this.scale.min % this.tick.minor.size) 
            + this.tick.minor.size;
 		    
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
          newLine.msg=i;
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
    * @return nucleotides or pixels/nts ratio
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
	
	/** **initScrollable**
   
    * _turns static chart into scrollable chart_
   
    * @api internal
    */
	initScrollable: function() {
      var scrollStartMin;
	    
      if (!this.scrolled){
         // create divs
         var parentDiv = document.createElement('div');
         var canvasContainer = document.createElement('div');
         var sliderDiv = document.createElement('div');
         sliderDiv.id = 'scribl-zoom-slider';
         sliderDiv.className = 'slider';
         sliderDiv.style.cssFloat = 'left';
         sliderDiv.style.height = (new String(this.canvas.height * .5)) + 'px';
         sliderDiv.style.margin = '30px auto auto -20px'
        
         // grab css styling from canavs
         parentDiv.style.cssText = this.canvas.style.cssText;
         this.canvas.style.cssText = '';
         parentWidth = parseInt(this.canvas.width) + 25;
         parentDiv.style.width = parentWidth + 'px';
         canvasContainer.style.width = this.canvas.width + 'px';
         canvasContainer.style.overflow = 'auto';
         canvasContainer.id = 'scroll-wrapper';                     
         
         
         
         this.canvas.parentNode.replaceChild(parentDiv, this.canvas);
         parentDiv.appendChild(sliderDiv);
         canvasContainer.appendChild(this.canvas);
         parentDiv.appendChild(canvasContainer);

         jQuery(canvasContainer).dragscrollable({dragSelector: 'canvas:first', acceptPropagatedEvent: false});      
      }
           
      var totalNts =  this.scale.max - this.scale.min;
      var scrollStartMax = this.scrollValues[1] || this.scale.max - totalNts * .35;
      if( this.scrollValues[0] != undefined)
          scrollStartMin = this.scrollValues[0];
      else
          scrollStartMin = this.scale.max + totalNts * .35;            

      var viewNts = scrollStartMax - scrollStartMin;            
      var viewNtsPerPixel = viewNts / document.getElementById('scroll-wrapper').style.width.split('px')[0];

      var canvasWidth = (totalNts / viewNtsPerPixel) || 100;
      this.canvas.width = canvasWidth;
      this.width = canvasWidth - 30;
      schart = this;
      var zoomValue = (scrollStartMax - scrollStartMin) / (this.scale.max - this.scale.min) * 100 || 1;

      jQuery(sliderDiv).slider({
         orientation: 'vertical',
         range: 'min',
         min: 6,
         max: 100,
         value: zoomValue,
         slide: function( event, ui ) {
            var totalNts = schart.scale.max - schart.scale.min;
            var width = ui['value'] / 100 * totalNts;
            var widthPixels = ui['value'] / 100 * schart.canvas.width;
            var canvasContainer = document.getElementById('scroll-wrapper');
            var center = canvasContainer.scrollLeft + parseInt(canvasContainer.style.width.split('px')[0]) / 2;
                    
            // get min max pixels
            var minPixel = center - widthPixels/2;
            var maxPixel = center + widthPixels/2;
            
            // convert to nt
            var min = schart.scale.min + (minPixel / schart.canvas.width) * totalNts;
            var max = schart.scale.min + (maxPixel / schart.canvas.width) * totalNts;

            schart.scrollValues = [min, max];
            schart.ctx.clearRect(0, 0, schart.canvas.width, schart.canvas.height);
            schart.draw();
         }
      });
        

      var startingPixel = (scrollStartMin - this.scale.min) / totalNts * this.canvas.width;        
      document.getElementById('scroll-wrapper').scrollLeft = startingPixel;
      this.scrolled = true;
	},


   /** **determineMajorTick**
   
    * _intelligently determines a major tick interval based on size of the chart/view and size of the numbers on the scale_
   
    * @return {Int} major tick interval
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

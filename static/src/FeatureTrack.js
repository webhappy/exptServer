/**
 * Created by davidc on 1/17/14.
 */
var FeatureTrack = Lane.extend({
    init: function(chart) {
      // defaults
      this.items=[];
        this.chart=chart;
        this.ctx=chart.ctx;
        this.track=[];
        this.track.chart=chart;
        this.tickers=[]; //sgRNA tickers
	},

    /**
     *
     * @param {Int} coord
     * @returns {*}
     */
    getTickerPositionX: function(coord) {
      var position = coord - this.chart.scale.min;
      return ( this.chart.convertNtsToPixels( position ) );
   },

    drawIndicatorLine: function(layer,yPos,name, namePos,strokeWidth,strokeStyle,dashStyle) {
        if (!strokeStyle)
            strokeStyle = '#E0E0E0';
        if (!strokeWidth)
            strokeWidth=1;
        if (!dashStyle)
            dashStyle=[10,5];

        var l=new Kinetic.Line({points:[0,0,this.chart.width,0],stroke:strokeStyle,dash:dashStyle,strokeWidth:strokeWidth,offsetY:yPos});
        layer.add(l);
        if ( name ) {
            if (!namePos)
                namePos=20;
            var t=new Kinetic.Text({text:name,fill:'black',x:namePos,y:0,offsetY:yPos});
            t.setY(-t.height() / 2);
            layer.add(new Kinetic.Rect({x:namePos-2,y:-t.height()/2,offsetY:yPos,fill:COLOR_BG,height: t.height(),width: 8+t.width()}));
            layer.add(t);
        }

        return l;
    },

    drawSmootherForStrand: function (group,origTickers,strand,color){
         var Y_MIN=-4;
        var Y_MAX=4;
        function convertYValtoPixelPos (yVal) {
            var adj=-1.0*RESULT_HEIGHT * (yVal - Y_MIN)/(Y_MAX-Y_MIN);
            if ( adj < -RESULT_HEIGHT)
                adj=-RESULT_HEIGHT;
            if ( adj > RESULT_HEIGHT)
                adj=RESULT_HEIGHT;
           // alert(adj+RESULT_HEIGHT);
            return adj+RESULT_HEIGHT; //Notice it's slightly different from drawExptResults
        }

        var topPositions={}, botPositions={};
        var tickers=[];
        var OFFSET=10;
        for (var j=0;j<origTickers.length;j++) {
            if ( origTickers[j].strand==strand)
                tickers.push(origTickers[j]);
        }
        for (var j=0;j<tickers.length;j++) {
            var cur=tickers[j];
            var m = mean(cur.yVals);
            var stdErr = std(cur.yVals) / Math.sqrt(cur.yVals.length);
            topPositions[cur.left+OFFSET]=m+stdErr;
            botPositions[cur.left+OFFSET]=m-stdErr;
        }

        var NUM_INTERPOLATING_POINTS=500;
        var interval=(this.chart.scale.max-this.chart.scale.min)/NUM_INTERPOLATING_POINTS;
        var curIdx=0; //increment this to keep track of where we are in this.tickers
        var prevTickerCoord=tickers[0].left+OFFSET;
        var prevTickerYtop=topPositions[prevTickerCoord],prevTickerYbot=botPositions[prevTickerCoord];
        var lastInterpolatingYtop=convertYValtoPixelPos(prevTickerYtop);
        var lastInterpolatingYbot=convertYValtoPixelPos(prevTickerYbot);
        var lastInterpolatingX=this.getTickerPositionX(prevTickerCoord);

        for (var curCoord=this.chart.scale.min;curCoord<= this.chart.scale.max;curCoord+=interval) {
            var conf=0; //increase this for very close points
            for (var j=0;j<tickers.length;j++){
                //calculate distance for this
                if (Math.abs(tickers[j].left+OFFSET-curCoord)<500){
                    conf+=Math.exp((-Math.pow(tickers[j].left+OFFSET-curCoord,2))/20);
                }
            }
            //conf /= tickers.length;

            if (conf > 1e-5)
            {
                if (curIdx < tickers.length && curCoord>=tickers[curIdx].left+OFFSET){
                    //need to increment curIdx
                    prevTickerCoord=tickers[curIdx].left+OFFSET;
                    prevTickerYtop = topPositions[prevTickerCoord];
                    prevTickerYbot=botPositions[prevTickerCoord];
                    var curTopYPixel=convertYValtoPixelPos(prevTickerYtop);
                    var curBotYPixel = convertYValtoPixelPos(prevTickerYbot);
                    var curXPixel=this.getTickerPositionX(curCoord);
                    if (curIdx>0) {
                        var l=new Kinetic.Line({closed:true,strokeWidth:0,fill:color,opacity:conf,stroke:'',
                            points:[lastInterpolatingX-2,lastInterpolatingYtop,lastInterpolatingX-2,lastInterpolatingYbot,curXPixel,curBotYPixel,curXPixel,curTopYPixel]});

                    }else {
                       var l=new Kinetic.Line({closed:true,strokeWidth:0,fill:color,opacity:conf,stroke:'',
                            points:[curXPixel-interval,curTopYPixel,curXPixel-interval,curBotYPixel,curXPixel,curBotYPixel,curXPixel,curTopYPixel]});
                    }
                    group.add(l);
                    lastInterpolatingX=curXPixel;
                    lastInterpolatingYtop=curTopYPixel;
                    lastInterpolatingYbot=curBotYPixel;
                    curIdx++;
                }else if (curIdx==0 || curIdx>=tickers.length){
                    var curTopYPixel=convertYValtoPixelPos(prevTickerYtop);
                    var curBotYPixel = convertYValtoPixelPos(prevTickerYbot);
                    var curXPixel=this.getTickerPositionX(curCoord);
                    var l=new Kinetic.Line({closed:true,strokeWidth:0,fill:color,opacity:conf,stroke:'',
                            points:[curXPixel-interval,curTopYPixel,curXPixel-interval,curBotYPixel,curXPixel,curBotYPixel,curXPixel,curTopYPixel]});
                    group.add(l);
                }
                    else
                    {
                        //     if (curIdx>0) {
                        //interpolate between prevPosition and curIdx
                        var nextX=tickers[curIdx].left+OFFSET;
                        var nextYtop=topPositions[nextX];
                        var nextYbot=botPositions[nextX];
                        //newY=lastY + deltaX * slope
                        var changeYtop=prevTickerYtop+(curCoord-prevTickerCoord)*(nextYtop-prevTickerYtop)/(nextX-prevTickerCoord);
                        var changeYbot=prevTickerYbot+(curCoord-prevTickerCoord)*(nextYbot-prevTickerYbot)/(nextX-prevTickerCoord);

                        var curYPixelTop = convertYValtoPixelPos(changeYtop);
                        var curYPixelBot = convertYValtoPixelPos(changeYbot);
                        var curXPixel=this.getTickerPositionX(curCoord);

                        // if (conf<1e-6)
                        //     continue; //don't attempt to draw a line
                        // {
                        //draw a line
                        var l=new Kinetic.Line({closed:true,strokeWidth:0,fill:color,stroke:'',opacity:conf,
                            points:[lastInterpolatingX-2,lastInterpolatingYtop,lastInterpolatingX-2,lastInterpolatingYbot,curXPixel,curYPixelBot,curXPixel,curYPixelTop]});
                        group.add(l);
                        // }
                        lastInterpolatingYbot=curYPixelBot;
                        lastInterpolatingYtop=curYPixelTop;
                        lastInterpolatingX=curXPixel;
                        // }
                }
            }

        }
    },

    drawSmoother: function (resultsLayer) {
        var group = new Kinetic.Group();

        var origTickers = this.tickers;
        this.drawSmootherForStrand(group,origTickers,'+','#B8A1B8');
        this.drawSmootherForStrand(group,origTickers,'-','#889F9A');

        resultsLayer.add(group);
    },

    /**
     * Assumes drawScale in the associated chart has already been called. We will use the now computed offset
     */
    drawExptResults: function (layer) {
        function getHeight (yVal) {
            return 1.0*RESULT_HEIGHT * (yVal - Y_MIN)/(Y_MAX-Y_MIN)
        }
        var Y_MIN=-4;
        var Y_MAX=4;
        var ARROW_PIXELS=5;//Math.round(this.chart.convertNtsToPixels(7));

        var drawLinesAtSD = [-3, -2, -1, 1, 2];
        for (var j=0;j<drawLinesAtSD.length;j++){
            var curSD=drawLinesAtSD[j];
            var curY=curSD*this.chart.sd;
            var yPos=getHeight(curY)-RESULT_HEIGHT;
            this.drawIndicatorLine(layer, yPos, curSD+' SD='+curY.toPrecision(4), 40, 1, 'grey');
        }

        this.drawIndicatorLine(layer, -RESULT_HEIGHT / 2, 'LR=0', 10, 2, 'black',[15,5]);

        //huh?
        //this.drawSmoother(layer);

        var pixelsWidth=Math.ceil(this.chart.convertNtsToPixels(20));
        for (var j=0;j<this.tickers.length;j++) {
            var cur=this.tickers[j];
            for (var k=0;k<cur.yVals.length;k++) {
                var posX = this.getTickerPositionX(cur.left);
                var height = getHeight(cur.yVals[k]);
                var group=new Kinetic.Group({offsetX:-posX,offsetY:-RESULT_HEIGHT+height});
                if ( cur.strand=='+' ) {
                    group.add(new Kinetic.Line({strokeWidth:2,points: [0, 0, pixelsWidth, 0,pixelsWidth-ARROW_PIXELS,-ARROW_PIXELS],stroke:this.chart.exptColors[k]}));
                }
                else {
                    group.add(new Kinetic.Line({strokeWidth:2,
                        points: [pixelsWidth, 0, 0, 0,ARROW_PIXELS,ARROW_PIXELS],stroke:this.chart.exptColors[k]}
                    ));
                }
                group.msg='yVals @ '+cur.left+'('+cur.strand+'), '+this.chart.exptNames[k]+': '+cur.yVals[k];
                group.on('mouseover', function() {
                    writeMessage(this.msg);
                  });
                  group.on('mouseout', function() {
                    writeMessage('');
                  });
                layer.add(group);
            }
        }
    },

    draw: function(layer,resultsLayer) {
        for (var j=0;j<this.items.length;j++) {
            this.items[j].feature.draw(layer);
        }
        this.drawExptResults(resultsLayer);
    },

    getHeight: function() {
        return 0;
    },

    addGene: function (left, length,name,strand) {
        strand = strand || '+';
        var cutOff = Math.round(this.chart.convertPixelstoNts(15));
        if (length < cutOff )
            var rightAdjusted=left+cutOff;
        else
            var rightAdjusted=left+length;
        var r=this.findLowestRow(left,rightAdjusted,0);
        var p=new BlockArrow(this.chart,'gene',left,length,strand,TFBS_HEIGHT*r/*+this.geneHeight*/);
        p.name=name;
        p.lane=this;
        this.items.push({'left':left,'right':rightAdjusted,'level':r,'feature':p,'height':2});
        return p;
    },

    addTicker: function(left,strand, yVals) {
        var t={'left':left,'strand':strand,'yVals':yVals}//new sgRNATicker(this,left,strand,yVals);
        t.lane=this;
        this.tickers.push(t);
    },

    addSRNA: function(left, length, name,strand) {
        strand = strand || '+';
        var cutOff = Math.round(this.chart.convertPixelstoNts(15));
        if (length < cutOff )
            var rightAdjusted=left+cutOff;
        else
            var rightAdjusted=left+length;
        var r=this.findLowestRow(left,rightAdjusted,3);
        var p=new sRNA('sRNA',left,length,strand,TFBS_HEIGHT*r/*+this.geneHeight*/);
        p.name=name;
        p.lane=this;
        this.items.push({'left':left,'right':rightAdjusted,'level':r,'feature':p,'height':1});
        return p;
    },

    addPromoter: function(left, length, name,strand) {
        strand = strand || '+';
        var cutOff = this.chart.convertPixelstoNts(100);
        if (length < cutOff )
            var rightAdjusted=left+cutOff;
        else
            var rightAdjusted=left+length;
        var r=this.findLowestRow(left,rightAdjusted,3);
        var p=new Promoter('promoter',left,length,strand,TFBS_HEIGHT*r/*+this.geneHeight*/);
        p.name=name;
        p.lane=this;
        this.items.push({'left':left,'right':rightAdjusted,'level':r,'feature':p,'height':1});
        return p;
    },

    addTFBS: function(left,length,name,strand){
        strand = strand || '+';
        var right=left+length;
        var r=this.findLowestRow(left,right);
        var p=new TFBS('TFBS',left,length,strand,25*r);
        p.name=name;
        p.lane=this;
        this.items.push({'left':left,'right':right,'level':r,'feature':p,'height':1});
        return p;
    },

    /**
     * Returns lowest row where we don't conflict
     * @param left nucleotide coordinate
     * @param right nucleotide coordinate
     * @param [minRow=0] lowest allowed row (set higher for promoters so they look nice)
     * @returns {number}
     */
    findLowestRow: function( left,  right,  minRow) {
        minRow=minRow || 0;
        var blockedRows=[];

        for (var i=0;i<this.items.length;i++){
            if (this.items[i].right<=left)
                continue;
            else if (this.items[i].left >= right )
                continue;
            //No longer assumes that items is sorted
            //If we get to here, items[i] is within the range of interest
            for (var l=0;l<this.items[i].height;l++)
                blockedRows[this.items[i].level+l]=true;
        }

        for (var j=minRow;;j++) {
            if ( blockedRows[j] )
                continue;
            return j;
        }
    }
});



/**
 * Created by davidc on 1/17/14.
 */
var sRNA = Glyph.extend({
    init: function(type, position, length, strand, height, opts) {
         // call super init method to initialize glyph
         this._super(type, position, length, strand, opts);
         this.height = height;
         this.glyphType = "sRNA";
      },



    //Assume context is at the bottom of all genes
    draw: function(layer) {
        var length = length || this.getPixelLength();
        var height = this.height ;

        var lineLen=length;

        // draw lines
        var offsetX=this.getPixelPositionX();
        var group=new Kinetic.Group({
            offsetX:-offsetX,offsetY:0
        });
        var sRNAgroup=new Kinetic.Group({});

        var lines=new Kinetic.Line({
            points:[0,-height,lineLen,-height],
            stroke:'orange',
            closed:false
        });

        sRNAgroup.add(lines);
        if (this.strand=='-') {
            sRNAgroup.scale({x:-1,y:1});
        }

        group.add(sRNAgroup);

        group.msg=this.name+' is sRNA '+' has height '+height;
        group.on('mouseover', function() {
            writeMessage(this.msg);
        });
        group.on('mouseout', function() {
            writeMessage('');
        });
        //layer.add()
        group.add(sRNAgroup);
        var text=new Kinetic.Text({
            text:this.name,
            x:length/2,
            y:-height,
            fontSize:14,
            fill:'black'
        });
        text.offsetX(text.width()/2);
        if (this.strand=='-')
            text.offsetX(length);

        group.add(text);
        layer.add(group);

    }
})
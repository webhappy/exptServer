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

    /**
     * Assumes drawScale in the associated chart has already been called. We will use the now computed offset
     */
    drawExptResults: function (layer) {
        function getHeight (yVal) {
            return -20 + 1.0*RESULT_HEIGHT * (yVal - Y_MIN)/(Y_MAX-Y_MIN)
        }

        function convertPvalToAlpha (pVal) {
            return .8921*Math.exp(-10.8977*pVal)+.2;
        }

        var Y_MIN=this.chart.y_min;
        var Y_MAX=this.chart.y_max;
        var ARROW_PIXELS=5;//Math.round(this.chart.convertNtsToPixels(7));

        var drawLinesAtSD = [-3, -2, -1, 1, 2];
        for (var j=0;j<drawLinesAtSD.length;j++){
            var curSD=drawLinesAtSD[j];
            var curY=curSD*this.chart.sd;
            var yPos=getHeight(curY)-RESULT_HEIGHT;
            this.drawIndicatorLine(layer, yPos, curSD+' SD='+curY.toPrecision(4), 40, 1, 'grey');
        }

        this.drawIndicatorLine(layer, getHeight(0) - RESULT_HEIGHT, 'LR=0', 10, 2, 'black',[15,5]);

        //huh?
        //this.drawSmoother(layer);

        var pixelsWidth=Math.ceil(this.chart.convertNtsToPixels(20));
        for (var j=0;j<this.tickers.length;j++) {
            var cur=this.tickers[j];
            var posX = this.getTickerPositionX(cur.left);
            var height = getHeight(cur.yVal);
            if ( highlighted_sgRNAs.indexOf(cur.seq) > -1  ) {
                opacity = 1;
                color = 'magenta';
            }else {
                var opacity = convertPvalToAlpha(cur.pval);
                var color = 'black';
            }
            var group=new Kinetic.Group({offsetX:-posX,offsetY:-RESULT_HEIGHT+height,opacity: opacity});
            if ( cur.strand=='+' ) { //alpha:convertPvalToAlpha(cur.pval)
                group.add(new Kinetic.Line({stroke: color,strokeWidth:2,points: [0, 0, pixelsWidth, 0,pixelsWidth-ARROW_PIXELS,-ARROW_PIXELS]}));
            }
            else {
                group.add(new Kinetic.Line({strokeWidth:2,
                    points: [pixelsWidth, 0, 0, 0,ARROW_PIXELS,ARROW_PIXELS],stroke:color}
                ));
            }
            group.msg='yVals @ '+cur.left+'('+cur.strand+") has log fold-change of "+cur.yVal.toFixed(2)+" at p="+(cur.pval <.01 ? cur.pval.toExponential(2) : cur.pval.toFixed(2))+ "\n"+cur.message.replace(/<br>/mg,'\n');
            group.on('mouseover', function() {
                chart1.preventDrag = true;
                writeMessage(this.msg);
              });
              group.on('mouseout', function() {
                chart1.preventDrag = false;
                writeMessage('');
              });
            group.seq=cur.seq;
            group.on('click',function(evt){
                window.prompt("Copy sgRNA sequence to clipboard (Hit ctrl+c here)",this.seq); //Suggested http://stackoverflow.com/questions/400212/how-to-copy-to-the-clipboard-in-javascript
                evt.cancelBubble=true;
            })
            layer.add(group);
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

    addTicker: function(left,strand, yVal,pVal,message,seq) {
        this.tickers.push({'left':left,'strand':strand,'yVal':yVal,'pval':pVal,'message':message,'seq':seq,'lane':this});
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
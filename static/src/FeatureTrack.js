/**
 * Created by davidc on 1/17/14.
 */
var TFBS_HEIGHT=25;
var GENE_HEIGHT=2*TFBS_HEIGHT;
var RESULT_HEIGHT=300; //height of the panel where we draw the experimental data
var FeatureTrack = Lane.extend({
    init: function(chart, geneHeight) {
      // defaults
      this.items=[];
        this.geneHeight=geneHeight;
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
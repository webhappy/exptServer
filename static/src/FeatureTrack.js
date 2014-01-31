/**
 * Created by davidc on 1/17/14.
 */
var TFBS_HEIGHT=25;
var GENE_HEIGHT=2*TFBS_HEIGHT;
var RESULT_HEIGHT=200; //height of the panel where we draw the experimental data
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

    /**
     * Assumes drawScale in the associated chart has already been called. We will use the now computed offset
     */
    drawExptResults: function (layer) {
        var Y_MIN=-4;
        var Y_MAX=4;
        var ARROW_PIXELS=5;//Math.round(this.chart.convertNtsToPixels(7));

        layer.add(new Kinetic.Line({
            points:[0,0,this.chart.width,0],
            stroke:'black',
            dash:[15,5],
            offsetY:-RESULT_HEIGHT/2
        }));
        //Draw 0 by dashed line
        var text0 = new Kinetic.Text({text: '0', fill: 'black',offsetX:8});
        text0.offsetY(-RESULT_HEIGHT / 2+text0.getHeight() / 2);
        layer.add(text0);

        var pixelsWidth=Math.ceil(this.chart.convertNtsToPixels(20));
        for (var j=0;j<this.tickers.length;j++) {
            var cur=this.tickers[j];
            for (var k=0;k<cur.yVals.length;k++) {
                var posX = this.getTickerPositionX(cur.left);
                var height = 1.0*RESULT_HEIGHT * (cur.yVals[k] - Y_MIN)/(Y_MAX-Y_MIN);
                var group=new Kinetic.Group({offsetX:-posX,offsetY:-RESULT_HEIGHT+height});
                if ( cur.strand=='+' ) {
                    group.add(new Kinetic.Line({points: [0, 0, pixelsWidth, 0,pixelsWidth-ARROW_PIXELS,-ARROW_PIXELS],stroke:this.chart.exptColors[k]}));
                }
                else {
                    group.add(new Kinetic.Line({
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
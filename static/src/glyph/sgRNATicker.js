/**
 * Created by davidc on 1/19/14.
 */
var sgRNATicker = Glyph.extend({
    init: function( container,position, strand, yVals) {
         // call super init method to initialize glyph
         this._super('ticker', position, 20, strand);
         this.yVals = yVals;
         this.featureTrack=container;
         this.glyphType = "ticker";
      },


    /**
     * Render the tickers. Context must be iniitalized to top-left of the region to draw into
     * @param yMin
     * @param yMax
     * @param [drawStyle=1] 1=draw mean only, in the future, want options to show separate points
     */
    draw: function(yMin,yMax, drawStyle){
        yMin=yMin || -4;
        yMax=yMax || 4;
        drawStyle=drawStyle || 1;

        var totalSum=0;
        for (var i=0;i<this.yVals.length;i++) {
            totalSum += this.yVals[i];
        }
        var m = totalSum/this.yVals.length;
        var ctx = this.featureTrack.ctx;
        var position = this.getPixelPositionX();
        ctx.save();

        var length=this.getPixelLength();
        ctx.strokeRect(position,-20,length, -.9*TFBS_HEIGHT);
        var fontStyle = 'arial';
        ctx.font = '16px '+fontStyle;
        ctx.fillStyle = 'black';


        ctx.restore();
    }
})

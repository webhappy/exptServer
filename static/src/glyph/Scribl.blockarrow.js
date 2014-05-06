/**
 * **Scribl::Glyph::BlockArrow**
 *
 * _Glyph used to draw any blockarrow shape_
 *
 * Chase Miller 2011
 */
var geneGlyphCount=0;
var BlockArrow = Glyph.extend({
    /** **init**

     * _Constructor, call this with `new BlockArrow()`_

     * @param {String} type - a tag to associate this glyph with
     * @param {Int} position - start position of the glyph
     * @param {Int} length - length of the glyph
     * @param {String} strand - '+' or '-' strand
     * @api public
     */
    init: function (chart,type, position, length, strand, height) {
        this.chart=chart;
        // call super init method to initialize glyph
        this._super(type, position, length, strand);
        this.height=height;
        this.glyphType = "BlockArrow";
    },

    draw: function (layer) {
        var blockarrow = this;
        // see if optional parameters are set and get chart specific info
        var length = length || blockarrow.getPixelLength();

        var lenArrow=Math.min(.3*length,GENE_HEIGHT);
        var heightRect =Math.max(10, Math.round(lenArrow/4)); //Math.round(GENE_HEIGHT / 4);
        var heightArrow = Math.max(18,Math.round(lenArrow/2));//(GENE_HEIGHT / 2);
        var lenRect=length-lenArrow;//test
        // draw lines
        var offsetX=this.getPixelPositionX();
        var group=new Kinetic.Group({
            offsetX:-offsetX,
            offsetY:TFBS_HEIGHT + this.height
        });
        var poly=new Kinetic.Line({
            points:[0,heightRect,0,-heightRect,lenRect,-heightRect,lenRect,-heightArrow,length,0,lenRect,heightArrow,lenRect,heightRect],
            stroke:'black',
            fill:'#ffbb73',
            id: 'gene'+geneGlyphCount++,
            closed:true
        });

        /*
        Compute where the center of the text should be
        Want to align between rectangle edge and halfway into arrowhead

         */
        var center;
        if (this.strand=='-') {
            poly.scale({x:-1,y:1});
            poly.offsetX(length);
            center=(lenRect/2+lenRect+lenArrow)/2;
        } else
            center=(lenRect+lenArrow/2)/2;

        group.msg=this.name +' starts at '+this.position + ' for '+this.length+ ' bp.';
        group.on('mouseover', function() {
            writeMessage(this.msg);
        });
        group.on('mouseout', function() {
            writeMessage('');
        });

        //layer.add()
        group.add(poly);

        //Render the text
        var text=new Kinetic.Text({
            text:this.name,
            x:0,
            y:-6,
            fontSize:14,
            fill:'black',
        })
        while ( text.fontSize()> 10 && text.width()>length)
            text.fontSize(text.fontSize()-1);
        var x=center-text.width()/2;
        if ( x-group.offsetX() < 20)
            x=20+group.offsetX();
        else if ( (x-group.offsetX()) > this.chart.width-20)
            x=group.offsetX()+this.chart.width-60;
        text.setX(x);

        group.add(text);
        layer.add(group);
    }
});
		


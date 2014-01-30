/**
 * **Scribl::Glyph::BlockArrow**
 *
 * _Glyph used to draw any blockarrow shape_
 *
 * Chase Miller 2011
 */

var BlockArrow = Glyph.extend({
    /** **init**

     * _Constructor, call this with `new BlockArrow()`_

     * @param {String} type - a tag to associate this glyph with
     * @param {Int} position - start position of the glyph
     * @param {Int} length - length of the glyph
     * @param {String} strand - '+' or '-' strand
     * @param {Hash} [opts] - optional hash of attributes that can be applied to glyph
     * @api public
     */
    init: function (chart,type, position, length, strand, opts) {
        this.chart=chart;
        // call super init method to initialize glyph
        this._super(type, position, length, strand, opts);
        this.slope = 1;
        this.glyphType = "BlockArrow";
    },

    draw: function (layer) {
          var blockarrow = this;
         // see if optional parameters are set and get chart specific info
         var length = length || blockarrow.getPixelLength();
         var height = height || blockarrow.getHeight();

         var side = length*.75;

           var lenArrow=height/2;
            var heightRect = Math.round(height / 4);
            var heightArrow = Math.round(height / 2);
            var lenRect=length-lenArrow;
         // draw lines
        var offsetX=this.getPixelPositionX();
        var group=new Kinetic.Group({
            offsetX:-offsetX,
            offsetY:LANE_HEIGHT/2
        });
           var poly=new Kinetic.Line({
               points:[0,heightRect,0,-heightRect,lenRect,-heightRect,lenRect,-heightArrow,length,0,lenRect,heightArrow,lenRect,heightRect],
               stroke:'black',
               closed:true
           });
        if (this.strand=='-') {
            poly.scale({x:-1,y:1});
            poly.offsetX(length);
        }

        poly.name=this.name;
        poly.on('mouseover', function() {
        writeMessage(this.name);
      });
      poly.on('mouseout', function() {
        writeMessage('');
      });
        //layer.add()
    group.add(poly);
     group.add(new Kinetic.Text({
         text:this.name,
         x:length/2,
         y:-6,
         fontSize:14,
         fill:'black',
     }));
        layer.add(group);


    }
   });
		


/**
 * Created by davidc on 1/19/14.
 */
/**
 * Created by davidc on 1/17/14.
 */
var TFBS = Glyph.extend({
    init: function(type, position, length, strand, height, opts) {
         // call super init method to initialize glyph
         this._super(type, position, length, strand, opts);
         this.height = height;
         this.glyphType = "TFBS";
      },



    //Assume context is at the bottom of all genes
    	draw: function(layer) {
     var length = length || this.getPixelLength();
        var height = this.height ;

        var lineLen=length;

        // draw lines
        var offsetX=this.getPixelPositionX();
        var group=new Kinetic.Group({
            offsetX:-offsetX,offsetY:height
        });

        var rect=new Kinetic.Rect({
            x:0,
            y:0,
            width:length,
            height:-TFBS_HEIGHT,
            stroke:'black'
        });

        if (this.strand=='-') {
            rect.scale({x:-1,y:1});
        }

        group.add(rect);

        group.msg=this.name+' is TFBS '+' at position '+this.position+' for '+this.length+ ' nt';
        group.on('mouseover', function() {
            writeMessage(this.msg);
        });
        group.on('mouseout', function() {
            writeMessage('');
        });
        //layer.add()
        var text=new Kinetic.Text({
            text:this.name,
            x:0,
            y:- TFBS_HEIGHT/2,
            fontSize:15,
            fill:'black'
        });
        while ( text.fontSize()> 10 && text.width()>length)
            text.fontSize(text.fontSize()-1);
        if (this.strand=='-')
            text.offsetX(length);

        group.add(text);
        layer.add(group);
   }
})
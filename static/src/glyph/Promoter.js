

var Promoter = Glyph.extend({
    init: function(type, position, length, strand, height, opts) {
         // call super init method to initialize glyph
         this._super(type, position, length, strand, opts);
         this.height = height;
         this.glyphType = "Promoter";
      },



    //Assume context is at the bottom of all genes
    	draw: function(layer) {
 var length = length || this.getPixelLength();
         var height = this.height ;

         var side = length*.75;

        var arrowLen=10;
        var lineLen=length-arrowLen;

         // draw lines
        var offsetX=this.getPixelPositionX();
        var group=new Kinetic.Group({
            offsetX:-offsetX,offsetY:0
        });
            var promoterGroup=new Kinetic.Group({});

           var lines=new Kinetic.Line({
               points:[0,0,0,-height,lineLen,-height],
               stroke:'black',
               closed:false
           });
            var arrowHead=new Kinetic.Line({
                points:[lineLen,-height-arrowLen/2,lineLen,-height+arrowLen/2,length,-height],
                stroke:'black',
                fill:'black',
                closed:true
            });



             var lenArrow=height/2;
            var heightRect = Math.round(height / 4);
            var heightArrow = Math.round(height / 2);
            var lenRect=length-lenArrow;
         // draw lines
        var offsetX=this.getPixelPositionX();



            promoterGroup.add(lines);
            promoterGroup.add(arrowHead);
        if (this.strand=='-') {
            promoterGroup.scale({x:-1,y:1});
           // promoterGroup.offsetX(length);
         }

        group.add(promoterGroup);

        group.msg=this.name+' starts at '+this.position+' for length '+this.length+' nt';
        group.on('mouseover', function() {
        writeMessage(this.msg);
      });
      group.on('mouseout', function() {
        writeMessage('');
      });
        //layer.add()
    group.add(promoterGroup);
            var text=new Kinetic.Text({
         text:this.name,
         x:length/2,
         y:-height,
         fontSize:12,
         fill:'black',
        offsetY:15
     });
    if (this.strand=='-')
        text.offsetX(length+5);
    else
        text.offsetX(text.width()/2);


     group.add(text);
        layer.add(group);
  }
})
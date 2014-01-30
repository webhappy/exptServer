/**
 * Created by davidc on 1/24/14.
 */
var MAX_NT_SLIDER=6000;

function updateRanges () {
    var vals = $('#slider').val();
    $('input[name="left"]').val(Math.round(chart1.ntOffset+Math.round(vals[0])));
    $('input[name="right"]').val(Math.round(chart1.ntOffset+Math.round(vals[1])));
}

function updateAjax() {
     //   alert('here');
    $.ajax({
        url: '/getFeatures',
        data: {
            left: $('input[name="left"]').val(),
            right:$('input[name="right"]').val(),
        },
        type:"GET",
        dataType:"json",
        success:function (json) {
            chart1.clear();
            var rightVal=parseInt($('input[name="right"]').val());
            var leftVal=parseInt($('input[name="left"]').val());
            chart1.scale.max=rightVal;
            chart1.scale.min=leftVal;
            var genes = json[0];
            var promoters = json[1];
            var TFBS = json[2];
            var exptInfoWithResults = json[3];
            var exptResults = exptInfoWithResults['exptResults'];
            chart1.exptNames = exptInfoWithResults.exptNames;
            chart1.exptColors=exptInfoWithResults.exptColors;
            var sRNA = json[4];

            for (var j=0;j<genes.length;j++) {
                var cur=genes[j];
                var name = cur[0];
                var strand = cur[1];
                var left = cur[2];
                var len = cur[3];
                var thisGene=chart1.addGene(left,len,strand);
                thisGene.name=name;
            }

            for (var j=0;j<promoters.length;j++) {
                var cur=promoters[j];
                var name = cur[0];
                var strand = cur[1];
                var left = cur[2];
                var len = cur[3];
                var thisPromoter=chart1.addPromoter(left,len,name,strand);
            }

            for (var j=0;j<TFBS.length;j++) {
                var cur=TFBS[j];
                var name = cur[0];
                var left = cur[1];
                var len = cur[2];
                var thisTFBS=chart1.addTFBS(left,len,name);
            }

            for (var j=0;j<sRNA.length;j++) {
                var cur=sRNA[j];
                var name = cur[0];
                var strand = cur[1];
                var left = cur[2];
                var len = cur[3];
                var thisTFBS=chart1.addSRNA(left,len,name,strand);
            }

            for (var curLoc in exptResults) {
                var strand=exptResults[curLoc][0];

                 //Force elements in results as a floating point instead of a string
                for (var j=1;j<exptResults[curLoc].length;j++)
                    exptResults[curLoc][j] = parseFloat(exptResults[curLoc][j]);
                chart1.addTicker(curLoc,strand,exptResults[curLoc].slice(1))
            }

            chart1.ntOffset=Math.max(0,Math.round((leftVal+rightVal)/2)-MAX_NT_SLIDER/2);
            $('#slider').val([leftVal-chart1.ntOffset,rightVal-chart1.ntOffset]);
            chart1.draw();
        },
        error: function (xhr,status) {alert("Error getting JSON!")}
    })
}

var canvas=null;
function draw(canvasName) {

        // Get Canvas and Create Chart
        canvas = document.getElementById(canvasName);

        // Create Chart
        chart1 = new Scribl(canvas, 800);
        chart1.ntOffset=0;

    $('#slider').noUiSlider({range:[0, MAX_NT_SLIDER],start:[2250,2750],handles:2,connect:true,behaviour:'drag',set:updateAjax,slide:updateRanges});

}

$(function() {
    $('a#fetch').bind('click', updateAjax)
})
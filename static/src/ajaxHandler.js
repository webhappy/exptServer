/**
 * Created by davidc on 1/24/14.
 */
var MAX_NT_SLIDER=10000;
var waitingForAJAX=false;
lastDrawTime=new Date().getTime();
function updateRanges () {
    var vals = $('#slider').val();
    $('input[name="left"]').val(Math.round(chart1.ntOffset+Math.round(vals[0])));
    $('input[name="right"]').val(Math.round(chart1.ntOffset+Math.round(vals[1])));

    var curTime = new Date().getTime();
    if (  !waitingForAJAX  && (curTime-lastScrollTime) >250  ) {//&& (curTime-lastScrollTime) < 1000
        waitingForAJAX=true;
        updateAjax(true);
        lastScrollTime=curTime;
    }else if (curTime-lastDrawTime > 30){
        updateChartBoundaries();
        chart1.clear();
        chart1.draw();
        lastDrawTime=curTime;
    }
}

function addJSONDataToChart (json, chart1){
    delete chart1.featureTrack;
    chart1.featureTrack=new FeatureTrack(chart1);
    var genes = json[0];
    var promoters = json[1];
    var TFBS = json[2];
    var exptInfoWithResults = json[3];
    var exptResults = exptInfoWithResults['exptResults'];
    chart1.sd = exptInfoWithResults['all_sd'];
    chart1.exptNames = exptInfoWithResults.exptNames;
    chart1.exptColors=exptInfoWithResults.exptColors;
    var sRNA = json[4];

    for (var j=0;j<genes.length;j++) {
        var cur=genes[j];
        var name = cur[0];
        var strand = cur[1];
        var left = cur[2];
        var len = cur[3];
        var thisGene=chart1.addGene(left,len,strand,name);
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
}

function updateChartBoundaries() {
    var rightVal = parseInt($('input[name="right"]').val());
    var leftVal = parseInt($('input[name="left"]').val());
    $('input[name="gene"]').val('');
    chart1.scale.max = rightVal;
    chart1.scale.min = leftVal;
    return {rightVal: rightVal, leftVal: leftVal};
}
function updateAjax(doNotModifySlider) {
    $.ajax({
        url:  '/getFeatures',
        data: {
            left: $('input[name="left"]').val(),
            right:$('input[name="right"]').val(),
            expt: $('select[name="expt"]').val()
        },
        type:"GET",
        dataType:"json",
        success:function (json) {
            var __ret = updateChartBoundaries();
            var rightVal = __ret.rightVal;
            var leftVal = __ret.leftVal;
            chart1.clear();
            addJSONDataToChart(json, chart1);

            if (!doNotModifySlider) {
                chart1.ntOffset = Math.max(0, Math.round((leftVal + rightVal) / 2) - MAX_NT_SLIDER / 2);
                $('#slider').val([leftVal - chart1.ntOffset, rightVal - chart1.ntOffset]);
            }
            chart1.draw();
            waitingForAJAX = false;
        },
        error: function (xhr,status) {alert("Error getting JSON!")}
    })
}

function getCoordsByAJAX (gene) {
    $.ajax({
        url: '/getGeneCoords',
        data: {
            gene: gene
        },
        type:"GET",
        dataType:"json",
        success:function (json) {
            var left=json[0];
            var right=json[1];
            left-=200;
            right+=200;
            if (left<0) {
                writeMessage('Coords for gene '+gene+' could not be located.');
                //alert('Coords for gene '+gene+' could not be located.');
                return
            } else {
                $('input[name="left"]').val(left);
                $('input[name="right"]').val(right);
                updateAjax();
            }
        },
        error:function(xhr,status){alert('Error getting JSON for gene coords')}
    })
}

var canvas=null;
function initializePage(canvasName) {
        // Get Canvas and Create Chart
        canvas = document.getElementById(canvasName);

        // Create Chart
        chart1 = new Scribl(canvas, 800);
        chart1.ntOffset=0;

    $('#slider').noUiSlider({range:[0, MAX_NT_SLIDER],start:[2250,2750],handles:2,connect:true,behaviour:'drag',set:updateAjax,slide:updateRanges});
    $('input[name="gene"]').keypress(function(evt){
            if (evt.which==13) {
                getCoordsByAJAX($('input[name="gene"]').val());
                $('#geneInput').blur();
            }
        });
    $('input[name="gene"]').blur(function(evt){getCoordsByAJAX($('input[name="gene"]').val());
        });
    updateAjax();
    $(window).resize(function(){chart1.draw()});
    $('select[name="expt"]').change(updateAjax);

      $('#container').mousedown(function(evt) {startDrag(evt.pageX,evt.pageY,evt.which);});
        $('#container').mousemove(function(evt) {checkDrag(evt.pageX,evt.pageY);});
        $('#container').mouseup(function(evt) {stopDrag(evt.pageX,evt.pageY);});
        $('input[name="left"]').keypress(function(evt){
            if (evt.which==13){
                updateAjax();
                $('input[name="left"]').blur();
            }
        });
        $('input[name="right"]').keypress(function(evt){
            if (evt.which==13) {
                updateAjax();
                $('input[name="right"]').blur();
            }
        });
        $('#container').mousewheel(function(event,delta) {
            if ( lastScrollTime && (new Date().getTime()-lastScrollTime) <150 )
            { return;} //abort if we just scrolled
            if (delta > 0) {
                //zoom out
                var factor=200;//Math.max(100,Math.round(.01*chart1.scale.min));
                //factor=Math.min(factor,500);
                  var newLeft=chart1.scale.min-factor;
                  var newRight=chart1.scale.max+factor;
            }else {
                //zoom in
                var factor=-200;//Math.max(100,Math.round(.01*chart1.scale.min));
                //factor=Math.min(factor,500);
                  var newLeft=chart1.scale.min-factor;
                  var newRight=chart1.scale.max+factor;
            }
            if (newRight-newLeft < 100) {
                return false;
            }
            $('input[name="left"]').val(newLeft);
                $('input[name="right"]').val(newRight);
                updateAjax();
                lastScrollTime=new Date().getTime();
            return false;
        });
}

$(function() {
    $('a#fetch').bind('click', updateAjax)
})
/**
 * Created by davidc on 1/24/14.
 */
var sliderNTWidth=10000;
var waitingForAJAX=false;
lastDrawTime=new Date().getTime();
var waitingToDraw=false;
function updateRanges () {
    var curTime = new Date().getTime();
    if (!waitingToDraw && curTime-lastDrawTime>10){
        var vals = $('#slider').val();
        $('input[name="left"]').val(Math.round(chart1.ntOffset+Math.round(vals[0])));
        $('input[name="right"]').val(Math.round(chart1.ntOffset+Math.round(vals[1])));

        if (  !waitingForAJAX  && (curTime-lastScrollTime) >250  ) {//&& (curTime-lastScrollTime) < 1000
            waitingForAJAX=true;
            updateAjax(true);
            lastScrollTime=curTime;
        }else if (!waitingForAJAX && curTime-lastDrawTime > 20){
            updateChartBoundaries();
            chart1.clear();
            chart1.draw();
            lastDrawTime=curTime;
        }
    } //else alert('still waiting to draw!');
}

function sliderBlocked () {
//    alert('blocked!');
//    var curTime = new Date().getTime();
//      var vals = $('#slider').val();
//    $('input[name="left"]').val(Math.round(chart1.ntOffset+Math.round(vals[0])+500));
//    $('input[name="right"]').val(Math.round(chart1.ntOffset+Math.round(vals[1])+500));
//    waitingForAJAX=true;
//    updateAjax(false);
//    lastScrollTime=curTime;
}

/**
 * Clears current data from chart and adds new data to chart from json
 * @param json
 * @param chart1
 */
function addJSONDataToChart (json, chart1){
    delete chart1.featureTrack;
    chart1.featureTrack=new FeatureTrack(chart1);
    var genes = json[0];
    var promoters = json[1];
    var TFBS = json[2];
    var exptInfoWithResults = json[3];
    var exptResults = exptInfoWithResults['exptResults'];
    chart1.sd = exptInfoWithResults['all_sd'];
    chart1.y_max = exptInfoWithResults['max'];
    chart1.y_min = exptInfoWithResults['min'];
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

    for (var j=0; j<exptResults.length; j++) {
        var curTicker = exptResults[j];
        chart1.addTicker(curTicker['pos'],curTicker['strand'],curTicker['logFC'],curTicker['alpha'],curTicker['message'],curTicker['seq'])
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

/**
 * Calls AJAX and then redraws upon success
 * @param doNotModifySlider Leave blank or set false to allow slider bar to readjust.
 */
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
                sliderNTWidth = Math.max(1000, ( rightVal-leftVal) * 5);
                $('#slider').noUiSlider({range:[0, sliderNTWidth]},true);
                chart1.ntOffset = Math.max(0, Math.round((leftVal + rightVal) / 2) - sliderNTWidth / 2);
                $('#slider').val([leftVal - chart1.ntOffset, rightVal - chart1.ntOffset]);
            }
            chart1.draw();
            waitingForAJAX = false;
        },
        error: function (xhr,status) {alert("Error getting JSON!")}
    })
}

function getCoordsBySgRNA (sgRNA) {
    $.ajax({
        url: '/getSgRNACoords',
        data: {
            sgRNA: sgRNA
        },
        type:"GET",
        dataType:"json",
        success:function (json) {
            var left=json[0];
            var right=json[1];
            left-=100;
            right+=100;
            if (left<0) {
                writeMessage('Coords for sgRNA '+sgRNA+' could not be located.');
                //alert('Coords for gene '+gene+' could not be located.');
                return
            } else {
                highlighted_sgRNAs.push(sgRNA.toLowerCase())
                writeMessage('Zooming to sgRNA '+sgRNA+'.');
                $('input[name="left"]').val(left);
                $('input[name="right"]').val(right);
                updateAjax();
            }
        },
        error:function(xhr,status){alert('Error getting JSON for sgRNA coords')}
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
                writeMessage('Zooming to gene '+gene+'.');
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

    ntSlider=$('#slider').noUiSlider({range:[0, sliderNTWidth],start:[2250,2750],handles:2,connect:true,behaviour:'drag',block:sliderBlocked,set:updateAjax,slide:updateRanges});
    $('input[name="gene"]').keypress(function(evt){
            if (evt.which==13) {
                getCoordsByAJAX($('input[name="gene"]').val());
                $('#geneInput').blur();
            }
        });
    $('input[name="gene"]').blur(function(evt){getCoordsByAJAX($('input[name="gene"]').val());
        });
    $('input[name="sgRNA"]').keypress(function(evt){
            if (evt.which==13) {
                getCoordsBySgRNA($('input[name="sgRNA"]').val());
                $('#sgRNAInput').blur();
            }
        });
    $('input[name="sgRNA"]').blur(function(evt){getCoordsBySgRNA($('input[name="sgRNA"]').val());
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

    /*
        $('#container').mousewheel(function(event,delta) {
            if ( lastScrollTime && (new Date().getTime()-lastScrollTime) <150 )
            { return;} //abort if we just scrolled
            if (delta > 0) {
                //zoom out
                var factor=Math.round(.25*(chart1.scale.max-chart1.scale.min));//Math.max(100,Math.round(.01*chart1.scale.min));
                //factor=Math.min(factor,500);
                  var newLeft=chart1.scale.min-factor;
                  var newRight=chart1.scale.max+factor;
            }else {
                //zoom in
                var factor=-1*Math.round(.25*(chart1.scale.max-chart1.scale.min));
                //factor=Math.min(factor,500);
                  var newLeft=chart1.scale.min-factor;
                  var newRight=chart1.scale.max+factor;
            }
            if (newRight-newLeft < 50) {
                return false;
            }
            $('input[name="left"]').val(newLeft);
                $('input[name="right"]').val(newRight);
                updateAjax();
                lastScrollTime=new Date().getTime();
            return false;
        });
    */
}

$(function() {
    $('a#fetch').bind('click', updateAjax)
})
from flask import Flask, url_for, render_template, request, jsonify,json
import os
import cPickle,time
import csv
import numpy
import pandas

app = Flask(__name__)

@app.route('/getFeatures')
def getFeatures():
    left = request.args.get('left', 0, type=int)
    right = request.args.get('right', 0, type=int)
    expt = request.args.get('expt')
    if expt == 'aerobicOnly':
        return json.dumps([getGenes(left,right),getPromoters(left,right),getTFBS(left,right),getExptResultsFromAerobic(left,right),getsRNA(left,right)])
    else: # if expt == 'anaerobicOnly'
        return json.dumps([getGenes(left,right),getPromoters(left,right),getTFBS(left,right),getExptResultsFromAnaerobic(left,right),getsRNA(left,right)])

@app.route('/getGeneCoords')
def getGeneCoords():
    gene=request.args.get('gene')
    for  (geneID,name, strand, left_boundary, right_boundary) in genes:
        if name.lower() == gene.lower():
            return json.dumps([left_boundary,right_boundary])
    return json.dumps([-1,-1])  # Did not find this gene, return [-1,-1] as error code

def getExptResultsFromAerobic (left, right):
    """
    Returns dict with keys of exptNames, exptColors, and exptResults
    exptResults is a dictionary of arrays. exptResults[Pos] represents results at nucleotide Pos
    exptResults[pos] contains an array of results
    exptDescriptions[j] is a text description for the results at exptResults[anyPos][j]
    exptColors[j] is the color used to render all results corresponding to  exptResults[anyPos][j]

    @param left:
    @param right:
    @return:
    """
    ret={}

    exptResults={}
    ret['exptNames']=['Aerobic 1', 'Aerobic 2','Aerobic 3']
    ret['exptColors']=['orange','blue','blue']
    curExpt=allData['aerobic']
    for k in range(len(curExpt['pos'])):
        curPos = curExpt['pos'][k]
        if curPos>=left and curPos +20 <= right:
            exptResults[curPos]=[curExpt['strand'][k]];  # Initialize a list with strand
            exptResults[curPos].append(curExpt['replicate1'][k])
            exptResults[curPos].append(curExpt['replicate2'][k])
            exptResults[curPos].append(curExpt['replicate3'][k])
    ret['exptResults']=exptResults
    ret['all_sd']=sd_all_aerobic;
    assert len(ret['exptNames']) == len(ret['exptColors'])  # hopefully EXPT_RESULTS also have same length at each position
    return ret

def getExptResultsFromAnaerobic (left, right):
    """
    Returns dict with keys of exptNames, exptColors, and exptResults
    exptResults is a dictionary of arrays. exptResults[Pos] represents results at nucleotide Pos
    exptResults[pos] contains an array of results
    exptDescriptions[j] is a text description for the results at exptResults[anyPos][j]
    exptColors[j] is the color used to render all results corresponding to  exptResults[anyPos][j]

    @param left:
    @param right:
    @return:
    """
    ret={}

    exptResults={}
    ret['exptNames']=['Anaerobic 1', 'Anaerobic 2','Anaerobic 3']
    ret['exptColors']=['black','black','black']
    curExpt=allData['anaerobic']
    for k in range(len(curExpt['pos'])):
        curPos = curExpt['pos'][k]
        if curPos>=left and curPos +20 <= right:
            exptResults[curPos]=[curExpt['strand'][k]];  # Initialize a list with strand
            exptResults[curPos].append(curExpt['replicate1'][k])
            exptResults[curPos].append(curExpt['replicate2'][k])
            exptResults[curPos].append(curExpt['replicate3'][k])
    ret['exptResults']=exptResults
    ret['all_sd']=sd_all_anaerobic;
    assert len(ret['exptNames']) == len(ret['exptColors'])  # hopefully EXPT_RESULTS also have same length at each position
    return ret

def getGenes(left, right):
    """Get all the genes between left and right coordinates

    @param genes:
    @param left [Int]:
    @param right [Int]:
    """
    ret=[]
    for  (geneID,name, strand, left_boundary, right_boundary) in genes:
        if left_boundary+10<=right and right_boundary-10>=left:  # don't draw genes if only <10 bases will be rendered
            if strand=='forward':
                strandFormatted = '+'
            else:
                strandFormatted='-'
            ret.append((name,strandFormatted,left_boundary,right_boundary-left_boundary))
    return ret

def getPromoters(left, right):
    ret=[]
    for (id, name, strand, TSS, seq, left_boundary, right_boundary) in promoters:
        if left_boundary+1<=right and right_boundary-1>=left:
            if strand=='forward':
                strandFormatted = '+'
            else:
                strandFormatted='-'
            ret.append((name,strandFormatted,left_boundary,right_boundary-left_boundary))
    return ret

def getTFBS(left,right):
    ret=[]
    for (id, name,left_boundary, right_boundary) in TFBS:
        if left_boundary>=left and right_boundary<=right:
            ret.append((name,left_boundary,right_boundary-left_boundary))
    return ret

def getsRNA (left, right):
    ret=[]
    for (id,name, strand, left_boundary, right_boundary) in sRNA:
        if left_boundary>=left and right_boundary<=right:
            if strand=='forward':
                strandFormatted = '+'
            else:
                strandFormatted='-'
            ret.append((name,strandFormatted,left_boundary,right_boundary-left_boundary))
    return ret

@app.route('/scrollbar')
def sampleScroll():
    return render_template('JQRangeSliderdemo.html')


@app.route('/_add_numbers')
def add_numbers():
    """Add two numbers server side, ridiculous but well..."""
    a = request.args.get('a', 0, type=int)
    b = request.args.get('b', 0, type=int)
    return jsonify(result=a + b)

@app.route('/aerobicOnly')
def showAerobicOnly():
    """
    Tells javascript to call getFeaturesAerobic
    @return:
    """
    return render_template('simple.html',ajaxFunction='getFeaturesAerobic',time=end-start)

@app.route('/anaerobicOnly')
def showAnaerobicOnly():
    """
    Tells javascript to call getFeaturesAerobic
    @return:
    """
    return render_template('simple.html',ajaxFunction='getFeaturesAnaerobic',time=end-start)

@app.route('/')
def index():
    return showAerobicOnly()

start=time.clock()
genes=cPickle.load(open('genes_pickled.txt','rb'))
promoters=cPickle.load(open('promoters_pickled.txt','rb'))
TFBS=cPickle.load(open('TFBS_pickled.txt','rb'))
sRNA=cPickle.load(open('sRNA_pickled.txt','rb'))

def loadExptData (fileName):
    #sgRNA_pos,seq,sgRNA_strand,aerobic_t8_1_LR,aerobic_t8_2_LR,aerobic_t8_3_LR
    data=pandas.io.parsers.read_csv(fileName)
    return {'pos':data['sgRNA_pos'].values.tolist(),'strand':data['sgRNA_strand'].values.tolist(),
            'replicate1':data[[-3]].values.tolist(),'replicate2':data[[-2]].values.tolist(),'replicate3':data[[-1]].values.tolist()}

allData={'aerobic':loadExptData('Aerobic.csv'),'anaerobic':loadExptData('Anaerobic - filtered over 60.csv')}
sd_all_aerobic=numpy.std(numpy.array(
    allData['aerobic']['replicate1']+ allData['aerobic']['replicate2']+ allData['aerobic']['replicate3']));
sd_all_anaerobic=numpy.std(numpy.array(
    allData['anaerobic']['replicate1']+ allData['anaerobic']['replicate2']+ allData['anaerobic']['replicate3']))
# print "SD's over all aerobic data is "+str(sd_all_aerobic)
# print "SD's over all anaerobic data is "+str(sd_all_anaerobic)

end=time.clock()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Development Server Help')
    parser.add_argument("-d", "--debug", action="store_true", dest="debug_mode",
                  help="run in debug mode (for use with PyCharm)", default=False)
    parser.add_argument("-p", "--port", dest="port",
                  help="port of server (default:%(default)s)", type=int, default=5000)

    cmd_args = parser.parse_args()
    app_options = {"port": cmd_args.port }

    extra_dirs = ['./static/src',]
    extra_files = extra_dirs[:]
    for extra_dir in extra_dirs:
        for dirname, dirs, files in os.walk(extra_dir):
            for filename in files:
                filename = os.path.join(dirname, filename)
                if os.path.isfile(filename):
                    extra_files.append(filename)

    if cmd_args.debug_mode:
        app_options["debug"] = True
        app_options["use_debugger"] = False
        app_options["use_reloader"] = False
    else:
        print "Running with autoreload"
        app.debug=True
        app_options["debug"] = True
        app_options["use_debugger"] = True
        app_options["use_reloader"] = True

    app.run(extra_files=extra_files)
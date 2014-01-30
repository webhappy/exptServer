from flask import Flask, url_for, render_template, request, jsonify,json
import os
import cPickle,time
import csv
from Bio import SeqIO
from Bio.Seq import Seq

app = Flask(__name__)

@app.route('/getFeatures')
def featurePage():
    left = request.args.get('left', 0, type=int)
    right = request.args.get('right', 0, type=int)
    return json.dumps([getGenes(left,right),getPromoters(left,right),getTFBS(left,right),getExptResults(left,right),getsRNA(left,right)])

def getExptResults (left, right):
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
    ret['exptNames']=['Aerobic 1', 'Aerobic 2']
    ret['exptColors']=['blue','blue']
    for k in range(len(EXPT_POSITIONS)):
        if EXPT_POSITIONS[k]>=left and EXPT_POSITIONS[k]+20 <= right:
            exptResults[EXPT_POSITIONS[k]]=[EXPT_STRAND[k]];  # Add expt results to this list
            for expts in EXPT_RESULTS.itervalues():
                exptResults[EXPT_POSITIONS[k]].append(expts[k])
    ret['exptResults']=exptResults
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
        if left_boundary>=left and right_boundary<=right:
            if strand=='forward':
                strandFormatted = '+'
            else:
                strandFormatted='-'
            ret.append((name,strandFormatted,left_boundary,right_boundary-left_boundary))
    return ret

def getPromoters(left, right):
    ret=[]
    for (id, name, strand, TSS, seq, left_boundary, right_boundary) in promoters:
        if left_boundary>=left and right_boundary<=right:
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


@app.route('/')
def hello_world():
    return render_template('simple.html',time=end-start)


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

    start=time.clock()
    genes=cPickle.load(open('genes_pickled.txt','rb'))
    promoters=cPickle.load(open('promoters_pickled.txt','rb'))
    TFBS=cPickle.load(open('TFBS_pickled.txt','rb'))
    sRNA=cPickle.load(open('sRNA_pickled.txt','rb'))

    (EXPT_RESULTS,EXPT_POSITIONS,EXPT_STRAND)=cPickle.load(open('expt_results.txt','rb'))

    end=time.clock()
    app.run(extra_files=extra_files)
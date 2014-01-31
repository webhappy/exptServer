from flask import Flask, url_for, render_template, request, jsonify,json
import os
import cPickle,time
import csv

app = Flask(__name__)

@app.route('/getFeatures')
def featurePage():
    left = request.args.get('left', 0, type=int)
    right = request.args.get('right', 0, type=int)
    return json.dumps([getGenes(left,right),getPromoters(left,right),getTFBS(left,right),getExptResults(left,right),getsRNA(left,right)])

@app.route('/getGeneCoords')
def getGeneCoords():
    gene=request.args.get('gene')
    for  (geneID,name, strand, left_boundary, right_boundary) in genes:
        if name.lower() == gene.lower():
            return json.dumps([left_boundary,right_boundary])
    return json.dumps([-1,-1])  # Did not find this gene, return [-1,-1] as error code

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
    ret['exptNames']=['Aerobic 1', 'Aerobic 2','Aerobic 3']
    ret['exptColors']=['orange','blue','blue']
    curExpt=aerobicExptData
    for k in range(len(curExpt['pos'])):
        curPos = curExpt['pos'][k]
        if curPos>=left and curPos +20 <= right:
            exptResults[curPos]=[curExpt['strand'][k]];  # Initialize a list with strand
            exptResults[curPos].append(curExpt['replicate1'][k])
            exptResults[curPos].append(curExpt['replicate2'][k])
            exptResults[curPos].append(curExpt['replicate3'][k])
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

    #(EXPT_RESULTS,EXPT_POSITIONS,EXPT_STRAND)=cPickle.load(open('expt_results.txt','rb'))
    aerobicFile=csv.reader(open('aerobic.csv','rb'))
    header=aerobicFile.next()
    #sgRNA_pos,seq,sgRNA_strand,t8_1_LR,t8_2_LR,t8_3_LR
    aerobicExptData={'pos':[],'strand':[],'replicate1':[],'replicate2':[],'replicate3':[]}
    for row in aerobicFile:
        aerobicExptData['pos'].append(int(row[0]))
        aerobicExptData['strand'].append(row[2])
        aerobicExptData['replicate1'].append(float(row[3]))
        aerobicExptData['replicate2'].append(float(row[4]))
        aerobicExptData['replicate3'].append(float(row[5]))

    anaerobicFile=csv.reader(open('anaerobic.csv','rb'))
    header=anaerobicFile.next()
    #sgRNA_pos,seq,sgRNA_strand,t8_1_LR,t8_2_LR,t8_3_LR
    anaerobicExptData={'pos':[],'strand':[],'replicate1':[],'replicate2':[],'replicate3':[]}
    for row in anaerobicFile:
        anaerobicExptData['pos'].append(int(row[0]))
        anaerobicExptData['strand'].append(row[2])
        anaerobicExptData['replicate1'].append(float(row[3]))
        anaerobicExptData['replicate2'].append(float(row[4]))
        anaerobicExptData['replicate3'].append(float(row[5]))

    end=time.clock()
    app.run(extra_files=extra_files)
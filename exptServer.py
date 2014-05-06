from flask import Flask, url_for, render_template, request, jsonify,json
import os
import cPickle,time
import csv
import numpy
import pandas

app = Flask(__name__)


start=time.clock()
genes=cPickle.load(open('genes_pickled.txt','rb'))
promoters=cPickle.load(open('promoters_pickled.txt','rb'))
TFBS=cPickle.load(open('TFBS_pickled.txt','rb'))
sRNA=cPickle.load(open('sRNA_pickled.txt','rb'))
sgRNA_locations = {}  #  Map sgRNA 20-mer (lowercase string) to integer representing left coordinate to zoom to

def loadExptData (fileName):
    #"Seq","Pos","Strand","Pval","LogFC","message"
    data=pandas.io.parsers.read_csv(fileName)
    return {'seq':data['Seq'].values.tolist(),'pos':data['Pos'].values.tolist(),'strand':data['Strand'].values.tolist(),
            'pval':data['Pval'].values.tolist(),'logFC':data['LogFC'].values.tolist(),'message':data['message'].values.tolist(),}

allData={'anaerobic':loadExptData('anaerobic_0314.csv'),'aerobic (2 and 3)':loadExptData('aerobic_2and3.csv')}
defaultExpt = 'anaerobic'
for k,v in allData.iteritems():
    tempArray = numpy.array(allData[k]['logFC'])
    v['sd'] = numpy.std(tempArray)
    v['min'] = numpy.min(tempArray)
    v['max'] = numpy.max(tempArray)

for seq,pos in zip(allData['anaerobic']['seq'], allData['anaerobic']['pos']):
    sgRNA_locations[seq.lower()] = pos

end=time.clock()  # Done loading all files

@app.route('/getFeatures')
def getFeatures():
    left = request.args.get('left', 0, type=int)
    right = request.args.get('right', 0, type=int)
    expt = request.args.get('expt')
    return json.dumps([getGenes(left,right),getPromoters(left,right),getTFBS(left,right),getExptResults(left,right,expt),getsRNA(left,right)])

@app.route('/getGeneCoords')
def getGeneCoords():
    gene=request.args.get('gene')
    for  (geneID,name, strand, left_boundary, right_boundary) in genes:
        if name.lower() == gene.lower():
            return json.dumps([left_boundary,right_boundary])
    return json.dumps([-1,-1])  # Did not find this gene, return [-1,-1] as error code

@app.route('/getSgRNACoords')
def getSgRNACoords():
    sgRNA=request.args.get('sgRNA')
    if sgRNA not in sgRNA_locations:
        return json.dumps([-1,-1])  # return [-1,-1] as error code
    left_coord = sgRNA_locations[sgRNA.lower()]
    return json.dumps([left_coord, left_coord+20])

def getExptResults(left, right,exptSet):
    ret={}

    exptResults=[]
    curExpt=allData[exptSet]
    for k in range(len(curExpt['pos'])):
        curPos = curExpt['pos'][k]
        if curPos>=left and curPos +20 <= right:
            exptResults.append({'pos':curPos,'seq':curExpt['seq'][k],'strand':curExpt['strand'][k],
                                 'logFC':curExpt['logFC'][k],
                                 'pval':curExpt['pval'][k],'message':curExpt['message'][k]});
    ret['exptResults']=exptResults
    ret['all_sd']=curExpt['sd']
    ret['max'] = curExpt['max']
    ret['min'] = curExpt['min']
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

@app.route('/')
def index():
    return render_template('simple.html',allData=allData,defaultExpt=defaultExpt,ajaxFunction='',time=end-start)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Development Server Help')
    parser.add_argument("-d", "--debug", action="store_true", dest="debug_mode",
                  help="run in debug mode (for use with PyCharm)", default=False)
    parser.add_argument("-p", "--port", dest="port",
                  help="port of server (default:%(default)s)", type=int, default=5000)

    cmd_args = parser.parse_args()
    app_options = {"port": cmd_args.port }

    # extra_dirs = ['./static/src',]
    # extra_files = extra_dirs[:]
    # for extra_dir in extra_dirs:
    #     for dirname, dirs, files in os.walk(extra_dir):
    #         for filename in files:
    #             filename = os.path.join(dirname, filename)
    #             if os.path.isfile(filename):
    #                 extra_files.append(filename)

    if cmd_args.debug_mode:
        app_options["debug"] = True
        app_options["use_debugger"] = False
        app_options["use_reloader"] = False
        app.debug=True
    else:
        print "Running with autoreload"
        app.debug=True
        app_options["debug"] = True
        app_options["use_debugger"] = True
        app_options["use_reloader"] = True

    app.run()
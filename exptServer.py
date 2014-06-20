from flask import Flask, url_for, render_template, request, jsonify,json
import os
import cPickle,time
import csv
import numpy
import pandas
import sqlite3

app = Flask(__name__)

start=time.clock()
genes=cPickle.load(open('regulondb/genes_pickled.txt','rb'))
promoters=cPickle.load(open('regulondb/promoters_pickled.txt','rb'))
TFBS=cPickle.load(open('regulondb/TFBS_pickled.txt','rb'))
sRNA=cPickle.load(open('regulondb/sRNA_pickled.txt','rb'))
sgRNA_locations = {}  #  Map sgRNA 20-mer (lowercase string) to integer representing left coordinate to zoom to
sgRNA_strand = {}  # Map sgRNA 20-mer to +/-
#cnx = mysql.connector.connect(user='davidc', password='mysql_password', host='127.0.0.1',  database='CRISPR')
#cnx = mysql.connector.connect(user='awsuser', password='mysql_password', host='mydb.c9w9as83ocgz.us-west-2.rds.amazonaws.com',  database='CRISPR')
cnx = sqlite3.connect('local.db')

defaultExpt = 'aerobic (replicates 2 and 3)'

allExpts = {}  # Map name to ID for each set of tickers that can be selected
cursor = cnx.cursor()
cursor.execute('select comparisonID, description FROM comparisons where ready=1')
for comparisonID, desc in cursor:
    allExpts[desc] = comparisonID
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
    sgRNA=request.args.get('sgRNA').lower()
    if sgRNA not in sgRNA_locations:
        return json.dumps([-1,-1])  # return [-1,-1] as error code
    left_coord = sgRNA_locations[sgRNA]
    return json.dumps([left_coord, left_coord+20])

def getExptResults(left, right,exptSet):
    ret={}

    exptResults=[]
    cnx = sqlite3.connect('local.db')
    cursor = cnx.cursor()
    cursor.execute('select pos, seq, strand, val, alpha, message FROM tickers LEFT JOIN sgRNAs ON sgRNA_id=sgRNAs.id'
                   ' where pos > ? and pos+20 < ? and comparison_id=?', (left, right, exptSet))
    for (pos,seq, strand, val, alpha, message ) in cursor:
        exptResults.append({'pos':pos,'seq':seq,'strand':strand,'logFC':val,'alpha':alpha,'message':message})
    cursor.execute('select minY, maxY, stdY FROM comparisons where comparisonID=?',exptSet)
    (ret['min'], ret['max'], ret['all_sd']) = cursor.fetchone()
    ret['exptResults']=exptResults
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
    return render_template('simple.html',allExpts=allExpts,defaultExpt=defaultExpt,ajaxFunction='',time=end-start)

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
        print "In debug mode"
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
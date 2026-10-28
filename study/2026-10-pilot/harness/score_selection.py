"""Score selection runs: first skill invoked (or none). Usage: score_selection.py <rundir> <SELECTION.json>"""
import json, glob, os, re, sys, csv, collections
R,SJ=sys.argv[1],sys.argv[2]; q=json.load(open(SJ))["queries"]; flat=[(k,x) for k in q for x in q[k]]
w=csv.writer(sys.stdout); w.writerow(["variant","query","run","expected","picked","correct","empty"])
for f in sorted(glob.glob(os.path.join(R,"*.jsonl"))):
    m=re.match(r"(\w+)-q(\d+)-r(\d+)\.jsonl",os.path.basename(f)); v,qi,r=m.group(1),int(m.group(2)),m.group(3)
    picked="none"; lines=0
    for l in open(f):
        lines+=1
        try: d=json.loads(l)
        except: continue
        if d.get("type")=="assistant" and picked=="none":
            for b in d["message"]["content"]:
                if b["type"]=="tool_use" and b["name"]=="Skill":
                    picked=b["input"].get("skill","?"); break
    exp=flat[qi][0]; exp_s="none" if exp=="NONE" else exp
    w.writerow([v,qi,r,exp_s,picked,int(picked==exp_s),int(lines==0)])

import json, sys
IDX="urc_index.json"; CRD="urc_cards.json"
SRC_EN="UP Revenue Code 2006"; SRC_HI="उत्तर प्रदेश राजस्व संहिता, 2006"; DEPT="राजस्व विभाग"
def load(f):
    return json.load(open(f, encoding="utf-8"))
def dump(o,f):
    json.dump(o,f if False else open(f,"w",encoding="utf-8"),ensure_ascii=False,indent=1)
def run(chap_no, chap_name, entries):
    # entries: list of (n, topic, body, tags[, summary, key_provisions])
    idx=load(IDX); crd=load(CRD)
    iid={e["id"] for e in idx}; cid={e["id"] for e in crd}
    added=0
    for ent in entries:
        n=ent[0]; topic=ent[1]; body=ent[2]; tags=ent[3]
        summary=ent[4] if len(ent)>4 and ent[4] else None
        kp=ent[5] if len(ent)>5 and ent[5] else None
        chap_label=f"अध्याय {chap_no} · धारा {n}"
        content=f"# अध्याय {chap_no} — {chap_name} : {topic}\n\n**धारा {n} — {topic}**\n\n{body}"
        sid=str(n); cidn=f"urc_sec_{n}"
        if sid not in iid:
            idx.append({"id":sid,"chapter":chap_label,"topic":topic,
                        "filename":f"sec_{n}","content":content,"type":"chapter","source":SRC_EN})
            iid.add(sid); added+=1
        if cidn not in cid:
            if summary is None:
                summary=body.split("\n")[0][:380]
            if kp is None:
                kp=[p.strip() for p in body.split("\n") if p.strip()][:6]
            crd.append({"id":cidn,"department":DEPT,"source":SRC_HI,"type":"rule",
                        "title":f"{SRC_HI} — धारा {n}: {topic}","summary":summary,
                        "key_provisions":kp,"applicable_to":["उत्तर प्रदेश राजस्व प्रशासन"],
                        "tags":tags})
            cid.add(cidn)
    # sort numerically where possible
    def keyf(e):
        x=e["id"].replace("urc_sec_","").replace("sec_","")
        try: return (0,int(x),"")
        except: return (1,0,x)
    idx.sort(key=keyf); crd.sort(key=keyf)
    dump(idx,IDX); dump(crd,CRD)
    print(f"added {added} new index entries | index={len(idx)} cards={len(crd)}")

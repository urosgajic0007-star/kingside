import{u as useStore,r as R,j as J,n as nav,Z as Game,g as getEngine,ad as botMove,A as Avatar,I as Icon,c as Toggle,a0 as MoveList,o as Board,Y as describe,C as CLS,aa as saveGame,W as bumpGoal,l as loadOpenings,i as openingOf,b as START}from"./index-B9e_oxux.js";
import{s as S}from"./sound-BYTvWvUz.js";

/* ───────────── GiGi – trener ───────────── */

const h=(t,p,...c)=>J.jsx(t,{...(p||{}),children:c.length===0?void 0:c.length===1?c[0]:c});
const LS_KEY="ks-gigi-v1";
const DEPTH=15,MOVETIME=1300;
const VAL={pawn:1,knight:3,bishop:3,rook:5,queen:9,king:0};
const PIECE_ACC={pawn:"kmeta",knight:"skakača",bishop:"lovca",rook:"trdnjavo",queen:"damo",king:"kralja"};
const LABEL={brilliant:"Briljantno!!",great:"Odlična poteza!",best:"Najboljša poteza",excellent:"Odlično",good:"Dobra poteza",book:"Teorija",forced:"Edina poteza",inaccuracy:"Netočnost",mistake:"Napaka",miss:"Zgrešena priložnost",blunder:"Huda napaka"};
const PRESETS=[400,800,1200,1600,2000,2500];

/* Alien Gambit – linije (uci kot v chessops) */
const AG_BASE="e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 g8f6 e4g5 h7h6 g5f7 e8f7 g1f3";
const AG_LINES=[
  AG_BASE+" c8g4 f3e5 f7e8 e5g4 f6g4 d1g4",
  AG_BASE+" c8g4 f3e5 f7g8 e5g4 f6g4 d1g4",
  AG_BASE+" c8g4 f3e5 f7e6 e5g4 f6g4 d1g4",
  AG_BASE+" c8f5 f3e5 f7g8 g2g4 f5e4 f2f3",
  AG_BASE+" e7e6 f1d3 c6c5 e1h1",
  "e2e4 c7c6 d2d4 d7d5 b1d2 d5e4 d2e4 g8f6 e4g5 h7h6 g5f7 e8f7 g1f3 c8g4 f3e5 f7e8 e5g4 f6g4 d1g4",
].map(l=>l.split(" "));
const AG_ANTI=["e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6".split(" ")];
const AG_NOTES={
  4:"3.Nc3 – beli razvija skakača in brani e4. (Gre tudi 3.Nd2.)",
  7:"4.Nxe4 – zdaj čakamo na 4...Nf6. Takrat pride Alien trik!",
  8:"4...Nf6 – črni ponuja menjavo skakačev. To je trenutek za Alien Gambit!",
  9:"5.Ng5!? – skakač gre proti f7. Grozi 6.Nxf7.",
  10:"5...h6 – črni napade skakača. Namesto umika beli žrtvuje!",
  11:"6.Nxf7!! – to je ALIEN GAMBIT. Skakač vzame f7 in napada damo d8 ter trdnjavo h8 (vilice), zato mora črni vzeti.",
  12:"6...Kxf7 – črni kralj je zdaj izpostavljen in ne more rokirati. Beli ima skakača manj, a napad.",
  13:"7.Nf3 – pripelje novega skakača, ki pride na e5 s šahom.",
};
function agNote(ply,ucis){
  if(ply<=13)return AG_NOTES[ply]||null;
  const u=ucis[ply-1],b7=ucis[13];
  if(ply===14)return{c8g4:"7...Bg4 – lovec veže skakača. Odgovor: 8.Ne5+! (šah in napad na lovca).",c8f5:"7...Bf5 – odgovor je 8.Ne5+ in nato g4, da lovca preženeš.",e7e6:"7...e6 – igraj 8.Bd3, nato O-O, Re1 in Ne5+."}[u]||null;
  if(ply===15)return{f3e5:"8.Ne5+ – šah! Kralj se mora umakniti.",f1d3:"8.Bd3 – razvoj in pritisk po diagonali proti g6."}[u]||null;
  if(ply===16)return b7==="c8g4"?"Kralj se umakne. Zdaj 9.Nxg4 vrne material.":b7==="c8f5"?"Kralj se umakne. Zdaj 9.g4! prežene lovca.":null;
  if(ply===17)return{e5g4:"9.Nxg4 – beli vrača material. Po 9...Nxg4 10.Qxg4 je beli bolje.",g2g4:"9.g4 – lovec mora spet bežati, beli dobi prostor in čas za napad."}[u]||null;
  return null;
}
const AG_ANTIDOTE="Antidot za črnega: 4...Bf5! (namesto 4...Nf6). Po 5.Ng3 Bg6 lovec brani f7 in Alien trik ne deluje.";

/* ───────────── pomožne funkcije ───────────── */
function wp(line){ // verjetnost zmage belega 0..100
  if(!line)return 50;
  if(line.mate!=null)return line.mate>0?100:line.mate<0?0:50;
  const c=Math.max(-1500,Math.min(1500,line.cp));
  return 50+50*(2/(1+Math.exp(-0.00368208*c))-1);
}
const forSide=(w,color)=>color==="white"?w:100-w;
function fmtEval(line,color){
  if(!line)return"0.0";
  if(line.mate!=null){const m=color==="white"?line.mate:-line.mate;return(m>0?"+M":"−M")+Math.abs(m);}
  const v=(color==="white"?line.cp:-line.cp)/100;
  return(v>0?"+":v<0?"−":"")+Math.abs(v).toFixed(1);
}
function material(pos,color){
  let s=0;
  for(const[,p]of pos.board)s+=(p.color===color?1:-1)*(VAL[p.role]||0);
  return s;
}
/* PV -> poteze (SAN) z uporabo razreda Game (pravilno normalizira rokado) */
function pvToLine(fen,pv,max){
  const g=new Game(fen);
  const items=[];
  for(const u of(pv||[]).slice(0,max)){const m=g.play(u);if(!m)break;items.push(m);}
  return{items,fens:g.fens,game:g,text:lineText(g.positions[0],items)};
}
function lineText(pos0,items){
  let n=pos0.fullmoves,white=pos0.turn==="white",out="";
  items.forEach((m,i)=>{
    if(white)out+=n+". ";else if(i===0)out+=n+"... ";
    out+=m.san+" ";
    if(!white)n++;
    white=!white;
  });
  return out.trim();
}
function tagSentence(pos,mv){
  if(!mv)return"";
  const d=describe(pos,mv.uci);
  const t=d.tags||[],san=mv.san,parts=[];
  if(t.includes("mate"))return san+" je mat!";
  if(t.includes("hanging"))parts.push(`vzame nebranjenega ${PIECE_ACC[mv.captured]||"figuro"}`);
  else if(t.includes("winsMaterial"))parts.push(`pridobi material (vzame ${PIECE_ACC[mv.captured]})`);
  else if(mv.captured)parts.push(`vzame ${PIECE_ACC[mv.captured]}`);
  if(t.includes("fork"))parts.push("naredi vilice (napade dve figuri hkrati)");
  if(t.includes("pin"))parts.push("veže figuro (ta se ne sme premakniti)");
  if(t.includes("skewer"))parts.push("naredi ražnjič (napad skozi figuro)");
  if(t.includes("discoveredCheck"))parts.push("da odkriti šah");
  else if(t.includes("discoveredAttack"))parts.push("naredi odkriti napad");
  if(t.includes("promotion"))parts.push("promovira kmeta");
  if(t.includes("check")&&!t.includes("discoveredCheck"))parts.push("da šah");
  return parts.length?`${san} ${parts.join(", ")}.`:"";
}
function pointsTxt(n){
  n=Math.round(Math.abs(n));
  if(n>=9)return"približno damo";
  if(n>=5)return"približno trdnjavo";
  if(n>=3)return"figuro (≈"+n+" točke)";
  return n===1?"kmeta":"dva kmeta";
}
function classify(loss,isBest){
  return isBest||loss<=1?"best":loss<=2.5?"excellent":loss<=5?"good":loss<=10?"inaccuracy":loss<=20?"mistake":"blunder";
}
const TACTIC_TAGS=["fork","pin","skewer","discoveredAttack","discoveredCheck"];
const CATS={
  napake:{title:"Napake in hude napake",icon:"x",desc:"Poteze, ki so ti pokvarile pozicijo."},
  zgreseno:{title:"Zgrešene priložnosti",icon:"target",desc:"Trenutki, ko si lahko dobil material ali napad."},
  taktika:{title:"Taktični motivi (vilice, vezave, ražnjiči)",icon:"zap",desc:"Vilice, vezave, ražnjiči in odkriti napadi."},
  visece:{title:"Viseče figure",icon:"eye",desc:"Figure, ki so ostale nebranjene."},
  mat:{title:"Matne grožnje",icon:"flag",desc:"Pozicije, kjer je bil mat blizu."},
  otvoritve:{title:"Otvoritve in gambiti",icon:"book",desc:"Gambiti in otvoritvene ideje iz partije."},
};
function loadSaved(){try{const s=JSON.parse(localStorage.getItem(LS_KEY)||"null");return s&&s.v===1?s:null}catch{return null}}
function store(s){try{s?localStorage.setItem(LS_KEY,JSON.stringify(s)):localStorage.removeItem(LS_KEY)}catch{}}
function prefs(){try{return JSON.parse(localStorage.getItem(LS_KEY+"-prefs")||"{}")}catch{return{}}}
function savePrefs(p){try{localStorage.setItem(LS_KEY+"-prefs",JSON.stringify(p))}catch{}}

function gigiBot(elo){
  return{id:"gigi",name:"GiGi",elo,style:"universal",hue:300,glyph:"queen",tier:"Trener",
    book:["Caro-Kann Defense","Italian Game","Queen's Gambit Declined","Sicilian Defense"],
    quotes:{greet:"Živjo! Jaz sem GiGi.",win:"Bila je dobra borba!",lose:"Bravo, zmagal si!",draw:"Remi – lepa partija."}};
}

/* ───────────── CSS ───────────── */
const CSS=`
.gg-hero{display:flex;gap:14px;align-items:center}
.gg-hero h2{margin:0;font-family:var(--font-display)}
.gg-elo{font-size:2rem;font-weight:800;font-family:var(--font-display);color:var(--accent)}
.gg-range{width:100%;accent-color:var(--accent)}
.gg-chips{display:flex;flex-wrap:wrap;gap:6px}
.gg-chip{border:1px solid var(--line);background:var(--bg3);color:var(--text);border-radius:999px;padding:6px 12px;font-weight:600;cursor:pointer;font:inherit;font-size:.85rem}
.gg-chip.on{background:var(--accent);color:var(--accent-ink,#1b1f27);border-color:var(--accent)}
.gg-coach{border-left:4px solid var(--accent)}
.gg-coach.warn{border-left-color:var(--bad)}
.gg-coach.ok{border-left-color:var(--good)}
.gg-coach.tip{border-left-color:var(--info,#5b8bd9)}
.gg-head{display:flex;gap:10px;align-items:center;margin-bottom:6px}
.gg-tag{display:inline-block;padding:2px 8px;border-radius:6px;font-weight:700;font-size:.8rem;color:#fff}
.gg-line{background:var(--bg3);border-radius:10px;padding:8px 10px;margin-top:8px;font-size:.88rem}
.gg-line b{display:block;margin-bottom:3px;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
.gg-line .mono{font-family:ui-monospace,Menlo,monospace;font-size:.86rem;line-height:1.5}
.gg-line.bad{border-left:3px solid var(--bad)}
.gg-line.good{border-left:3px solid var(--good)}
.gg-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.gg-events{display:flex;flex-direction:column;gap:4px;max-height:180px;overflow:auto;font-size:.82rem}
.gg-ev{display:flex;gap:6px;align-items:baseline}
.gg-ev .dot{width:8px;height:8px;border-radius:50%;flex:none;transform:translateY(-1px)}
.gg-cat{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);color:var(--text);cursor:pointer;font:inherit}
.gg-cat:hover{border-color:var(--accent)}
.gg-cat .n{margin-left:auto;font-weight:800;color:var(--accent)}
.gg-ex{display:grid;grid-template-columns:minmax(0,240px) 1fr;gap:14px;align-items:start;padding:12px;border:1px solid var(--line);border-radius:12px}
.gg-mini{width:100%;max-width:240px}
.gg-preview{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.gg-banner{background:color-mix(in srgb,var(--accent) 16%,transparent);border-radius:10px;padding:8px 10px;font-size:.85rem;font-weight:600}
@media (max-width:640px){.gg-ex{grid-template-columns:1fr}.gg-mini{max-width:100%}}
`;
function useCss(){R.useEffect(()=>{if(document.getElementById("gg-css"))return;const s=document.createElement("style");s.id="gg-css";s.textContent=CSS;document.head.appendChild(s)},[])}

/* ───────────── glavna stran ───────────── */
export default function GiGiPage(){
  useCss();
  const[saved]=R.useState(loadSaved);
  const[cfg,setCfg]=R.useState(saved?.cfg||null);
  return cfg?h(GiGiGame,{key:cfg.id,cfg,saved:saved&&saved.cfg.id===cfg.id?saved:null,onExit:()=>{store(null);setCfg(null)},onNew:c=>{store(null);setCfg(c)}})
            :h(Setup,{onStart:setCfg});
}

function Setup({onStart}){
  const p=prefs();
  const profile=useStore("profile");
  const[elo,setElo]=R.useState(p.elo||Math.round((profile?.rating||1200)/50)*50);
  const[color,setColor]=R.useState(p.color||"white");
  const[mode,setMode]=R.useState(p.mode||"free");
  const[pause,setPause]=R.useState(p.pause!==false);
  const[inacc,setInacc]=R.useState(p.inacc!==false);
  const start=()=>{
    savePrefs({elo,color,mode,pause,inacc});
    const c=color==="random"?(Math.random()<.5?"white":"black"):color;
    onStart({id:"g"+Date.now().toString(36),elo,color:c,mode,pause,inacc,startedAt:Date.now()});
  };
  const bot=gigiBot(elo);
  return h("div",{className:"col",style:{display:"flex",flexDirection:"column",gap:14,maxWidth:760}},
    h("div",{className:"card"},
      h("div",{className:"gg-hero"},
        h(Avatar,{bot,size:64}),
        h("div",null,
          h("h2",null,"GiGi – tvoj šahovski trener"),
          h("div",{className:"muted small"},"Igraj proti GiGi na izbrani moči. Opozori te na napake, pokaže boljšo potezo in nekaj potez naprej pokaže, kaj bi se zgodilo. Med igro beleži dogodke (gambite, vilice, viseče figure …) in te po igri vpraša, kaj bi se rad naučil.")
        )
      )
    ),
    h("div",{className:"card"},
      h("div",{className:"row spread"},h("b",null,"Moč GiGi (Elo)"),h("span",{className:"gg-elo"},elo)),
      h("input",{type:"range",className:"gg-range",min:100,max:3200,step:50,value:elo,onChange:e=>setElo(+e.target.value),"aria-label":"Elo"}),
      h("div",{className:"gg-chips mt"},PRESETS.map(v=>J.jsx("button",{className:"gg-chip"+(elo===v?" on":""),onClick:()=>setElo(v),children:v},v)))
    ),
    h("div",{className:"card"},
      h("b",null,"Igram z"),
      h("div",{className:"gg-chips mt"},[["white","Belimi"],["black","Črnimi"],["random","Naključno"]].map(([k,l])=>J.jsx("button",{className:"gg-chip"+(color===k?" on":""),onClick:()=>setColor(k),children:l},k))),
      h("b",{style:{display:"block",marginTop:14}},"Način"),
      h("div",{className:"gg-chips mt"},[["free","Prosta igra"],["alien","Trening: Alien Gambit"]].map(([k,l])=>J.jsx("button",{className:"gg-chip"+(mode===k?" on":""),onClick:()=>setMode(k),children:l},k))),
      mode==="alien"&&h("div",{className:"gg-line mt"},
        h("b",null,"Alien Gambit (Caro-Kann)"),
        h("div",{className:"mono"},"1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Ng5 h6 6. Nxf7!? Kxf7 7. Nf3"),
        h("div",{className:"small mt"},color==="black"?"GiGi bo z belimi igral Alien Gambit, ti pa se naučiš, kako se braniti. "+AG_ANTIDOTE:"Ti igraš z belimi Alien Gambit, GiGi pa z linijami Caro-Kanna. GiGi ti sproti razlaga ideje in te opozori, če zapustiš teorijo.")
      )
    ),
    h("div",{className:"card col",style:{display:"flex",flexDirection:"column",gap:8}},
      h(Toggle,{checked:pause,onChange:setPause,label:"Ustavi igro pri napaki (da lahko vzameš potezo nazaj)"}),
      h(Toggle,{checked:inacc,onChange:setInacc,label:"Opozori tudi na netočnosti"})
    ),
    h("button",{className:"btn primary",style:{fontSize:"1.05rem",padding:"12px 18px"},onClick:start},h(Icon,{name:"play"})," Igraj z GiGi")
  );
}

/* ───────────── igra ───────────── */
function GiGiGame({cfg,saved,onExit,onNew}){
  const profile=useStore("profile");
  const bot=R.useMemo(()=>gigiBot(cfg.elo),[cfg.elo]);
  const userColor=cfg.color,gigiColor=userColor==="white"?"black":"white";
  const gref=R.useRef(null);
  if(!gref.current){const g=new Game(START);for(const u of saved?.moves||[])g.play(u);gref.current=g;}
  const game=gref.current;
  const[tick,setTick]=R.useState(0);const bump=()=>setTick(t=>t+1);
  const[busy,setBusy]=R.useState(false);
  const[thinking,setThinking]=R.useState(false);
  const[coach,setCoach]=R.useState(()=>({kind:"tip",text:saved?.moves?.length?"Nadaljujva, kjer sva ostala.":greet(cfg)}));
  const[review,setReview]=R.useState(null);   // ustavljena napaka
  const[preview,setPreview]=R.useState(null); // ogled variante na deski
  const[classes,setClasses]=R.useState(saved?.classes||{});
  const[events,setEvents]=R.useState(saved?.events||[]);
  const[over,setOver]=R.useState(null);
  const[hint,setHint]=R.useState(null);
  const[orientation,setOrientation]=R.useState(userColor);
  const[learn,setLearn]=R.useState(null); // po igri
  const lastOpening=R.useRef(saved?.lastOpening||null);
  const alienLeft=R.useRef(false);

  const persist=R.useCallback((extra={})=>{
    store({v:1,cfg,moves:game.moves.map(m=>m.uci),classes:extra.classes||classes,events:extra.events||events,lastOpening:lastOpening.current});
  },[cfg,classes,events]);
  R.useEffect(()=>{if(!over)persist()},[tick,classes,events]);
  R.useEffect(()=>{loadOpenings().then(()=>bump());if(!saved)S.start?.()},[]);

  const addEvent=R.useCallback(ev=>{setEvents(list=>list.some(e=>e.key&&e.key===ev.key)?list:[...list,ev])},[]);

  /* otvoritve / gambiti */
  const checkOpening=R.useCallback(()=>{
    const op=openingOf(game.fens);
    if(!op)return null;
    if(lastOpening.current!==op.name){
      lastOpening.current=op.name;
      if(/gambit/i.test(op.name)){
        const byUser=game.moves[op.ply-1]&&((op.ply-1)%2===0)===(userColor==="white");
        addEvent({key:"op:"+op.name,cat:"otvoritve",ply:op.ply,fen:game.fens[Math.max(0,op.ply-1)],
          title:op.name,text:`V partiji se je pojavil ${op.name}${byUser?" – ti si ga odigral":" – odigral ga je GiGi"}. Linija: ${op.pgn}.`,
          arrow:game.moves[op.ply-1]?{from:game.moves[op.ply-1].from,to:game.moves[op.ply-1].to}:null,
          solution:byUser?game.moves[op.ply-1].uci:null,sideToMove:byUser?userColor:gigiColor});
        return op;
      }
    }
    return null;
  },[userColor]);

  /* priložnost za gambit (na potezi je uporabnik) */
  const gambitChance=R.useCallback(async()=>{
    if(cfg.mode==="alien"||game.ply>=20||game.turn!==userColor)return null;
    const db=await loadOpenings().catch(()=>null);if(!db)return null;
    const ucis=game.moves.map(m=>m.uci),n=ucis.length;
    let best=null;
    for(const o of db.list){
      if(!/gambit/i.test(o.name)||o.uci.length<=n||o.uci.length>n+3)continue;
      let ok=true;for(let i=0;i<n;i++)if(o.uci[i]!==ucis[i]){ok=false;break}
      if(!ok)continue;
      if(!best||o.uci.length<best.uci.length)best=o;
    }
    if(!best)return null;
    const g=new Game(game.fen);const m=g.play(best.uci[n]);if(!m)return null;
    return{name:best.name,san:m.san,from:m.from,to:m.to,uci:best.uci[n],pgn:best.pgn};
  },[cfg.mode,userColor]);

  const finish=R.useCallback(st=>{
    const score=st.result==="1/2-1/2"?.5:(st.result==="1-0")===(userColor==="white")?1:0;
    setOver({...st,score});setReview(null);setPreview(null);setHint(null);
    store(null);
    score===1?S.win?.():S.end?.();
    try{
      if(game.ply>0){
        const id="gigi-"+cfg.id;
        saveGame({id,date:Date.now(),botId:"gigi",botName:"GiGi",botElo:cfg.elo,botStyle:"universal",userColor,startFen:START,chess960:false,
          moves:game.moves.map(m=>m.uci),sans:game.sanList(),result:st.result,reason:st.reason,userScore:score,rated:false,
          ratingBefore:profile.rating,ratingAfter:profile.rating,time:null,timeLabel:"Trener",category:"Trener",opening:lastOpening.current?{eco:"",name:lastOpening.current}:null,
          duration:Math.round((Date.now()-cfg.startedAt)/1e3),plies:game.ply,label:"GiGi trener",
          pgn:game.toPgn({White:userColor==="white"?profile.name:"GiGi (trener)",Black:userColor==="black"?profile.name:"GiGi (trener)",Result:st.result,Termination:st.reason})});
        bumpGoal("games");
      }
    }catch(e){console.warn(e)}
    setCoach({kind:"tip",text:score===1?"Bravo, zmagal si! 🎉":score===.5?"Remi – lepo se je borilo.":"Tokrat sem zmagala jaz. Poglejva, kaj se lahko naučiš!"});
  },[userColor,cfg,profile]);

  /* ── analiza uporabnikove poteze ── */
  const analyze=R.useCallback(async(fenBefore,posBefore,mv,posAfter)=>{
    const eng=getEngine("analysis");
    const r1=await eng.search({fen:fenBefore,depth:DEPTH,movetime:MOVETIME,multipv:2});
    if(r1.superseded||!r1.lines.length)return null;
    const best=r1.lines[0];
    let after=null,wAfter;
    if(posAfter.isCheckmate())wAfter=100;
    else if(posAfter.isEnd())wAfter=50;
    else{
      const r2=await eng.search({fen:game.fens[game.ply],depth:DEPTH,movetime:MOVETIME,multipv:1});
      if(r2.superseded)return null;
      after=r2.lines[0];
      wAfter=forSide(wp(after),userColor);
    }
    const wBest=forSide(wp(best),userColor);
    const isBest=best.pv?.[0]===mv.engineUci||best.pv?.[0]===mv.uci;
    const loss=Math.max(0,wBest-wAfter);
    const cls=classify(loss,isBest);
    const matStart=material(posBefore,userColor);
    const bestLine=pvToLine(fenBefore,best.pv,7);
    const replyLine=after?pvToLine(game.fens[game.ply],after.pv,6):null;
    const bestMv=bestLine.items[0];
    const bestDesc=bestMv?tagSentence(posBefore,bestMv):"";
    const myDesc=tagSentence(posBefore,mv);
    const replyMv=replyLine?.items[0];
    const replyDesc=replyMv?tagSentence(posAfter,replyMv):"";
    const bestTags=bestMv?(describe(posBefore,bestMv.uci).tags||[]):[];
    const myTags=describe(posBefore,mv.uci).tags||[];
    const replyTags=replyMv?(describe(posAfter,replyMv.uci).tags||[]):[];
    const badLineFull=replyLine?pvToLine(fenBefore,[mv.engineUci,...(after.pv||[])],7):null;
    const matBad=badLineFull?material(badLineFull.game.pos,userColor)-matStart:0;
    const matGood=material(bestLine.game.pos,userColor)-matStart;
    return{cls,loss,isBest,best,after,bestLine,replyLine,badLineFull,bestMv,bestDesc,myDesc,replyDesc,bestTags,myTags,replyTags,matBad,matGood,fenBefore,mv,ply:game.ply-1};
  },[userColor]);

  /* zapis dogodkov iz analize */
  const logEvents=R.useCallback(a=>{
    const base={ply:a.ply,fen:a.fenBefore,sideToMove:userColor,moveNo:moveLabel(a.ply,a.mv.san)};
    const bestArrow=a.bestMv?{from:a.bestMv.from,to:a.bestMv.to}:null;
    if(a.cls==="mistake"||a.cls==="blunder")
      addEvent({...base,key:"err"+a.ply,cat:"napake",title:`${LABEL[a.cls]}: ${base.moveNo}`,text:`Odigral si ${a.mv.san}. ${a.replyDesc?"Nasprotnik bi odgovoril: "+a.replyDesc+" ":""}Boljše je bilo ${a.bestMv?.san}${a.bestDesc?" – "+a.bestDesc:""}.`,arrow:bestArrow,solution:a.bestMv?.uci});
    if(a.replyTags.includes("hanging")&&a.loss>=5)
      addEvent({...base,key:"hang"+a.ply,cat:"visece",title:`Viseča figura po ${base.moveNo}`,text:`Po ${a.mv.san} je ostala tvoja figura nebranjena: ${a.replyDesc} Poišči potezo, ki to prepreči.`,arrow:bestArrow,solution:a.bestMv?.uci});
    if(a.loss>=5&&a.bestTags.some(t=>["hanging","winsMaterial","fork","mate","pin","skewer","discoveredAttack"].includes(t)))
      addEvent({...base,key:"miss"+a.ply,cat:a.bestTags.includes("mate")?"mat":a.bestTags.some(t=>TACTIC_TAGS.includes(t))?"taktika":"zgreseno",title:`Zgrešeno: ${a.bestMv.san}`,text:`Namesto ${a.mv.san} je bilo možno ${a.bestDesc||a.bestMv.san+"."} ${a.matGood>0?"Tako bi pridobil "+pointsTxt(a.matGood)+".":""}`,arrow:bestArrow,solution:a.bestMv.uci});
    if(a.loss<3&&a.myTags.some(t=>TACTIC_TAGS.includes(t)||t==="mate"))
      addEvent({...base,key:"found"+a.ply,cat:a.myTags.includes("mate")?"mat":"taktika",title:`Našel si: ${a.mv.san} ✓`,text:`Odlično! ${a.myDesc}`,arrow:{from:a.mv.from,to:a.mv.to},solution:a.mv.uci,good:true});
    if(a.replyTags.includes("mate")||(a.after?.mate!=null&&(userColor==="white"?a.after.mate<0:a.after.mate>0)&&Math.abs(a.after.mate)<=4))
      addEvent({...base,key:"mate"+a.ply,cat:"mat",title:`Matna grožnja po ${base.moveNo}`,text:`Po ${a.mv.san} ima nasprotnik mat: ${a.replyLine?.text||""}. Boljše je bilo ${a.bestMv?.san}.`,arrow:bestArrow,solution:a.bestMv?.uci});
  },[userColor]);

  /* ── Alien Gambit: teorija ── */
  const alienBook=R.useCallback(()=>{
    if(cfg.mode!=="alien")return null;
    const ucis=game.moves.map(m=>m.uci),n=ucis.length;
    const cands=(userColor==="black"?[...AG_LINES,...AG_ANTI]:AG_LINES).filter(l=>l.length>n&&ucis.every((u,i)=>l[i]===u));
    return cands;
  },[cfg.mode,userColor]);

  /* ── poteza uporabnika ── */
  const onMove=R.useCallback(async uci=>{
    if(over||busy||review||preview||game.turn!==userColor)return;
    const fenBefore=game.fen,posBefore=game.pos.clone();
    const bookBefore=alienBook();
    const mv=game.play(uci);
    if(!mv){S.illegal?.();bump();return}
    S.forMove?.(mv);setHint(null);bump();
    const st=game.status();
    // Alien Gambit – ali je poteza po teoriji?
    let alienMsg=null;
    if(cfg.mode==="alien"&&bookBefore&&bookBefore.length&&!alienLeft.current){
      const inBook=bookBefore.some(l=>l[game.ply-1]===mv.uci);
      if(inBook)alienMsg={ok:true,text:agNote(game.ply,game.moves.map(m=>m.uci))||"✓ Po teoriji Alien Gambita."};
      else{
        alienLeft.current=true;
        const g=new Game(fenBefore);const th=g.play(bookBefore[0][game.ply-1]);
        alienMsg={ok:false,text:`Zapustil si linijo Alien Gambita. Teorija je ${th?.san}. ${agNote(game.ply,[...game.moves.slice(0,-1).map(m=>m.uci),bookBefore[0][game.ply-1]])||""}`,
          arrow:th?{from:th.from,to:th.to}:null};
        addEvent({key:"agleave",cat:"otvoritve",ply:game.ply-1,fen:fenBefore,sideToMove:userColor,title:"Alien Gambit – odstop od teorije",text:alienMsg.text,arrow:alienMsg.arrow,solution:th?.uci,moveNo:moveLabel(game.ply-1,mv.san)});
      }
    }
    const op=checkOpening();
    setBusy(true);
    setCoach({kind:"thinking",text:`GiGi preverja ${mv.san}…`,alien:alienMsg});
    const a=await analyze(fenBefore,posBefore,mv,game.pos).catch(e=>(console.error(e),null));
    setBusy(false);
    if(!a){setCoach({kind:"tip",text:"",alien:alienMsg});if(st.over)finish(st);return}
    if(alienMsg?.ok&&(a.cls==="mistake"||a.cls==="blunder"||a.cls==="inaccuracy")){a.theory=true;a.cls="book"}
    const nc={...classes,[a.ply]:a.cls};setClasses(nc);
    if(!a.theory)logEvents(a);
    const isErr=a.cls==="mistake"||a.cls==="blunder";
    if(st.over){setCoach(buildCoach(a,alienMsg,op));finish(st);return}
    if(isErr&&cfg.pause){
      S.wrong?.();
      setReview(a);
      setCoach(buildCoach(a,alienMsg,op));
      return;
    }
    setCoach(buildCoach(a,alienMsg,op,cfg.inacc));
  },[over,busy,review,preview,userColor,classes,cfg,analyze,logEvents,checkOpening,finish,alienBook]);

  /* ── poteza GiGi ── */
  R.useEffect(()=>{
    if(over||review||busy||game.turn!==gigiColor||game.status().over)return;
    let cancel=false;const ply=game.ply;
    setThinking(true);
    (async()=>{
      let uci=null;
      const book=alienBook();
      if(book&&book.length&&!alienLeft.current){
        const opts=[...new Set(book.map(l=>l[ply]).filter(Boolean))];
        uci=opts[Math.floor(Math.random()*opts.length)];
      }
      if(!uci){const r=await botMove(game,bot).catch(e=>(console.error(e),null));uci=r?.uci;}
      await new Promise(r=>setTimeout(r,350));
      if(cancel||game.ply!==ply||!uci){setThinking(false);return}
      const posBefore=game.pos.clone(),fenBefore=game.fen;
      const mv=game.play(uci);
      setThinking(false);
      if(!mv)return;
      S.forMove?.(mv);bump();
      const op=checkOpening();
      // ali je GiGi naredila taktiko?
      const t=describe(posBefore,mv.uci).tags||[];
      const sent=tagSentence(posBefore,mv);
      if(t.some(x=>TACTIC_TAGS.includes(x))||t.includes("mate")){
        addEvent({key:"gg"+(ply),cat:t.includes("mate")?"mat":"taktika",ply,fen:fenBefore,sideToMove:gigiColor,moveNo:moveLabel(ply,mv.san),
          title:`GiGi: ${mv.san}`,text:`GiGi je odigrala ${sent} Pri takih motivih bodi pozoren – preveri vse šahe, jemanja in napade.`,arrow:{from:mv.from,to:mv.to},solution:mv.uci,theirs:true});
      }
      setCoach(c=>{
        const notes=[];
        if(cfg.mode==="alien"&&!alienLeft.current){const nt=agNote(game.ply,game.moves.map(m=>m.uci));if(nt)notes.push(nt)}
        if(op&&/gambit/i.test(op.name))notes.push(`📖 Dogodek: ${op.name}!`);
        if(t.some(x=>TACTIC_TAGS.includes(x)))notes.push(`⚠️ Pozor: ${sent}`);
        else if(t.includes("check"))notes.push(`Šah! ${mv.san} – reši kralja.`);
        return{...c,gigi:notes.join(" ")||null};
      });
      const st=game.status();
      if(st.over){finish(st);return}
      const ch=await gambitChance();
      if(ch&&!cancel)setCoach(c=>({...c,chance:ch}));
    })();
    return()=>{cancel=true};
  },[tick,over,review,busy]);

  /* ── gumbi ── */
  const takeBack=()=>{
    getEngine("play").stop?.();
    if(review){game.undo();setReview(null);setPreview(null);setCoach({kind:"tip",text:`Poteza vzeta nazaj. Poskusi najti boljšo – namig: poglej ${review.bestMv?.san?"potezo s figuro na "+review.bestMv.from:"vse šahe in jemanja"}.`});bump();S.move?.();return}
    if(busy||thinking)return;
    let n=0;
    if(game.turn===userColor&&game.ply>=2){game.undo();game.undo();n=2}
    else if(game.turn===gigiColor&&game.ply>=1){game.undo();n=1}
    if(n){alienLeft.current=false;setHint(null);setCoach({kind:"tip",text:"Poteza vzeta nazaj."});bump();S.move?.()}
  };
  const continueAnyway=()=>{setReview(null);setPreview(null);setCoach(c=>({...c,kind:"warn",paused:false}));bump()};
  const askHint=async()=>{
    if(game.turn!==userColor||busy||over)return;
    setHint({loading:true});
    const r=await getEngine("analysis").search({fen:game.fen,depth:DEPTH,movetime:MOVETIME,multipv:1});
    const l=r.lines[0];if(!l){setHint(null);return}
    const line=pvToLine(game.fen,l.pv,5);const m=line.items[0];
    setHint({from:m.from,to:m.to,san:m.san,text:tagSentence(game.pos,m)||"Ta poteza najbolj izboljša tvojo pozicijo.",line:line.text});
  };
  const showLine=(kind)=>{
    const a=review||coach.analysis;if(!a)return;
    const L=kind==="good"?a.bestLine:a.badLineFull;if(!L)return;
    setPreview({kind,fens:L.fens,moves:L.items,idx:1});
  };
  R.useEffect(()=>{
    if(!preview||!preview.playing)return;
    const t=setInterval(()=>setPreview(p=>p&&p.idx<p.fens.length-1?{...p,idx:p.idx+1}:{...p,playing:false}),900);
    return()=>clearInterval(t);
  },[preview?.playing]);

  /* ── prikaz deske ── */
  const viewFen=preview?preview.fens[preview.idx]:game.fen;
  const dests=R.useMemo(()=>game.dests(),[tick]);
  let lastMove=preview?(preview.idx>0?[preview.moves[preview.idx-1].from,preview.moves[preview.idx-1].to]:void 0):game.lastMove();
  const shapes=[];
  if(preview){const nx=preview.moves[preview.idx];if(nx)shapes.push({orig:nx.from,dest:nx.to,brush:preview.kind==="good"?"green":"red"})}
  else if(review){
    const r=review.replyLine?.items[0];if(r)shapes.push({orig:r.from,dest:r.to,brush:"red"});
  }else if(hint&&!hint.loading)shapes.push({orig:hint.from,dest:hint.to,brush:"green"});
  else if(coach.chance&&game.turn===userColor)shapes.push({orig:coach.chance.from,dest:coach.chance.to,brush:"paleBlue"});
  else if(coach.alien&&!coach.alien.ok&&coach.alien.arrow)shapes.push({orig:coach.alien.arrow.from,dest:coach.alien.arrow.to,brush:"paleGreen"});
  const inCheck=!preview&&game.status().check;
  const movable=!over&&!preview&&!review&&!busy&&game.turn===userColor?userColor:null;

  const playerBar=(color)=>{
    const isUser=color===userColor;
    return h("div",{className:"player-bar"},
      isUser?h(Avatar,{user:profile,size:38}):h(Avatar,{bot,size:38}),
      h("div",{className:"player-meta"},
        h("div",{className:"player-name"},isUser?profile.name:"GiGi"," ",h("span",{className:"muted small"},"(",isUser?profile.rating:cfg.elo,")"),
          !isUser&&thinking&&h("span",{className:"pulse-dot",title:"razmišlja"}))));
  };

  const top=orientation==="white"?"black":"white";
  return h("div",{className:"play-layout"},
    h("div",{className:"board-col"},
      h("div",{className:"board-stack"},
        playerBar(top),
        h(Board,{fen:viewFen,orientation,movable,dests,lastMove,check:inCheck,onMove,shapes,viewOnly:!!preview||!!over}),
        playerBar(top==="white"?"black":"white")
      )
    ),
    h("div",{className:"side-panel"},
      over&&h(ResultCard,{over,events,onLearn:()=>setLearn("menu"),onNew:()=>onNew({...cfg,id:"g"+Date.now().toString(36),startedAt:Date.now()}),onExit}),
      learn&&h(LearnPanel,{events,learn,setLearn,userColor}),
      !learn&&h(CoachCard,{coach,review,hint,busy,userTurn:game.turn===userColor,onTakeBack:takeBack,onContinue:continueAnyway,onShow:showLine,cfg}),
      preview&&h("div",{className:"card"},
        h("div",{className:"small",style:{marginBottom:6}},h("b",null,preview.kind==="good"?"Boljša varianta":"Kaj bi se zgodilo"),` · poteza ${preview.idx}/${preview.fens.length-1}: `,preview.moves[preview.idx-1]?.san||"začetek"),
        h("div",{className:"gg-preview"},
          h("button",{className:"btn icon",onClick:()=>setPreview(p=>({...p,idx:0,playing:false}))},h(Icon,{name:"first"})),
          h("button",{className:"btn icon",onClick:()=>setPreview(p=>({...p,idx:Math.max(0,p.idx-1),playing:false}))},h(Icon,{name:"prev"})),
          h("button",{className:"btn icon",onClick:()=>setPreview(p=>({...p,playing:!p.playing,idx:p.idx>=p.fens.length-1?0:p.idx}))},h(Icon,{name:preview.playing?"pause":"play"})),
          h("button",{className:"btn icon",onClick:()=>setPreview(p=>({...p,idx:Math.min(p.fens.length-1,p.idx+1),playing:false}))},h(Icon,{name:"next"})),
          h("button",{className:"btn small",onClick:()=>setPreview(null)},"Nazaj na igro")
        )
      ),
      !over&&!learn&&h("div",{className:"game-actions"},
        h("button",{className:"btn",onClick:takeBack,disabled:game.ply===0||(!review&&(busy||thinking))},h(Icon,{name:"undo"}),"Nazaj"),
        h("button",{className:"btn",onClick:askHint,disabled:game.turn!==userColor||busy||!!review},h(Icon,{name:"bulb"}),hint?.loading?"…":"Namig"),
        h("button",{className:"btn",onClick:()=>setOrientation(o=>o==="white"?"black":"white")},h(Icon,{name:"flip"}),"Obrni"),
        h("button",{className:"btn",onClick:()=>{if(confirmLeave())finish({over:!0,result:userColor==="white"?"0-1":"1-0",reason:"predaja",winner:gigiColor})}},h(Icon,{name:"flag"}),"Predaj"),
        h("button",{className:"btn",onClick:onExit},h(Icon,{name:"settings"}),"Nastavitve")
      ),
      h("div",{className:"card flat"},
        h("div",{className:"row spread",style:{padding:"10px 12px",borderBottom:"1px solid var(--line)"}},
          h("span",{className:"small"},h("b",null,lastOpening.current||"Začetna pozicija")),
          h("span",{className:"tiny muted"},"GiGi ",cfg.elo," Elo",cfg.mode==="alien"?" · Alien Gambit":"")),
        h(MoveList,{moves:game.moves,classes:game.moves.map((m,i)=>classes[i]),current:game.ply,onSelect:()=>{},startPly:0,startBlack:false})
      ),
      events.length>0&&!learn&&h("div",{className:"card"},
        h("div",{className:"row spread",style:{marginBottom:6}},h("b",{className:"small"},"Dogodki v partiji (",events.length,")"),over&&h("button",{className:"btn small",onClick:()=>setLearn("menu")},"Uči se")),
        h("div",{className:"gg-events"},events.slice().reverse().map((e,i)=>J.jsxs("div",{className:"gg-ev",children:[J.jsx("span",{className:"dot",style:{background:e.good?"var(--good)":e.theirs?"var(--warn)":e.cat==="otvoritve"?"var(--accent)":"var(--bad)"}}),J.jsx("span",{children:e.title})]},i)))
      )
    )
  );
}
function confirmLeave(){return true}
function greet(cfg){
  const lvl=cfg.elo<800?"začetniškem":cfg.elo<1400?"klubskem":cfg.elo<2000?"močnem":"mojstrskem";
  if(cfg.mode==="alien")return cfg.color==="white"?"Danes treniramo Alien Gambit! Začni z 1.e4 – jaz bom igrala Caro-Kann. Razložila ti bom vsak korak.":"Danes bom jaz igrala Alien Gambit, ti pa se naučiš obrambe. "+AG_ANTIDOTE;
  return`Živjo, jaz sem GiGi! Igram na ${lvl} nivoju (${cfg.elo} Elo). Po vsaki tvoji potezi ti povem, ali je dobra, in te opozorim na napake. Srečno!`;
}
function moveLabel(ply,san){const n=Math.floor(ply/2)+1;return ply%2===0?`${n}. ${san}`:`${n}... ${san}`}
function buildCoach(a,alien,op,showInacc=true){
  const c={kind:"ok",analysis:a,alien,cls:a.cls};
  const err=a.cls==="mistake"||a.cls==="blunder";
  if(err){c.kind="warn";c.paused=true}
  else if(a.cls==="inaccuracy"){c.kind=showInacc?"warn":"ok";c.soft=true}
  if(op&&/gambit/i.test(op.name))c.opening=op.name;
  return c;
}

function CoachCard({coach,review,hint,busy,userTurn,onTakeBack,onContinue,onShow,cfg}){
  const a=coach.analysis;
  const meta=a?CLS[a.cls]:null;
  const err=a&&(a.cls==="mistake"||a.cls==="blunder");
  const showDetail=a&&!a.theory&&(err||(a.cls==="inaccuracy"&&cfg.inacc));
  return h("div",{className:"card gg-coach "+(coach.kind==="warn"?"warn":coach.kind==="ok"?"ok":"tip")},
    h("div",{className:"gg-head"},
      h(Avatar,{bot:gigiBot(cfg.elo),size:40}),
      h("div",{className:"grow"},h("b",null,"GiGi"),busy&&h("span",{className:"pulse-dot",style:{marginLeft:8}}))
    ),
    coach.text&&h("div",{className:"bot-speech"},coach.text),
    coach.alien&&h("div",{className:"feedback "+(coach.alien.ok?"ok":"bad")+" small mt"},coach.alien.text),
    coach.opening&&h("div",{className:"gg-banner mt"},"📖 Dogodek: ",coach.opening),
    a&&h("div",{className:"mt"},
      h("span",{className:"gg-tag",style:{background:meta.color}},meta.sym," ",LABEL[a.cls]),
      " ",h("b",null,a.mv.san),
      h("span",{className:"muted small"}," · ocena po potezi ",fmtEval(a.after||a.best,cfg.color))
    ),
    a&&!showDetail&&h("div",{className:"small mt"},a.theory?`To je poteza iz teorije gambita. Motor jo oceni z ${fmtEval(a.after||a.best,cfg.color)}, ker žrtvuješ material – ampak v zameno dobiš napad in črni mora igrati zelo natančno.`:praise(a)),
    showDetail&&h("div",null,
      h("div",{className:"small mt"},err?(a.cls==="blunder"?"⚠️ Pozor, to je huda napaka! ":"⚠️ To je napaka. "):"Ni najbolj natančno. ",
        a.replyDesc?`Nasprotnik lahko odgovori ${a.replyDesc} `:"",
        a.matBad<=-2.5?`Po tej varianti izgubiš ${pointsTxt(a.matBad)}. `:"",
        a.after?.mate!=null&&(cfg.color==="white"?a.after.mate<0:a.after.mate>0)?`Nasprotnik ima mat v ${Math.abs(a.after.mate)}! `:""),
      a.badLineFull&&h("div",{className:"gg-line bad"},
        h("b",null,"Kaj bi se zgodilo po tvoji potezi"),
        h("div",{className:"mono"},a.badLineFull.text),
        h("div",{className:"tiny muted"},"Ocena na koncu: ",fmtEval(a.after,cfg.color))),
      a.bestLine&&a.bestMv&&h("div",{className:"gg-line good"},
        h("b",null,"Boljše: ",h("span",{style:{textTransform:"none",fontSize:".95rem",color:"var(--good)"}},a.bestMv.san)),
        a.bestDesc&&h("div",{className:"small"},a.bestDesc),
        h("div",{className:"mono"},a.bestLine.text),
        h("div",{className:"tiny muted"},"Ocena: ",fmtEval(a.best,cfg.color),a.matGood>=2.5?` · pridobiš ${pointsTxt(a.matGood)}`:"")),
      h("div",{className:"gg-btns"},
        h("button",{className:"btn small",onClick:()=>onShow("bad")},h(Icon,{name:"eye"})," Pokaži, kaj bi se zgodilo"),
        h("button",{className:"btn small",onClick:()=>onShow("good")},h(Icon,{name:"star"})," Pokaži boljšo varianto"),
        review&&h("button",{className:"btn small primary",onClick:onTakeBack},h(Icon,{name:"undo"})," Vzemi nazaj in poskusi znova"),
        review&&h("button",{className:"btn small",onClick:onContinue},"Nadaljuj vseeno")
      )
    ),
    coach.gigi&&h("div",{className:"bot-speech mt small"},coach.gigi),
    coach.chance&&userTurn&&h("div",{className:"gg-banner mt"},"💡 Dogodek: tukaj lahko igraš ",h("b",null,coach.chance.san)," – ",coach.chance.name,". Modra puščica kaže potezo."),
    hint&&!hint.loading&&h("div",{className:"feedback info small mt"},h("b",null,"Namig: ",hint.san),". ",hint.text,h("div",{className:"tiny muted mono",style:{marginTop:4}},hint.line))
  );
}
function praise(a){
  if(a.cls==="brilliant"||a.cls==="great")return"Odlično! Našel si edino močno potezo. "+(a.myDesc||"");
  if(a.cls==="best")return(a.myDesc?a.myDesc+" ":"")+"To je najboljša poteza. 👍";
  if(a.cls==="excellent")return"Zelo dobro – skoraj tako dobro kot najboljša poteza.";
  if(a.cls==="good")return`Dobra poteza. Še malo boljše je bilo ${a.bestMv?.san||""}.`;
  if(a.cls==="inaccuracy")return`Netočnost – boljše je bilo ${a.bestMv?.san||""}.`;
  return"";
}

/* ───────────── po igri ───────────── */
function ResultCard({over,events,onLearn,onNew,onExit}){
  const cnt=events.length;
  return h("div",{className:"card result-banner"},
    h("div",{className:"big-result"},over.score===1?"Zmagal si!":over.score===0?"GiGi je zmagala":"Remi"),
    h("div",{className:"muted"},over.result," · ",reasonSl(over.reason)),
    h("div",{className:"bot-speech mt",style:{textAlign:"left"}},cnt?`V partiji sem opazila ${cnt} ${cnt===1?"dogodek":cnt===2?"dogodka":cnt<5?"dogodke":"dogodkov"}. Bi se rad katerega od njih bolje naučil? Pokažem ti primere iz najine igre.`:"V tej partiji nisem opazila posebnih dogodkov. Odlično!"),
    h("div",{className:"row mt",style:{justifyContent:"center"}},
      cnt>0&&h("button",{className:"btn primary",onClick:onLearn},h(Icon,{name:"learn"})," Da, uči me"),
      h("button",{className:"btn",onClick:onNew},h(Icon,{name:"restart"})," Nova igra"),
      h("button",{className:"btn",onClick:onExit},h(Icon,{name:"settings"})," Nastavitve")
    )
  );
}
function reasonSl(r){return{checkmate:"mat",stalemate:"pat","insufficient material":"premalo materiala","threefold repetition":"trikratna ponovitev","fifty-move rule":"pravilo 50 potez",resignation:"predaja",predaja:"predaja"}[r]||r}

function LearnPanel({events,learn,setLearn,userColor}){
  const groups={};for(const e of events)(groups[e.cat]=groups[e.cat]||[]).push(e);
  if(learn==="menu")return h("div",{className:"card col",style:{display:"flex",flexDirection:"column",gap:8}},
    h("div",{className:"gg-head"},h(Avatar,{bot:gigiBot(1500),size:40}),h("b",null,"Kaj bi se rad naučil?")),
    h("div",{className:"small muted"},"Izberi temo – pokažem ti primere iz partije in lahko jih poskusiš rešiti sam."),
    Object.keys(CATS).filter(k=>groups[k]).map(k=>J.jsxs("button",{className:"gg-cat",onClick:()=>setLearn(k),children:[J.jsx(Icon,{name:CATS[k].icon}),J.jsxs("div",{children:[J.jsx("b",{children:CATS[k].title}),J.jsx("div",{className:"tiny muted",children:CATS[k].desc})]}),J.jsx("span",{className:"n",children:groups[k].length})]},k)),
    h("button",{className:"btn",onClick:()=>setLearn(null)},"Ne, hvala")
  );
  const list=(groups[learn]||[]).slice(0,6);
  return h("div",{className:"card col",style:{display:"flex",flexDirection:"column",gap:10}},
    h("div",{className:"row spread"},h("b",null,CATS[learn].title),h("button",{className:"btn small",onClick:()=>setLearn("menu")},"← Teme")),
    h("div",{className:"small muted"},explainCat(learn)),
    list.map((e,i)=>J.jsx(Example,{ev:e,userColor},e.key||i))
  );
}
function explainCat(k){
  return{
    napake:"Pred vsako potezo se vprašaj: Kaj mi nasprotnik grozi? Ali po moji potezi kaj ostane nebranjeno?",
    zgreseno:"Vsako potezo najprej preveri ŠAHE, JEMANJA in NAPADE – tako ne zgrešiš priložnosti.",
    taktika:"Vilice = ena figura napade dve. Vezava = figura se ne sme premakniti, ker bi odprla večjo figuro. Ražnjič = napad skozi večjo figuro na manjšo.",
    visece:"Viseča figura je figura, ki je nihče ne brani. Preden premakneš figuro, preveri, kaj je ostalo brez obrambe.",
    mat:"Pri matnih grožnjah preveri šibka polja okoli kralja (f7/f2, h7/h2) in vse šahe.",
    otvoritve:"Gambit = žrtvovanje materiala (običajno kmeta ali figure) v otvoritvi za hiter razvoj in napad. Alien Gambit žrtvuje celo skakača na f7!",
  }[k];
}
function Example({ev}){
  const[mode,setMode]=R.useState("show");// show | try | hint | solved
  const[msg,setMsg]=R.useState(null);
  const[fen,setFen]=R.useState(ev.fen);
  const[rk,setRk]=R.useState(0);
  const g=R.useMemo(()=>new Game(ev.fen),[ev.fen]);
  const side=g.turn;
  const solMv=R.useMemo(()=>ev.solution?new Game(ev.fen).play(ev.solution):null,[ev]);
  const reset=()=>{setFen(ev.fen);setRk(k=>k+1)};
  const tryMove=async uci=>{
    if(mode!=="try"&&mode!=="hint")return;
    const t=new Game(ev.fen);const m=t.play(uci);if(!m){reset();return}
    if(solMv&&m.uci===solMv.uci){S.correct?.();setFen(t.fen);setMode("solved");setMsg({ok:true,text:`Pravilno! ${m.san} ✓`});return}
    setMsg({ok:null,text:"Preverjam…"});setFen(t.fen);
    const eng=getEngine("analysis");
    const r1=await eng.search({fen:ev.fen,depth:13,movetime:900,multipv:1});
    const r2=t.pos.isCheckmate()?null:await eng.search({fen:t.fen,depth:13,movetime:900,multipv:1});
    const wAfter=t.pos.isCheckmate()?100:forSide(wp(r2?.lines[0]),side);
    const loss=forSide(wp(r1.lines[0]),side)-wAfter;
    if(loss<=3){S.correct?.();setMode("solved");setMsg({ok:true,text:`Tudi ${m.san} je odlična poteza! (GiGi je predlagala ${solMv?.san}.)`});return}
    S.wrong?.();setMsg({ok:false,text:`${m.san} ni najboljše. Poskusi znova!`});reset();
  };
  const shapes=mode==="show"&&ev.arrow?[{orig:ev.arrow.from,dest:ev.arrow.to,brush:ev.theirs?"red":"green"}]:
    mode==="hint"&&solMv?[{orig:solMv.from,brush:"yellow"}]:[];
  const movable=(mode==="try"||mode==="hint")?side:null;
  return h("div",{className:"gg-ex"},
    h("div",{className:"gg-mini"},J.jsx(Board,{fen,orientation:ev.sideToMove||side,movable,dests:movable?g.dests():new Map(),onMove:tryMove,shapes,viewOnly:!movable,coordinates:false},rk)),
    h("div",null,
      h("div",{className:"tiny muted"},ev.moveNo||""),
      h("b",null,ev.title),
      h("div",{className:"small mt"},ev.text),
      msg&&h("div",{className:"feedback small mt "+(msg.ok?"ok":msg.ok===false?"bad":"info")},msg.text),
      ev.solution&&!ev.theirs&&h("div",{className:"gg-btns"},
        mode==="show"&&h("button",{className:"btn small primary",onClick:()=>{setMode("try");reset();setMsg({ok:null,text:`Na potezi so ${side==="white"?"beli":"črni"}. Poišči najboljšo potezo!`})}},h(Icon,{name:"target"})," Poskusi sam"),
        mode==="try"&&h("button",{className:"btn small",onClick:()=>{setMode("hint");setMsg({ok:null,text:`Namig: premakni figuro s polja ${solMv?.from}.`})}},h(Icon,{name:"bulb"})," Namig"),
        mode!=="show"&&h("button",{className:"btn small",onClick:()=>{setMode("show");reset();setMsg(null)}},"Pokaži rešitev")
      ),
      ev.theirs&&h("div",{className:"tiny muted mt"},"To je bila GiGina poteza – zapomni si vzorec, da ga naslednjič opaziš prej.")
    )
  );
}

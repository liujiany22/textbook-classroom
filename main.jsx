import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SlideCanvas} from '@openmaic/renderer';
import './style.css';
function Quiz({scene}){
 const [answers,setAnswers]=useState({}),[submitted,setSubmitted]=useState(false);
 const qs=scene.content.questions;
 const equal=(q)=>JSON.stringify([...(answers[q.id]??[])].sort())===JSON.stringify([...(q.answer??[])].sort());
 return <section className="quiz"><h2>章节测验</h2><p>共 {qs.length} 题，每题 1 分；多选题全部选对得分。</p>{qs.map((q,i)=><fieldset key={q.id}><legend>{i+1}. {q.question}{q.type==='multiple'?'（多选）':''}</legend>{q.options.map(o=><label key={o.value}><input type={q.type==='multiple'?'checkbox':'radio'} name={q.id} checked={(answers[q.id]??[]).includes(o.value)} onChange={e=>{setSubmitted(false);setAnswers(prev=>({...prev,[q.id]:q.type==='single'?[o.value]:e.target.checked?[...(prev[q.id]??[]),o.value]:(prev[q.id]??[]).filter(v=>v!==o.value)}));}}/>{o.value}. {o.label}</label>)}{submitted&&<p className={equal(q)?'correct':'incorrect'}>{equal(q)?'正确':'需要复习'} · 答案 {q.answer.join('、')}<br/>{q.analysis}</p>}</fieldset>)}<button onClick={()=>setSubmitted(true)}>提交测验</button><button className="secondary" onClick={()=>{setAnswers({});setSubmitted(false);}}>重新作答</button>{submitted&&<p role="status">得分：{qs.filter(equal).length} / {qs.length}</p>}</section>;
}
function App(){
 const [key,setKey]=useState('vectors'),[doc,setDoc]=useState(null),[index,setIndex]=useState(0),[error,setError]=useState('');
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[index,key]);
 useEffect(()=>{let active=true;setDoc(null);setIndex(0);fetch(`/courses/${key}.json`).then(r=>{if(!r.ok)throw Error('课程文件读取失败');return r.json();}).then(d=>{if(active)setDoc(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[key]);
 const current=doc?.scenes[index];
 return <><header><div><b>数学章节课堂</b><small>人教版 · 首章学习</small></div><select aria-label="选择教材" value={key} onChange={e=>setKey(e.target.value)}><option value="vectors">高中 · 平面向量及其应用</option><option value="quadratics">九年级 · 一元二次方程</option></select></header>{error&&<p role="alert">{error}</p>}{doc&&<div className="workspace"><aside><h1>{doc.stage.name}</h1><p>{doc.stage.description}</p><nav aria-label="课程目录">{doc.scenes.map((s,i)=><button aria-current={i===index?'step':undefined} key={s.id} onClick={()=>setIndex(i)}>{s.type==='quiz'?'测验':String(i+1).padStart(2,'0')}　{s.title}</button>)}</nav></aside><main>{current.type==='slide'?<><div className="canvas"><SlideCanvas slide={current.content.canvas}/></div><div className="controls"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>上一页</button><span>{index+1} / {doc.scenes.length-1} 页</span><button onClick={()=>setIndex(i=>i+1)}>{index===doc.scenes.length-2?'开始测验':'下一页'}</button></div><details><summary>查看本页讲稿</summary><p>{current.actions?.filter(a=>a.type==='speech').map(a=>a.text).join('\n')}</p></details></>:<Quiz key={current.id} scene={current}/>}</main></div>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);

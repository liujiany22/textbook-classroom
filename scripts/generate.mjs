import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateSceneOutlinesFromRequirements, generateSceneContent, buildCompleteScene } from '@openmaic/generation';
import { validateStage, validateScene, DSL_VERSION } from '@openmaic/dsl';
import JSZip from 'jszip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'outputs');
const publicCourses = path.join(root, 'public/courses');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(publicCourses, { recursive: true });
const savedResponse = (response) => async () => JSON.stringify(response);
function restoreIds(value, saved, location) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'id') value.id = saved?.id ?? createHash('sha256').update(location).digest('hex').slice(0, 20);
    else restoreIds(child, saved?.[key], `${location}/${key}`);
  }
}

for (const key of ['vectors', 'quadratics']) {
  const saved = JSON.parse(await fs.readFile(path.join(root, 'courses', `${key}.json`), 'utf8'));
  const outlines = saved.outline.outlines.map((outline) => outline.type === 'quiz'
    ? { ...outline, quizConfig: { questionCount: 12, difficulty: 'medium', questionTypes: ['single', 'multiple'] } }
    : outline);
  const result = await generateSceneOutlinesFromRequirements(
    { requirement: `生成《${saved.stage.name}》的章节课件与测验。`, interactiveMode: false },
    saved.stage.description, [],
    savedResponse({ courseTitle: saved.stage.name, languageDirective: '使用简体中文教学。', outlines }),
  );
  if (!result.success) throw new Error(result.error);
  const stage = saved.stage;
  const scenes = [];
  for (const outline of result.data.outlines) {
    const original = saved.scenes.find((scene) => scene.outlineId === outline.id);
    if (!original) throw new Error(`Missing course content: ${outline.id}`);
    const response = outline.type === 'slide'
      ? { elements: original.content.canvas.elements, background: original.content.canvas.background }
      : original.content.questions;
    const content = await generateSceneContent(outline, savedResponse(response), { languageDirective: '使用简体中文教学。' });
    if (!content) throw new Error(`Invalid scene content: ${outline.id}`);
    const actions = (original.actions ?? []).map(({ agentId, ...action }) => action);
    const scene = buildCompleteScene(outline, content, actions, stage.id, { sceneId: original.id });
    restoreIds(scene.content, original.content, original.id);
    scene.createdAt = original.createdAt ?? stage.createdAt;
    scene.updatedAt = original.updatedAt ?? stage.updatedAt;
    const valid = validateScene(scene);
    if (!valid.valid) throw new Error(JSON.stringify(valid.errors));
    scenes.push(scene);
  }
  const valid = validateStage(stage);
  if (!valid.valid) throw new Error(JSON.stringify(valid.errors));
  const provenance = { projectAuthor: 'ljy', mode: 'saved-course-replay', sdk: { generation: '0.3.1', dsl: '0.10.1', renderer: '0.1.3' } };
  const doc = { stage, scenes, dslVersion: DSL_VERSION, outline: { outlines: result.data.outlines, generationComplete: true }, provenance };
  await fs.writeFile(path.join(publicCourses, `${key}.json`), JSON.stringify(doc));
  await fs.writeFile(path.join(output, `${key}.json`), JSON.stringify(doc, null, 2));
  const manifest = {
    formatVersion: 1, exportedAt: new Date(stage.updatedAt).toISOString(), appVersion: '0.3.2',
    stage: { name: stage.name, description: stage.description, language: stage.languageDirective, style: stage.style, createdAt: stage.createdAt, updatedAt: stage.updatedAt },
    agents: [{ name: '数学老师', role: 'teacher', persona: '讲解本章概念与例题。', avatar: '', color: '#096E68', priority: 1 }],
    scenes: scenes.map(({ type, title, order, content, actions }) => ({ type, title, order, content, actions })), mediaIndex: {},
  };
  const zip = new JSZip();
  const date = new Date(stage.updatedAt);
  zip.file('manifest.json', JSON.stringify(manifest), { date });
  zip.file('provenance.json', JSON.stringify(provenance), { date });
  await fs.writeFile(path.join(output, `${key}.maic.zip`), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log(`${key}: ${scenes.filter((scene) => scene.type === 'slide').length} slides, ${scenes.filter((scene) => scene.type === 'quiz').reduce((n, scene) => n + scene.content.questions.length, 0)} questions`);
}

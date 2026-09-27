# 数学章节课堂

由 **ljy** 设计与维护。基于 OpenMAIC 的章节课件与测验播放器，支持课程目录、翻页、讲稿查看和自动评分。

| 课程 | 课件 | 测验 |
| --- | --- | --- |
| 平面向量及其应用 | 21 页 | 12 题 |
| 一元二次方程 | 17 页 | 12 题 |

## 运行

需要 Node.js 22.13+。

```sh
npm ci
npm run dev
```

打开 [本地课堂](http://127.0.0.1:8780/)。选择课程后可逐页阅读、查看讲稿并提交章节测验。单选、多选题均提供答案和解析。

## 构建与导出

```sh
npm run build
npm run preview
```

构建前会从 `courses/` 的课程源文件生成播放器数据，并在 `outputs/` 导出课程 JSON 和 `.maic.zip`。也可单独执行 `npm run generate`。

`scripts/generate.mjs` 将保存的课程内容传入 OpenMAIC Generation SDK，完成大纲解析、场景组装和 DSL 校验。此步骤在本地重建课程，无需模型 API。新增课程时，按现有 JSON 结构提供课程内容并加入生成清单。

## 文件

- `courses/`：两门课程的内容、讲稿与测验。
- `scripts/generate.mjs`：课程构建与导出。
- `main.jsx`、`style.css`：播放器和测验界面。

章节编排参考人教 A 版《普通高中教科书·数学·必修第二册》第六章，以及人教版《义务教育教科书·数学·九年级上册》第二十一章。项目使用 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) SDK，依赖包许可随 npm 安装提供。

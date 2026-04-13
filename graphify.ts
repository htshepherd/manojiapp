#!/usr/bin/env node
/**
 * Graphify Service
 * 功能：
 *   1. 监听 notes/raw/ 目录变化（文件写入/修改）
 *   2. 扫描 note_links（Qdrant 语义关联）构建 graph.json
 *   3. 按分类汇总笔记内容，生成 wiki/{category}.md 综述
 *   4. 调用 POST /api/internal/graphify-sync 通知主应用同步数据
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { watch } from 'fs';

// ─── 配置 ────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';

// ─── 配置初始化 ─────────────────────────────────────────────────────────────
function initConfig() {
  const env = process.env.NODE_ENV || 'development';
  const result = dotenv.config({ 
    path: env === 'production' ? '.env.production' : '.env.local' 
  });
  
  if (result.error) {
    console.warn(`[Config] 未能读取配置文件: ${result.error.message}`);
  }
  
  const required = ['DATABASE_URL', 'GRAPHIFY_WEBHOOK_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`[Fatal] 缺少关键配置项: ${missing.join(', ')}`);
    // 在生产环境下，缺少关键配置应立即报错停止，防止产生脏数据
    if (env === 'production') process.exit(1);
  }
}

initConfig();

const RAW_NOTES_DIR = process.env.RAW_NOTES_DIR || './notes/raw';
const OUTPUT_DIR    = process.env.GRAPHIFY_OUT_DIR || './graphify-out';
const WEBHOOK_URL   = process.env.GRAPHIFY_WEBHOOK_URL || 'http://localhost:3000/api/internal/graphify-sync';
const WEBHOOK_SECRET = process.env.GRAPHIFY_WEBHOOK_SECRET || '';
const DATABASE_URL  = process.env.DATABASE_URL || '';
const DEBOUNCE_MS   = 3000;

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(msg: string) {
  console.log(`[Graphify ${new Date().toISOString()}] ${msg}`);
}

function postWebhook(url: string, body: object, secret: string): Promise<void> {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const lib = url.startsWith('https') ? https : http;
    const u = new URL(url);
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-graphify-secret': secret,
      },
    }, (res) => {
      log(`Webhook response: ${res.statusCode}`);
      resolve();
    });
    req.on('error', (e) => {
      log(`Webhook error: ${e.message}`);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

// ─── 数据库连接 ───────────────────────────────────────────────────────────────

async function queryDB(sql: string, params: any[] = []): Promise<any[]> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

// ─── 核心编译逻辑 ─────────────────────────────────────────────────────────────

async function compile() {
  log('开始编译知识图谱...');
  ensureDir(OUTPUT_DIR);
  ensureDir(path.join(OUTPUT_DIR, 'wiki'));
  ensureDir(path.join(OUTPUT_DIR, 'cache'));

  try {
    // 1. 拉取所有活跃笔记
    const notes = await queryDB(`
      SELECT id, title, content, tags, category_id, category_name,
             vector_id, created_at
      FROM notes WHERE status = 'active'
      ORDER BY category_name, created_at DESC
    `);

    // 2. 拉取所有连线（排除用户已手动撤销的）
    const links = await queryDB(`
      SELECT nl.id, nl.note_id, nl.target_note_id,
             nl.relation_type, nl.relation_confidence,
             nl.similarity_score, nl.source_category_name
      FROM note_links nl
      WHERE nl.user_deleted = false
    `);

    log(`拉取到 ${notes.length} 篇笔记，${links.length} 条连线`);

    // 3. 构建 graph.json
    const nodes = notes.map((n: any) => ({
      id: n.id,
      title: n.title,
      categoryId: n.category_id,
      categoryName: n.category_name,
      tags: n.tags || [],
      linkCount: links.filter((l: any) => l.note_id === n.id || l.target_note_id === n.id).length,
      createdAt: n.created_at,
    }));

    const edges = links.map((l: any) => ({
      id: l.id,
      source: l.note_id,
      target: l.target_note_id,
      relationType: l.relation_type,
      relationConfidence: l.relation_confidence,
      similarityScore: l.similarity_score,
      sourceCategoryName: l.source_category_name,
    }));

    const graph = {
      generated_at: new Date().toISOString(),
      node_count: nodes.length,
      edge_count: edges.length,
      nodes,
      edges,
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'graph.json'),
      JSON.stringify(graph, null, 2),
      'utf-8'
    );
    log('graph.json 已生成');

    // 4. 按分类生成 wiki 综述 Markdown
    const categories = new Map<string, { name: string; notes: any[] }>();
    for (const note of notes) {
      if (!categories.has(note.category_id)) {
        categories.set(note.category_id, { name: note.category_name, notes: [] });
      }
      categories.get(note.category_id)!.notes.push(note);
    }

    for (const [catId, cat] of categories.entries()) {
      const wikiContent = buildWikiContent(cat.name, cat.notes, links);
      const safeFileName = cat.name.replace(/[\/\\:*?"<>|]/g, '_');
      const wikiPath = path.join(OUTPUT_DIR, 'wiki', `${safeFileName}.md`);
      fs.writeFileSync(wikiPath, wikiContent, 'utf-8');
      log(`Wiki 综述已生成: ${safeFileName}.md (${cat.notes.length} 篇)`);
    }

    // 5. 生成 GRAPH_REPORT.md
    const report = buildReport(graph);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'GRAPH_REPORT.md'), report, 'utf-8');

    // 6. 通知主应用同步
    await postWebhook(WEBHOOK_URL, {
      status: 'success',
      node_count: nodes.length,
      edge_count: edges.length,
      generated_at: graph.generated_at,
    }, WEBHOOK_SECRET);

    log(`编译完成 ✅ (${nodes.length} 节点, ${edges.length} 边)`);
  } catch (err: any) {
    log(`编译失败: ${err.message}`);
    console.error('[Graphify Compile Error Stack]', err);
    fs.appendFileSync(
      path.join(OUTPUT_DIR, 'error.log'),
      `[${new Date().toISOString()}] ${err.stack}\n`
    );
  }
}

// ─── Wiki 综述生成 ────────────────────────────────────────────────────────────

function buildWikiContent(categoryName: string, notes: any[], allLinks: any[]): string {
  const now = new Date().toISOString();
  const notesWithLinks = notes.map((note: any) => {
    const related = allLinks.filter(
      (l: any) => l.note_id === note.id || l.target_note_id === note.id
    );
    return { ...note, linkCount: related.length };
  });

  // 按关联数量排序，最有价值的节点排在前面
  notesWithLinks.sort((a: any, b: any) => b.linkCount - a.linkCount);

  let md = `# ${categoryName} · 知识综述\n\n`;
  md += `> 基于 **${notes.length}** 篇笔记自动提炼 · 更新于 ${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `---\n\n`;

  // 核心节点列表（关联最多的 Top 5）
  const topNodes = notesWithLinks.slice(0, 5);
  if (topNodes.length > 0) {
    md += `## 核心知识节点\n\n`;
    md += `> 以下笔记在知识网络中具有最高的关联密度，是该分类的核心支柱。\n\n`;
    for (const note of topNodes) {
      md += `### ${note.title}\n\n`;
      // 提取正文的第一个有实质内容的段落（去除 Markdown 标记）
      const firstPara = extractFirstParagraph(note.content);
      if (firstPara) md += `${firstPara}\n\n`;
      if (note.linkCount > 0) {
        md += `*关联密度：${note.linkCount} 条语义连线*\n\n`;
      }
    }
    md += `---\n\n`;
  }

  // 全部笔记目录（按时间倒序）
  const sortedByDate = [...notes].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  md += `## 全部笔记目录\n\n`;
  for (const note of sortedByDate) {
    const date = new Date(note.created_at).toLocaleDateString('zh-CN');
    const tags = (note.tags || []).map((t: string) => `#${t}`).join(' ');
    md += `- **${note.title}** · ${date}${tags ? `｜${tags}` : ''}\n`;
  }
  md += `\n---\n\n`;
  md += `*本文件由 Graphify 自动生成，请勿手动编辑。上次更新：${now}*\n`;

  return md;
}

function extractFirstParagraph(content: string): string {
  // 去除 Markdown 标题行和空行，找到第一段有内容的正文
  const lines = content.split('\n');
  const paragraphLines: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const clean = line.trim();
    if (clean.startsWith('#') || clean.startsWith('---') || clean === '') {
      if (inParagraph && paragraphLines.length > 0) break;
      continue;
    }
    // 去掉 Markdown 强调符号
    const text = clean.replace(/\*\*|__|\*|_|`/g, '').replace(/「|」|【|】/g, '');
    if (text.length > 10) {
      paragraphLines.push(text);
      inParagraph = true;
      if (paragraphLines.join('').length > 120) break;
    }
  }

  return paragraphLines.join(' ').substring(0, 200);
}

function buildReport(graph: any): string {
  const topNodes = [...graph.nodes]
    .sort((a: any, b: any) => b.linkCount - a.linkCount)
    .slice(0, 10);

  let report = `# 知识图谱报告\n\n`;
  report += `生成时间：${graph.generated_at}\n`;
  report += `节点总数：${graph.node_count}\n`;
  report += `边总数：${graph.edge_count}\n\n`;
  report += `## 核心节点 Top 10\n\n`;
  report += `| 标题 | 分类 | 关联数 |\n|---|---|---|\n`;
  for (const node of topNodes) {
    report += `| ${node.title.substring(0, 30)} | ${node.categoryName} | ${node.linkCount} |\n`;
  }
  return report;
}

// ─── 文件监听 + 防抖 ──────────────────────────────────────────────────────────

let debounceTimer: NodeJS.Timeout | null = null;

function scheduleCompile(reason: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  log(`检测到变化（${reason}），${DEBOUNCE_MS / 1000}秒后触发编译...`);
  debounceTimer = setTimeout(async () => {
    await compile();
  }, DEBOUNCE_MS);
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

async function main() {
  log(`Graphify Service 启动`);
  log(`监听目录: ${path.resolve(RAW_NOTES_DIR)}`);
  log(`输出目录: ${path.resolve(OUTPUT_DIR)}`);
  log(`Webhook: ${WEBHOOK_URL}`);

  ensureDir(RAW_NOTES_DIR);
  ensureDir(OUTPUT_DIR);

  // 启动时立即编译一次
  await compile();

  // 监听文件变化
  watch(RAW_NOTES_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      scheduleCompile(`${eventType}: ${filename}`);
    }
  });

  log('文件监听已启动，等待变化...');
}

main().catch((err) => {
  console.error('[Graphify FATAL]', err);
  process.exit(1);
});

import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('缺失 ANTHROPIC_API_KEY');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

interface GeneratedNote {
  title: string;
  content: string;
  tags: string[];
}

export async function generateNote(
  promptTemplate: string,
  inputText: string
): Promise<GeneratedNote> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    system: `${promptTemplate}

----
【输出规范】
TITLE: {标题}
TAGS: {标签1,标签2}
---
{Markdown正文}`,
    messages: [{ role: 'user', content: inputText }]
  });

  // 【核心修复】：智能提取所有文本块，过滤掉 Thinking 思考块
  let rawText = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as Anthropic.TextBlock).text) // typed
    .join('\n');

  if (!rawText) {
      // 容错：如果还是没拿到，尝试强制读取第一个块（兜底）
      const firstBlock = response.content[0]; // typed
      rawText = firstBlock && 'text' in firstBlock ? firstBlock.text : ''; // typed
  }

  if (!rawText) {
      throw new Error('AI 虽然返回了，但没有生成有效的文本内容（可能全是思考过程）');
  }

  // 自动化排版：中西文加空格
  const autoSpacedText = addPanguSpace(rawText);

  return parseClaudeResponse(autoSpacedText);
}

/**
 * 盘古之白：在中西文之间自动插入空格，提升阅读体验
 */
function addPanguSpace(text: string): string {
  return text
    .replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2')
    .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2');
}

function parseClaudeResponse(raw: string): GeneratedNote {
  let title = '无标题笔记';
  const titleMatch = raw.match(/TITLE:\s*(.*)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  let tags: string[] = [];
  const tagsMatch = raw.match(/TAGS:\s*(.*)/i);
  if (tagsMatch && tagsMatch[1]) {
    tags = tagsMatch[1].split(/[，,]/).map(t => t.trim()).filter(Boolean);
  }

  let content = '';
  const splitIndex = raw.indexOf('---');
  if (splitIndex !== -1) {
    content = raw.substring(splitIndex + 3).trim();
  } else {
    // 降级支持：即便没输出分割线，也尽量保留有用信息
    content = raw
        .replace(/TITLE:.*(\n|$)/i, '')
        .replace(/TAGS:.*(\n|$)/i, '')
        .trim();
  }

  return { title, tags, content };
}

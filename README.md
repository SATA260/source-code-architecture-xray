# 源码架构透视镜

给 Cursor 用的 skill。读完一个项目的源码后，在聊天旁边打开一份 Canvas，用来看懂这个项目怎么分层、模块之间怎么配合、哪几段逻辑值得细看。

## 安装

把这个仓库放到 Cursor 的个人 skills 目录，文件夹名保持为 `source-code-architecture-xray`：

```bash
git clone https://github.com/SATA260/source-code-architecture-xray.git \
  ~/.cursor/skills/source-code-architecture-xray
```

Cursor 读取的是 `SKILL.md`。`output_template.tsx` 是生成 Canvas 时要填的页面骨架。`skill_config.md` 是同一套约束的简写，方便改规则时对照。

装好后新开一个对话即可。

## 怎么用

在要阅读的项目里说：

- 帮我阅读这段源码
- 帮我了解这个开源项目
- 拆解一下 XX 库/项目
- 分析 XX 项目架构

生成结果是一份 `.canvas.tsx`，聊天里只留链接。分层、例子条数、关键逻辑段数都按这个项目的实际情况来，不照搬模板。

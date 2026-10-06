import {
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Table,
  Text,
  useHostTheme,
  useState,
} from "cursor/canvas";

/**
 * 架构页骨架。生成时整份拷到 canvases/<project>-architecture.canvas.tsx，
 * 把占位换成该项目的事实。没有的段删掉。名词遵守 SKILL.md。
 * 功能表要有作用。图下按方法写上下文。非关键逻辑也留短流程。
 * 不要把模板里的占位算法原样抄进目标项目。
 */

type SmallModule = { name: string; hint: string };
type BigModule = { name: string; hint: string; children?: SmallModule[] };
type Layer = { name: string; modules: BigModule[] };

type Api = { method: string; description: string; when: string; input: string; output: string };
type CallStep = { method: string; action: string; detail: string };
type ChainStep = { module: string; handoff: string };

// 以下分层只是占位示例，生成时必须根据真实项目调整，不要照搬。层数和层名都由项目本身决定。
const LAYERS: Layer[] = [
  {
    name: "接入 / 终端",
    modules: [
      { name: "CLI", hint: "一句人话：这个入口接什么。" },
      { name: "Web", hint: "一句人话：这个入口接什么。" },
      { name: "Mobile", hint: "一句人话：这个入口接什么。" },
    ],
  },
  {
    name: "客户端后端 / BFF",
    modules: [
      { name: "Web API", hint: "一句人话：给前端聚合什么能力。" },
      { name: "Desktop API", hint: "一句人话：给桌面端聚合什么能力。" },
    ],
  },
  {
    name: "服务端后端",
    modules: [
      {
        name: "agent",
        hint: "一句人话：这个模块做什么。",
        children: [
          { name: "runtime", hint: "一句人话。" },
          { name: "agent tool", hint: "一句人话。" },
          { name: "MCP", hint: "一句人话。" },
          { name: "skill", hint: "一句人话。" },
        ],
      },
    ],
  },
  {
    name: "守护进程 / 运行时",
    modules: [{ name: "daemon", hint: "一句人话：在用户机器上跑什么。" }],
  },
  {
    name: "基础设施",
    modules: [
      { name: "数据库", hint: "一句人话：存什么。" },
      { name: "缓存", hint: "一句人话：加速什么。" },
      { name: "对象存储", hint: "一句人话：存什么大文件。" },
    ],
  },
];

const NAV = [
  { id: "mod-agent", label: "agent" },
  { id: "mod-auth", label: "登录鉴权" },
];

const MODULE_APIS: Api[] = [
  {
    method: "方法名",
    description: "这个方法在业务里具体做成了什么。不要只重复方法名。",
    when: "什么时候被调用",
    input: "关键输入",
    output: "关键输出",
  },
];

const CALL_STEPS: CallStep[] = [
  {
    method: "方法名",
    action: "盒内的一句话说明",
    detail: "上一步产生了什么结果，这个方法做了什么，下一步把什么交给谁。没看过项目的人也要能看懂。",
  },
  {
    method: "下一个方法",
    action: "盒内的一句话说明",
    detail: "承接上一步的结果，说明这一步为什么接着发生。",
  },
];

const AUTH_STEPS: CallStep[] = [
  {
    method: "方法名",
    action: "盒内的一句话说明",
    detail: "非关键逻辑同样要讲流程：这一步确认了什么，通过之后请求才能继续。",
  },
];

const CHAIN: ChainStep[] = [
  { module: "模块", handoff: "交给下一模块的东西" },
  { module: "模块", handoff: "交给下一模块的东西" },
];

const PSEUDO = `// check 做边界判定和参数校验。不通过就返回，后面不再展开。
func check(in Input) error {
    return nil
}

// core 只写核心算法：数据如何划分、冲突如何避开、状态如何推进。
func core(in Input) Result {
    return Result{}
}`;

// 真实例子的数量由项目本身决定：可能只有 1 个，也可能有 2 个、3 个或更多。不要固定成两条。
const EXAMPLES = [
  {
    title: "3.1 真实例子的名字",
    steps: CHAIN,
    notes: ["模块 A 在这个例子里做什么。", "模块 B 在这个例子里做什么。这里不写方法名。"],
  },
  {
    title: "3.2 另一个真实例子",
    steps: CHAIN,
    notes: ["这个例子里，第一个模块做什么。", "下一个模块接过来做什么。"],
  },
];

// 关键逻辑的数量也由项目本身决定：大多数时候不止两段，也可能只有一段。按实际值得细看的内容列，不要凑数。
const LOGICS = [
  {
    title: "4.1 这段逻辑在解决什么",
    why: "为什么值得单独看。不要复述上面的流程。",
    code: PSEUDO,
  },
  {
    title: "4.2 另一段关键逻辑",
    why: "还有一段值得单独看的算法时，按序号继续往下排。",
    code: PSEUDO,
  },
];

function Box({
  name,
  hint,
  onHover,
}: {
  name: string;
  hint: string;
  onHover: (hint: string) => void;
}) {
  const theme = useHostTheme();
  return (
    <div
      title={hint}
      onMouseEnter={() => onHover(hint)}
      style={{
        border: `1px solid ${theme.stroke.secondary}`,
        background: theme.bg.elevated,
        borderRadius: 6,
        padding: "6px 8px",
      }}
    >
      <Text size="small">{name}</Text>
    </div>
  );
}

function ModuleFrame({
  mod,
  onHover,
}: {
  mod: BigModule;
  onHover: (hint: string) => void;
}) {
  const theme = useHostTheme();
  return (
    <div
      title={mod.hint}
      onMouseEnter={() => onHover(mod.hint)}
      style={{
        border: `1px solid ${theme.stroke.secondary}`,
        background: theme.fill.tertiary,
        borderRadius: 6,
        padding: 10,
      }}
    >
      <Stack gap={8}>
        <Text weight="semibold">{mod.name}</Text>
        {mod.children ? (
          <Row gap={6} wrap>
            {mod.children.map((child) => (
              <Box key={child.name} name={child.name} hint={child.hint} onHover={onHover} />
            ))}
          </Row>
        ) : null}
      </Stack>
    </div>
  );
}

function ArchitectureMap() {
  const [hint, setHint] = useState("将鼠标悬停在模块上，查看它的作用。");
  return (
    <Stack gap={8}>
      {LAYERS.map((layer) => (
        <Stack key={layer.name} gap={8}>
          <Text tone="secondary" size="small">
            {layer.name}
          </Text>
          <Row gap={8} wrap align="start">
            {layer.modules.map((mod) => (
              <ModuleFrame key={mod.name} mod={mod} onHover={setHint} />
            ))}
          </Row>
        </Stack>
      ))}
      <Text tone="secondary">{hint}</Text>
    </Stack>
  );
}

function CallFlow({ steps }: { steps: CallStep[] }) {
  const theme = useHostTheme();
  const boxW = 280;
  const boxH = 36;
  const gap = 14;
  const height = steps.length * boxH + (steps.length - 1) * gap;
  return (
    <svg width={boxW} height={height} viewBox={`0 0 ${boxW} ${height}`} role="img" aria-label="方法调用">
      {steps.map((step, index) => {
        const y = index * (boxH + gap);
        return (
          <g key={`${step.method}-${index}`}>
            {index < steps.length - 1 ? (
              <line
                x1={boxW / 2}
                y1={y + boxH}
                x2={boxW / 2}
                y2={y + boxH + gap}
                stroke={theme.stroke.primary}
              />
            ) : null}
            <rect x={0} y={y} width={boxW} height={boxH} rx={6} fill={theme.fill.tertiary} stroke={theme.stroke.secondary} />
            <text x={10} y={y + 14} fill={theme.text.primary} fontSize={11}>
              {step.method}
            </text>
            <text x={10} y={y + 28} fill={theme.text.secondary} fontSize={10}>
              {step.action}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChainFlow({ steps }: { steps: ChainStep[] }) {
  const theme = useHostTheme();
  const boxW = 280;
  const boxH = 36;
  const gap = 28;
  const height = steps.length * boxH + (steps.length - 1) * gap;
  return (
    <svg width={boxW} height={height} viewBox={`0 0 ${boxW} ${height}`} role="img" aria-label="模块串联">
      {steps.map((step, index) => {
        const y = index * (boxH + gap);
        return (
          <g key={`${step.module}-${index}`}>
            {index < steps.length - 1 ? (
              <g>
                <line
                  x1={boxW / 2}
                  y1={y + boxH}
                  x2={boxW / 2}
                  y2={y + boxH + gap}
                  stroke={theme.stroke.primary}
                />
                <text x={boxW / 2 + 8} y={y + boxH + gap / 2} fill={theme.text.tertiary} fontSize={11}>
                  {step.handoff}
                </text>
              </g>
            ) : null}
            <rect x={0} y={y} width={boxW} height={boxH} rx={6} fill={theme.fill.tertiary} stroke={theme.stroke.secondary} />
            <text x={boxW / 2} y={y + boxH / 2} textAnchor="middle" dominantBaseline="middle" fill={theme.text.primary} fontSize={12}>
              {step.module}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ArchitectureXrayTemplate() {
  const theme = useHostTheme();
  const [index, setIndex] = useState(0);
  const count = NAV.length;

  return (
    <Stack gap={28} style={{ padding: 24 }}>
      <Stack gap={8}>
        <H1>1. 项目名</H1>
        <Text weight="semibold">没有它之前，读源码卡在哪里；有了它之后，这件事变成了什么样。</Text>
        <Grid columns={2} gap={24}>
          <Stack gap={4}>
            <H3>谁在用</H3>
            <Text tone="secondary">谁会向系统提交什么。</Text>
          </Stack>
          <Stack gap={4}>
            <H3>它依靠什么</H3>
            <Text tone="secondary">数据存在哪里，由谁执行，结果返回到哪里。</Text>
          </Stack>
        </Grid>
      </Stack>

      <Stack gap={12}>
        <H2>2. 业务模块</H2>
        <ArchitectureMap />
        <Row gap={8} wrap>
          {NAV.map((item, itemIndex) => (
            <Pill key={item.id} active={itemIndex === index} onClick={() => setIndex(itemIndex)}>
              {item.label}
            </Pill>
          ))}
        </Row>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              width: `${count * 100}%`,
              transform: `translateX(-${index * (100 / count)}%)`,
              transition: "transform 280ms ease",
            }}
          >
            <div style={{ width: `${100 / count}%`, flexShrink: 0 }}>
              <Stack gap={8}>
                <H3>agent</H3>
                <Text>这个模块在业务中解决什么问题。</Text>
                <Table
                  headers={["方法", "说明", "触发时机", "输入", "输出"]}
                  rows={MODULE_APIS.map((api) => [api.method, api.description, api.when, api.input, api.output])}
                  striped
                />
                <Text weight="semibold">agent tool</Text>
                <Text tone="secondary">这个子模块承担什么职责。</Text>
                <CallFlow steps={CALL_STEPS} />
                <Stack gap={4}>
                  {CALL_STEPS.map((step) => (
                    <Text key={step.method} tone="secondary">
                      {step.method}：{step.detail}
                    </Text>
                  ))}
                </Stack>
                <Text weight="semibold">内部流转过程</Text>
                <Text>用户输入文字，拼接上下文，加载 skill，进入 agent loop，输出回答。</Text>
                <CallFlow steps={CALL_STEPS} />
                <Stack gap={4}>
                  {CALL_STEPS.map((step) => (
                    <Text key={`${step.method}-flow`} tone="secondary">
                      {step.method}：{step.detail}
                    </Text>
                  ))}
                </Stack>
              </Stack>
            </div>
            <div style={{ width: `${100 / count}%`, flexShrink: 0 }}>
              <Stack gap={8}>
                <H3>登录鉴权</H3>
                <Text>非关键逻辑不写伪代码，但流程仍要按方法讲清楚。</Text>
                <CallFlow steps={AUTH_STEPS} />
                <Stack gap={4}>
                  {AUTH_STEPS.map((step) => (
                    <Text key={step.method} tone="secondary">
                      {step.method}：{step.detail}
                    </Text>
                  ))}
                </Stack>
              </Stack>
            </div>
          </div>
        </div>
      </Stack>

      <Stack gap={20}>
        <H2>3. 模块如何协同</H2>
        {EXAMPLES.map((example) => (
          <Stack key={example.title} gap={12}>
            <H3>{example.title}</H3>
            <Grid columns="minmax(0, 420px) minmax(0, 1fr)" gap={20} align="stretch">
              <ChainFlow steps={example.steps} />
              <Stack gap={28} style={{ justifyContent: "space-between" }}>
                {example.notes.map((note) => (
                  <Text key={note} tone="secondary" style={{ minHeight: 36, display: "flex", alignItems: "center" }}>
                    {note}
                  </Text>
                ))}
              </Stack>
            </Grid>
          </Stack>
        ))}
      </Stack>

      <Stack gap={20}>
        <H2>4. 值得细看的关键逻辑</H2>
        {LOGICS.map((logic) => (
          <Stack key={logic.title} gap={8}>
            <H3>{logic.title}</H3>
            <Text>{logic.why}</Text>
            <pre
              style={{
                margin: 0,
                padding: 16,
                background: theme.bg.elevated,
                color: theme.text.primary,
                border: `1px solid ${theme.stroke.secondary}`,
                borderRadius: 8,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {logic.code}
            </pre>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

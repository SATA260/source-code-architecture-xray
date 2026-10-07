import {
  CollapsibleSection,
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
 * 全文从宏观到微观：1 项目介绍，2 模块如何协同（总体业务，只到模块），3 业务模块（方法），4 关键逻辑。
 * 第 1 节写实现了什么、解决什么问题、实际场景。不写调用顺序。
 * 架构图是一个大方块，层、模块、能力逐层套小方块，同一层等宽。点击方块展开作用，再点收起。
 * 有判断就用 nodes 和 edges 画分叉：条件写在列顶，汇合只画一次，回路写「再回到某某」。一条路走到底才用 steps。
 * 说明第一句加粗并用强调色，后面用次要色。不要用「背景：」「要达到的效果：」起头。
 * 「内部怎么做」默认收起。业务模块详情区固定高度，内部滚动，底边可拖高。
 * 伪代码里校验方法体不展开，核心方法每个分支都要有注释。不要把这里的占位算法抄进目标项目。
 * Canvas 没有 Mermaid，不要外链脚本。
 */

type SmallModule = { name: string; hint: string; detail: string };
type BigModule = { name: string; hint: string; detail: string; children?: SmallModule[] };
type Layer = { name: string; modules: BigModule[] };

type Api = { method: string; description: string; when: string; input: string; output: string };
type CallStep = { method: string; action: string; detail: string; inside: string };
type FlowNode = {
  id: string;
  title: string;
  subtitle?: string;
  note: string;
  inside?: string;
  kind?: "step" | "decision";
};
type FlowEdge = { from: string; to: string; label?: string };
type Flow = {
  title: string;
  background: string;
  steps?: CallStep[];
  nodes?: FlowNode[];
  edges?: FlowEdge[];
};
type ChainStep = { module: string; handoff: string };
type ModuleDoc = {
  id: string;
  label: string;
  title: string;
  summary: string;
  apis: Api[];
  flows: Flow[];
};

// 以下分层只是占位。层数和层名按真实项目改，不要照搬。每个方块都要有 detail，点开后写它的作用。
const LAYERS: Layer[] = [
  {
    name: "接入 / 终端",
    modules: [
      {
        name: "CLI",
        hint: "这个入口接什么。",
        detail: "这个入口负责什么。后面写它接到谁、交给谁，默认路径和不走的旁路。",
        children: [
          { name: "交互", hint: "人在终端里做什么。", detail: "交互时这句话怎么进会话，屏幕画的是什么。斜杠命令如果就地处理，也写在这里。" },
          { name: "脚本", hint: "没有界面时怎么跑完。", detail: "不建界面时，一轮怎么跑完、结果写到哪里。适合什么调用方。" },
        ],
      },
      { name: "Web", hint: "这个入口接什么。", detail: "这个入口和 CLI 共用什么，界面差异在哪里。" },
    ],
  },
  {
    name: "服务端后端",
    modules: [
      {
        name: "agent",
        hint: "这个模块做成什么。",
        detail: "这个模块在业务里解决什么。第一句写作用，后面写它接到什么、交给谁。",
        children: [
          { name: "runtime", hint: "循环在保证什么。", detail: "一轮里什么时候继续问模型，什么时候停。插话插在哪两个步骤之间。" },
          { name: "agent tool", hint: "工具改的是什么。", detail: "工具什么时候真的改工作区，结果怎样回到对话。失败时停在哪里。" },
        ],
      },
    ],
  },
  {
    name: "基础设施",
    modules: [
      { name: "数据库", hint: "存什么。", detail: "这里持久化什么，崩溃之后靠什么接上。普通路径如果不经过它，要写明。" },
      { name: "缓存", hint: "加速什么。", detail: "缓存挡住的是哪一次重复读取，失效之后回到哪里。" },
    ],
  },
];

const MODULE_APIS: Api[] = [
  {
    method: "方法名",
    description: "这个方法在业务里做成了什么。不要只重复方法名。",
    when: "什么时候被调用",
    input: "关键输入",
    output: "关键输出",
  },
];

const CALL_NODES: FlowNode[] = [
  {
    id: "start",
    title: "方法名",
    subtitle: "盒内短述",
    note: "这一步在这件事里做成什么。没看过项目的人也要能看懂。",
    inside: "内部怎么判断、成立后状态变成什么样。默认收起，不要把这段摊在作用那一行。",
  },
  {
    id: "gate",
    title: "判断什么",
    subtitle: "两条去向",
    note: "这里要分叉。看成一条路，就会漏掉提前结束的那一支。",
    inside: "成立和不成立各看什么，状态分别变成什么样。",
    kind: "decision",
  },
  {
    id: "yes",
    title: "成立时的方法",
    subtitle: "继续",
    note: "成立后状态变成什么样，再交给谁。",
    inside: "成立时具体怎么推进。",
  },
  {
    id: "no",
    title: "不成立时结束",
    subtitle: "停在这里",
    note: "不成立就停在这里，不再往下做。",
    inside: "不成立时停在哪里，不会再发生什么。",
  },
];

const CALL_EDGES: FlowEdge[] = [
  { from: "start", to: "gate" },
  { from: "gate", to: "yes", label: "成立" },
  { from: "gate", to: "no", label: "不成立" },
];

const AUTH_STEPS: CallStep[] = [
  {
    method: "方法名",
    action: "盒内短述",
    detail: "非关键逻辑同样要讲流程。这一步确认了什么。通过之后请求才能继续。",
    inside: "通过时状态变成什么样，不通过时停在哪里。",
  },
];

const CHAIN: ChainStep[] = [
  { module: "模块", handoff: "交给下一模块的东西" },
  { module: "模块", handoff: "交给下一模块的东西" },
];

const PSEUDO = `// check 挡掉不能进入核心算法的输入。方法体不展开。
// 挡的是：参数不合法，或这条数据不属于本次划分。
// 挡住之后：不分配队列，也不推进状态。
func check(in Input) error {
    return nil
}

// core 只写核心算法。key 决定这条消息进哪一条本地队列。
func core(in Input) Result {
    // 按 key 划分：同一个 key 的消息进同一条队列，不同 key 不会抢同一条。
    queue := shard(in.Key)
    // 每个队列只有一个消费者，所以同一条消息不会被两个线程同时写。
    queue.push(in)
    return Result{}
}`;

const EXAMPLES = [
  {
    title: "2.1 真实例子的名字",
    background: "这个例子在什么情况下发生。模块接完之后要保证什么。中间如果有人改错东西，会错成什么样。",
    steps: CHAIN,
    notes: ["这个模块在这件事里做成什么。这里不写方法名。", "下一个模块接过来做成什么，再交给谁。"],
    insides: ["这个模块在这件事里具体怎么处理。展开后才读，不写方法名。", "接到上一个模块的东西之后怎么处理，再交出什么。"],
  },
  {
    title: "2.2 另一个真实例子",
    background: "另一个真实场景。这条链路做完保证什么。",
    steps: CHAIN,
    notes: ["这个例子里，第一个模块做成什么。", "下一个模块接过来做成什么。"],
    insides: ["这个模块具体怎么处理。", "下一个模块具体怎么接。"],
  },
];

const LOGICS = [
  {
    title: "4.1 这段逻辑在解决什么",
    why: "这段逻辑处在什么场景，不管它会错成什么样。做完之后保证什么。",
    code: PSEUDO,
  },
  {
    title: "4.2 另一段关键逻辑",
    why: "还有一段独立算法时，写它处在什么场景。做完之后保证什么。没有第二段就删掉这一条。",
    code: PSEUDO,
  },
];

const MODULES: ModuleDoc[] = [
  {
    id: "mod-agent",
    label: "agent",
    title: "agent",
    summary: "这个模块在业务里解决什么。后面写它接到什么、交给谁。",
    apis: MODULE_APIS,
    flows: [
      {
        title: "有判断时怎么走",
        background: "这段流程处在什么场景。看错顺序会误以为什么。做完之后要保证什么。",
        nodes: CALL_NODES,
        edges: CALL_EDGES,
      },
    ],
  },
  {
    id: "mod-auth",
    label: "登录鉴权",
    title: "登录鉴权",
    summary: "非关键逻辑不写伪代码，但流程仍要按方法讲清楚。",
    apis: MODULE_APIS,
    flows: [
      {
        title: "一条路走到底的例子",
        background: "没有分叉时才排成直线。这里写清场景，以及做完要保证什么。",
        steps: AUTH_STEPS,
      },
    ],
  },
];

function layerSpan(layer: Layer): number {
  if (layer.modules.length >= 3) return 3;
  const children = layer.modules.reduce((count, mod) => count + (mod.children?.length ?? 0), 0);
  if (layer.modules.length === 1 && children >= 3) return 2;
  if (layer.modules.length === 1 && children <= 1) return 1;
  return 3;
}

function Box({
  name,
  hint,
  selected,
  onSelect,
}: {
  name: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useHostTheme();
  return (
    <div
      title={hint}
      onClick={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onSelect();
      }}
      style={{
        border: `1px solid ${selected ? theme.accent.primary : theme.stroke.tertiary}`,
        background: theme.bg.elevated,
        borderRadius: 6,
        minHeight: 44,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        cursor: "pointer",
      }}
    >
      <span style={{ color: theme.text.primary, fontSize: 13, lineHeight: 1.35 }}>{name}</span>
    </div>
  );
}

function ModuleFrame({
  mod,
  selectedName,
  onSelect,
}: {
  mod: BigModule;
  selectedName: string | null;
  onSelect: (name: string) => void;
}) {
  const theme = useHostTheme();
  const selected = selectedName === mod.name;
  return (
    <div
      title={mod.hint}
      onClick={() => onSelect(mod.name)}
      style={{
        height: "100%",
        boxSizing: "border-box",
        border: `1px solid ${selected ? theme.accent.primary : theme.stroke.secondary}`,
        background: theme.fill.tertiary,
        borderRadius: 8,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
        cursor: "pointer",
      }}
    >
      <div style={{ color: theme.text.primary, fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{mod.name}</div>
      {mod.children ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${mod.children.length}, minmax(0, 1fr))`,
            gap: 8,
            flex: 1,
          }}
        >
          {mod.children.map((child) => (
            <Box
              key={child.name}
              name={child.name}
              hint={child.hint}
              selected={selectedName === child.name}
              onSelect={() => onSelect(child.name)}
            />
          ))}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
    </div>
  );
}

function layerSelection(layer: Layer, name: string | null): { name: string; detail: string } | null {
  if (!name) return null;
  for (const mod of layer.modules) {
    if (mod.name === name) return { name: mod.name, detail: mod.detail };
    for (const child of mod.children ?? []) {
      if (child.name === name) return { name: child.name, detail: child.detail };
    }
  }
  return null;
}

function ArchitectureMap() {
  const theme = useHostTheme();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const toggle = (name: string) => {
    setSelectedName((current) => (current === name ? null : name));
  };
  return (
    <Stack gap={10}>
      <div
        style={{
          border: `1px solid ${theme.stroke.secondary}`,
          borderRadius: 10,
          background: theme.bg.editor,
          padding: 14,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {LAYERS.map((layer) => {
            const picked = layerSelection(layer, selectedName);
            return (
              <div
                key={layer.name}
                style={{
                  gridColumn: `span ${layerSpan(layer)}`,
                  border: `1px solid ${theme.stroke.tertiary}`,
                  borderRadius: 8,
                  background: theme.fill.quaternary,
                  padding: 10,
                  minWidth: 0,
                }}
              >
                <div style={{ color: theme.accent.primary, fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                  {layer.name}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${layer.modules.length}, minmax(0, 1fr))`,
                    gap: 10,
                    alignItems: "stretch",
                  }}
                >
                  {layer.modules.map((mod) => (
                    <ModuleFrame key={mod.name} mod={mod} selectedName={selectedName} onSelect={toggle} />
                  ))}
                </div>
                {picked ? (
                  <div
                    style={{
                      marginTop: 10,
                      border: `1px solid ${theme.accent.primary}`,
                      borderRadius: 8,
                      background: theme.fill.tertiary,
                      padding: 12,
                    }}
                  >
                    <div style={{ color: theme.text.primary, fontSize: 16, fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>
                      {picked.name}
                    </div>
                    <Point text={picked.detail} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <Text tone="secondary">点击方块，展开这个模块是做什么的。再点一次收起。</Text>
    </Stack>
  );
}

function leadAndRest(note: string): { lead: string; rest: string } {
  const splitAt = note.indexOf("。");
  if (splitAt < 0) return { lead: note, rest: "" };
  return { lead: note.slice(0, splitAt + 1), rest: note.slice(splitAt + 1).trim() };
}

function Point({ text, size = 16 }: { text: string; size?: number }) {
  const theme = useHostTheme();
  const { lead, rest } = leadAndRest(text);
  return (
    <div>
      <Text weight="semibold" style={{ fontSize: size, lineHeight: 1.6, color: theme.accent.primary }}>
        {lead}
      </Text>
      {rest ? (
        <Text tone="secondary" style={{ fontSize: size, lineHeight: 1.6 }}>
          {rest}
        </Text>
      ) : null}
    </div>
  );
}

function AlignedFlow({
  steps,
  nodeWidth,
}: {
  steps: { title: string; subtitle?: string; note: string; inside?: string; handoff?: string }[];
  nodeWidth: number;
}) {
  const theme = useHostTheme();
  return (
    <Stack gap={0}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const connectorH = step.handoff ? 36 : 18;
        return (
          <div key={`${step.title}-${index}`}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `${nodeWidth}px minmax(0, 1fr)`,
                columnGap: 28,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  border: `1px solid ${theme.stroke.secondary}`,
                  background: theme.fill.tertiary,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ color: theme.text.primary, fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>
                  {step.title}
                </div>
                {step.subtitle ? (
                  <div style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 1.35, marginTop: 2 }}>
                    {step.subtitle}
                  </div>
                ) : null}
              </div>
              <Point text={step.note} />
            </div>
            {step.inside ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${nodeWidth}px minmax(0, 1fr)`,
                  columnGap: 28,
                  marginTop: 2,
                }}
              >
                <div />
                <CollapsibleSection title="内部怎么做">
                  <Text tone="secondary" style={{ fontSize: 16, lineHeight: 1.65 }}>
                    {step.inside}
                  </Text>
                </CollapsibleSection>
              </div>
            ) : null}
            {isLast ? null : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${nodeWidth}px minmax(0, 1fr)`,
                  columnGap: 28,
                  minHeight: connectorH,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", paddingLeft: 24 }}>
                  <div style={{ width: 1, alignSelf: "stretch", background: theme.stroke.primary }} />
                  {step.handoff ? (
                    <span style={{ marginLeft: 12, color: theme.text.tertiary, fontSize: 13 }}>{step.handoff}</span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Stack>
  );
}

function NoteBlock({ note, inside }: { note: string; inside?: string }) {
  return (
    <div>
      <Point text={note} />
      {inside ? (
        <div style={{ marginTop: 2 }}>
          <CollapsibleSection title="内部怎么做">
            <Text tone="secondary" style={{ fontSize: 16, lineHeight: 1.65 }}>
              {inside}
            </Text>
          </CollapsibleSection>
        </div>
      ) : null}
    </div>
  );
}

function FlowBox({
  node,
}: {
  node: { title: string; subtitle?: string; kind?: "step" | "decision" };
}) {
  const theme = useHostTheme();
  const decision = node.kind === "decision";
  return (
    <div
      style={{
        border: `1px solid ${decision ? theme.accent.primary : theme.stroke.secondary}`,
        background: theme.fill.tertiary,
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      {decision ? (
        <div style={{ color: theme.accent.primary, fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>判断</div>
      ) : null}
      <div style={{ color: theme.text.primary, fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>{node.title}</div>
      {node.subtitle ? (
        <div style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 1.35, marginTop: 2 }}>{node.subtitle}</div>
      ) : null}
    </div>
  );
}

type FlowGraph = {
  byId: Map<string, FlowNode>;
  outs: Map<string, FlowEdge[]>;
  joins: Set<string>;
  backsFrom: Map<string, FlowEdge[]>;
  attach: Map<string, string[]>;
};

function findBackEdges(nodes: FlowNode[], edges: FlowEdge[]): Set<string> {
  const adj = new Map<string, FlowEdge[]>();
  for (const node of nodes) adj.set(node.id, []);
  for (const edge of edges) adj.get(edge.from)?.push(edge);
  const color = new Map<string, "white" | "gray" | "black">();
  const backs = new Set<string>();
  const visit = (id: string) => {
    color.set(id, "gray");
    for (const edge of adj.get(id) ?? []) {
      const state = color.get(edge.to) ?? "white";
      if (state === "gray") backs.add(`${edge.from}>${edge.to}`);
      else if (state === "white") visit(edge.to);
    }
    color.set(id, "black");
  };
  const incoming = new Map<string, number>();
  for (const node of nodes) incoming.set(node.id, 0);
  for (const edge of edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  for (const node of nodes) {
    if ((incoming.get(node.id) ?? 0) === 0) visit(node.id);
  }
  for (const node of nodes) {
    if ((color.get(node.id) ?? "white") === "white") visit(node.id);
  }
  return backs;
}

function buildFlowGraph(nodes: FlowNode[], edges: FlowEdge[]): FlowGraph {
  const backs = findBackEdges(nodes, edges);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const forward = edges.filter((edge) => !backs.has(`${edge.from}>${edge.to}`));
  const outs = new Map<string, FlowEdge[]>();
  const indeg = new Map<string, number>();
  for (const node of nodes) {
    outs.set(node.id, []);
    indeg.set(node.id, 0);
  }
  for (const edge of forward) {
    outs.get(edge.from)?.push(edge);
    indeg.set(edge.to, (indeg.get(edge.to) ?? 0) + 1);
  }
  const joins = new Set([...indeg.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  const parent = new Map<string, string>();
  for (const edge of forward) {
    if (!joins.has(edge.to)) parent.set(edge.to, edge.from);
  }
  const ancestorsOf = (id: string): string[] => {
    const list: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = id;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      list.push(cur);
      cur = parent.get(cur);
    }
    return list;
  };
  const lca = (ids: string[]): string | undefined => {
    if (ids.length === 0) return undefined;
    const sets = ids.map((id) => new Set(ancestorsOf(id)));
    for (const candidate of ancestorsOf(ids[0])) {
      if (sets.every((set) => set.has(candidate))) return candidate;
    }
    return undefined;
  };
  const attach = new Map<string, string[]>();
  for (const joinId of joins) {
    const sources = forward.filter((edge) => edge.to === joinId).map((edge) => edge.from);
    const at = lca(sources);
    if (!at || at === joinId) continue;
    const list = attach.get(at) ?? [];
    list.push(joinId);
    attach.set(at, list);
  }
  const backsFrom = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    if (!backs.has(`${edge.from}>${edge.to}`)) continue;
    const list = backsFrom.get(edge.from) ?? [];
    list.push(edge);
    backsFrom.set(edge.from, list);
  }
  return { byId, outs, joins, backsFrom, attach };
}

function subtreeBranches(graph: FlowGraph, id: string, seen: Set<string>): boolean {
  if (seen.has(id) || graph.joins.has(id)) return false;
  seen.add(id);
  const next = graph.outs.get(id) ?? [];
  if (next.length > 1) return true;
  if ((graph.attach.get(id) ?? []).length > 0) return true;
  return next.some((edge) => subtreeBranches(graph, edge.to, seen));
}

function LoopNotes({ edges, byId }: { edges: FlowEdge[]; byId: Map<string, FlowNode> }) {
  const theme = useHostTheme();
  if (edges.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      {edges.map((edge) => (
        <div key={`${edge.from}-${edge.to}`} style={{ color: theme.accent.primary, fontSize: 13, lineHeight: 1.45 }}>
          再回到「{byId.get(edge.to)?.title ?? edge.to}」
        </div>
      ))}
    </div>
  );
}

function JoinStub({ title }: { title: string }) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        border: `1px dashed ${theme.stroke.primary}`,
        borderRadius: 8,
        padding: "10px 12px",
        color: theme.text.secondary,
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      接到下面的「{title}」
    </div>
  );
}

function FlowArrow({ label, wide }: { label?: string; wide: boolean }) {
  const theme = useHostTheme();
  return (
    <div style={wide ? { width: 240 } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: label ? 28 : 18, padding: "2px 0 2px 22px" }}>
        <div style={{ width: 1, alignSelf: "stretch", background: theme.stroke.primary }} />
        {label ? <span style={{ color: theme.text.tertiary, fontSize: 13, lineHeight: 1.4 }}>{label}</span> : null}
      </div>
    </div>
  );
}

function FlowStep({
  node,
  wide,
  loops,
  byId,
}: {
  node: FlowNode;
  wide: boolean;
  loops: FlowEdge[];
  byId: Map<string, FlowNode>;
}) {
  const box = (
    <div>
      <FlowBox node={node} />
      <LoopNotes edges={loops} byId={byId} />
    </div>
  );
  if (!wide) {
    return (
      <Stack gap={8}>
        {box}
        <NoteBlock note={node.note} inside={node.inside} />
      </Stack>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", columnGap: 24, alignItems: "center" }}>
      {box}
      <NoteBlock note={node.note} inside={node.inside} />
    </div>
  );
}

function MergeCaption({ joinId, graph }: { joinId: string; graph: FlowGraph }) {
  const theme = useHostTheme();
  const sources: string[] = [];
  for (const [from, edges] of graph.outs) {
    for (const edge of edges) {
      if (edge.to !== joinId) continue;
      const title = graph.byId.get(from)?.title ?? from;
      sources.push(edge.label ? `${title}（${edge.label}）` : title);
    }
  }
  return (
    <div style={{ color: theme.text.tertiary, fontSize: 13, lineHeight: 1.45, marginTop: 12, marginBottom: 6 }}>
      从{sources.join("、")}汇合过来
    </div>
  );
}

function BranchColumns({
  edges,
  graph,
  trail,
}: {
  edges: FlowEdge[];
  graph: FlowGraph;
  trail: string[];
}) {
  const theme = useHostTheme();
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
      <div style={{ display: "flex", flexWrap: "nowrap", gap: 16, width: "max-content", alignItems: "flex-start" }}>
        {edges.map((edge) => {
          const title = graph.byId.get(edge.to)?.title ?? edge.to;
          const grow = !graph.joins.has(edge.to) && subtreeBranches(graph, edge.to, new Set());
          return (
            <div
              key={`${edge.from}-${edge.to}-${edge.label ?? ""}`}
              style={{
                flex: "0 0 auto",
                width: grow ? undefined : 260,
                minWidth: 220,
                borderTop: `2px solid ${theme.stroke.primary}`,
                paddingTop: 8,
                paddingRight: 8,
              }}
            >
              <div style={{ color: theme.accent.primary, fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                {edge.label ?? "继续"}
              </div>
              {graph.joins.has(edge.to) ? (
                <JoinStub title={title} />
              ) : (
                <FlowTree id={edge.to} graph={graph} wide={false} asJoin={false} trail={trail} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowTree({
  id,
  graph,
  wide,
  asJoin,
  trail,
}: {
  id: string;
  graph: FlowGraph;
  wide: boolean;
  asJoin: boolean;
  trail: string[];
}) {
  const node = graph.byId.get(id);
  if (!node) return null;
  if (trail.includes(id)) return <JoinStub title={node.title} />;
  if (graph.joins.has(id) && !asJoin) return <JoinStub title={node.title} />;
  const next = graph.outs.get(id) ?? [];
  const attached = graph.attach.get(id) ?? [];
  const nextTrail = [...trail, id];
  const singleReal = next.length === 1 && !graph.joins.has(next[0].to);
  const singleJoin = next.length === 1 && graph.joins.has(next[0].to);
  const branch = next.length > 1;
  return (
    <Stack gap={0}>
      <FlowStep node={node} wide={wide} loops={graph.backsFrom.get(id) ?? []} byId={graph.byId} />
      {singleReal ? (
        <>
          <FlowArrow label={next[0].label} wide={wide} />
          <FlowTree id={next[0].to} graph={graph} wide={wide} asJoin={false} trail={nextTrail} />
        </>
      ) : null}
      {singleJoin ? (
        <>
          <FlowArrow label={next[0].label} wide={wide} />
          <div style={wide ? { width: 240 } : undefined}>
            <JoinStub title={graph.byId.get(next[0].to)?.title ?? next[0].to} />
          </div>
        </>
      ) : null}
      {branch ? (
        <>
          <FlowArrow wide={wide} />
          <BranchColumns edges={next} graph={graph} trail={nextTrail} />
        </>
      ) : null}
      {attached.map((joinId) => (
        <Stack key={joinId} gap={0}>
          <MergeCaption joinId={joinId} graph={graph} />
          <FlowTree id={joinId} graph={graph} wide={wide} asJoin trail={nextTrail} />
        </Stack>
      ))}
    </Stack>
  );
}

function Flowchart({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  const graph = buildFlowGraph(nodes, edges);
  const roots = nodes.filter((node) => {
    let incoming = 0;
    for (const next of graph.outs.values()) {
      if (next.some((edge) => edge.to === node.id)) incoming += 1;
    }
    return incoming === 0;
  });
  return (
    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
      <Stack gap={16}>
        {roots.map((node) => (
          <FlowTree key={node.id} id={node.id} graph={graph} wide asJoin={false} trail={[]} />
        ))}
      </Stack>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const theme = useHostTheme();
  return (
    <pre
      style={{
        margin: 0,
        padding: 16,
        background: theme.bg.elevated,
        color: theme.text.primary,
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
      }}
    >
      {code}
    </pre>
  );
}

function onPanelResizePointerDown(
  event: { clientY: number; pointerId: number; currentTarget: HTMLDivElement; preventDefault: () => void },
  height: number,
  setHeight: (next: number) => void,
) {
  event.preventDefault();
  const startY = event.clientY;
  const startHeight = height;
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const move = (ev: PointerEvent) => {
    setHeight(Math.min(2000, Math.max(280, Math.round(startHeight + ev.clientY - startY))));
  };
  const stop = (ev: PointerEvent) => {
    if (handle.hasPointerCapture(ev.pointerId)) handle.releasePointerCapture(ev.pointerId);
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", stop);
    handle.removeEventListener("pointercancel", stop);
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
}

export default function ArchitectureXrayTemplate() {
  const theme = useHostTheme();
  const [index, setIndex] = useState(0);
  const [panelHeight, setPanelHeight] = useState(520);
  const count = MODULES.length;

  return (
    <Stack gap={28} style={{ padding: 24 }}>
      <Stack gap={14}>
        <H1>1. 项目名</H1>
        <Point text="一句话说清它是什么。后面写给谁用，做成了哪一类产品。" />
        <Stack gap={4}>
          <H3>实现了什么</H3>
          <Point text="这个项目实际交付的能力。写人能拿去用的东西。不写模块调用顺序。" />
        </Stack>
        <Stack gap={4}>
          <H3>解决什么问题</H3>
          <Point text="没有它时卡在哪里。有了它之后那件事可以怎么做。" />
        </Stack>
        <Stack gap={4}>
          <H3>实际场景</H3>
          <Point text="列出这个项目真正会被拿去用的几件事。每件写谁在什么情况下用它做什么。" />
        </Stack>
      </Stack>

      <Stack gap={20}>
        <H2>2. 模块如何协同</H2>
        <Point text="从总体业务讲一件事怎么走完。每一步只写到模块：接到什么、做成什么、交给谁。方法放在下一节。" />
        {EXAMPLES.map((example) => (
          <Stack key={example.title} gap={8}>
            <H3>{example.title}</H3>
            <Point text={example.background} />
            <AlignedFlow
              nodeWidth={188}
              steps={example.steps.map((step, stepIndex) => ({
                title: step.module,
                note: example.notes[stepIndex] ?? "",
                inside: example.insides[stepIndex] ?? "",
                handoff: stepIndex < example.steps.length - 1 ? step.handoff : undefined,
              }))}
            />
          </Stack>
        ))}
      </Stack>

      <Stack gap={12}>
        <H2>3. 业务模块</H2>
        <ArchitectureMap />
        <Text tone="secondary">点选一个模块，查看它对外提供什么能力、内部怎么走。</Text>
        <Row gap={8} wrap>
          {MODULES.map((item, itemIndex) => (
            <Pill key={item.id} active={itemIndex === index} onClick={() => setIndex(itemIndex)}>
              {item.label}
            </Pill>
          ))}
        </Row>
        <div
          style={{
            border: `1px solid ${theme.stroke.secondary}`,
            borderRadius: 8,
            background: theme.bg.editor,
          }}
        >
          <div style={{ height: panelHeight, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                height: "100%",
                width: `${count * 100}%`,
                transform: `translateX(-${index * (100 / count)}%)`,
                transition: "transform 280ms ease",
              }}
            >
              {MODULES.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    width: `${100 / count}%`,
                    flexShrink: 0,
                    height: "100%",
                    overflowY: "auto",
                    boxSizing: "border-box",
                    padding: 12,
                  }}
                >
                  <Stack gap={12}>
                    <H3>{mod.title}</H3>
                    <Point text={mod.summary} />
                    <Table
                      headers={["方法", "说明", "触发时机", "输入", "输出"]}
                      rows={mod.apis.map((api) => [api.method, api.description, api.when, api.input, api.output])}
                      striped
                      style={{ fontSize: 15 }}
                    />
                    {mod.flows.map((flow) => (
                      <Stack key={flow.title} gap={8}>
                        <Text weight="semibold" style={{ fontSize: 16, color: theme.accent.primary }}>
                          {flow.title}
                        </Text>
                        <Point text={flow.background} />
                        {flow.nodes && flow.edges ? (
                          <Flowchart nodes={flow.nodes} edges={flow.edges} />
                        ) : (
                          <AlignedFlow
                            nodeWidth={300}
                            steps={(flow.steps ?? []).map((step) => ({
                              title: step.method,
                              subtitle: step.action,
                              note: step.detail,
                              inside: step.inside,
                            }))}
                          />
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </div>
              ))}
            </div>
          </div>
          <div
            onPointerDown={(event: {
              clientY: number;
              pointerId: number;
              currentTarget: HTMLDivElement;
              preventDefault: () => void;
            }) => onPanelResizePointerDown(event, panelHeight, setPanelHeight)}
            style={{
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "ns-resize",
              userSelect: "none",
              borderTop: `1px solid ${theme.stroke.tertiary}`,
              color: theme.text.tertiary,
              fontSize: 12,
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.stroke.primary }} />
            拖动调整高度
          </div>
        </div>
      </Stack>

      <Stack gap={20}>
        <H2>4. 值得细看的关键逻辑</H2>
        {LOGICS.map((logic) => (
          <Stack key={logic.title} gap={8}>
            <H3>{logic.title}</H3>
            <Point text={logic.why} />
            <CodeBlock code={logic.code} />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

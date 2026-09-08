const fs = require('fs')
const path = require('path')

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

// Simple deterministic RNG so every run is stable and reproducible.
function createRng(seed = 20260908) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const rng = createRng()

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function toDayStart(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function atTime(dayStart, hour, minute = 0) {
  return dayStart + hour * HOUR + minute * 60 * 1000
}

const names = [
  '李然',
  '王可',
  '赵航',
  '陈瑜',
  '孙诺',
  '周林',
  '吴桐',
  '郑雪',
  '冯涛',
  '蒋雯',
  '韩一',
  '唐宁'
]

const notes = ['胸', '肩', '背', '腿', '功能', '有氧', '核心', '灵活']

function buildCustomers() {
  return names.map((name, idx) => ({
    id: idx + 1,
    name,
    gender: idx % 2 === 0 ? '男' : '女',
    note: idx % 3 === 0 ? '测试客户' : '',
    remainingLessons: 0,
    createdAt: Date.now() - (30 - idx) * DAY
  }))
}

function buildSessions(customers) {
  const sessions = []
  const completedCountByCustomer = new Map(customers.map((c) => [c.id, 0]))

  let sid = 1
  const today = toDayStart(Date.now())

  // 过去 12 天：已完成课程为主
  for (let offset = 12; offset >= 1; offset--) {
    const day = today - offset * DAY
    const perDay = 2 + Math.floor(rng() * 3)

    for (let i = 0; i < perDay; i++) {
      const customer = pick(customers)
      const slot = pick([
        [9, 0],
        [10, 30],
        [14, 0],
        [15, 30],
        [17, 0],
        [19, 0],
        [20, 30]
      ])
      const start = atTime(day, slot[0], slot[1])
      sessions.push({
        id: sid++,
        customerId: customer.id,
        start,
        end: start + HOUR,
        note: `${pick(notes)}、${pick(notes)}`,
        status: 'completed',
        createdAt: start - 6 * HOUR
      })
      completedCountByCustomer.set(customer.id, completedCountByCustomer.get(customer.id) + 1)
    }
  }

  // 今天：混合 completed / pending，方便测试快捷上课与下课
  const todaySessions = [
    { hour: 10, minute: 0, status: 'completed' },
    { hour: 14, minute: 0, status: 'pending' },
    { hour: 16, minute: 0, status: 'pending' },
    { hour: 19, minute: 30, status: 'pending' }
  ]

  for (const t of todaySessions) {
    const customer = pick(customers)
    const start = atTime(today, t.hour, t.minute)
    sessions.push({
      id: sid++,
      customerId: customer.id,
      start,
      end: start + HOUR,
      note: t.status === 'completed' ? '复盘+拉伸' : '待上课测试',
      status: t.status,
      createdAt: start - 4 * HOUR
    })
    if (t.status === 'completed') {
      completedCountByCustomer.set(customer.id, completedCountByCustomer.get(customer.id) + 1)
    }
  }

  // 未来 10 天：待上课课程
  for (let offset = 1; offset <= 10; offset++) {
    const day = today + offset * DAY
    const perDay = 1 + Math.floor(rng() * 3)

    for (let i = 0; i < perDay; i++) {
      const customer = pick(customers)
      const slot = pick([
        [9, 30],
        [11, 0],
        [13, 30],
        [15, 0],
        [18, 0],
        [20, 0]
      ])
      const start = atTime(day, slot[0], slot[1])
      sessions.push({
        id: sid++,
        customerId: customer.id,
        start,
        end: start + HOUR,
        note: '待上课测试',
        status: 'pending',
        createdAt: Date.now()
      })
    }
  }

  for (const c of customers) {
    const completed = completedCountByCustomer.get(c.id) || 0
    const purchased = completed + 4 + Math.floor(rng() * 12)
    c.remainingLessons = Math.max(0, purchased - completed)
  }

  return sessions.sort((a, b) => a.start - b.start)
}

function main() {
  const customers = buildCustomers()
  const sessions = buildSessions(customers)

  const payload = {
    app: '课记CoachNote',
    version: 1,
    exportedAt: new Date().toISOString(),
    customers,
    sessions,
    settings: [
      { key: 'reminderEnabled', value: true },
      { key: 'theme', value: 'light' }
    ]
  }

  const out = path.resolve(process.cwd(), 'coachnote-mock-data.json')
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  const done = sessions.filter((s) => s.status === 'completed').length
  const pending = sessions.filter((s) => s.status === 'pending').length

  console.log(`Mock data written: ${out}`)
  console.log(`Customers: ${customers.length}`)
  console.log(`Sessions: ${sessions.length} (completed=${done}, pending=${pending})`)
}

try {
  main()
} catch (err) {
  console.error('Failed to generate mock data')
  console.error(err)
  process.exit(1)
}

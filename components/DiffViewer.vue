<script setup lang="ts">
import { ref, computed } from 'vue'
import { diffLines, type Change } from 'diff'

const props = defineProps<{
  oldText: string
  newText: string
}>()

const emit = defineEmits<{
  apply: [mergedText: string]
  cancel: []
}>()

interface DiffBlock {
  index: number
  type: 'added' | 'removed' | 'unchanged'
  lines: string[]
  accepted: boolean | null // null = 未决定, true = 接受, false = 拒绝
  pairedIndex?: number // 删除块与新增块的配对
}

const blocks = computed((): DiffBlock[] => {
  const changes: Change[] = diffLines(props.oldText, props.newText)
  const result: DiffBlock[] = []
  let idx = 0

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n')
    if (change.added) {
      result.push({ index: idx, type: 'added', lines, accepted: null })
    } else if (change.removed) {
      result.push({ index: idx, type: 'removed', lines, accepted: null })
    } else {
      result.push({ index: idx, type: 'unchanged', lines, accepted: true })
    }
    idx++
  }

  // 配对相邻的 removed + added 块
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].type === 'removed' && result[i + 1].type === 'added') {
      result[i].pairedIndex = result[i + 1].index
      result[i + 1].pairedIndex = result[i].index
    }
  }

  return result
})

const decisions = ref<Map<number, boolean>>(new Map())

function acceptBlock(blockIndex: number): void {
  const block = blocks.value.find((b) => b.index === blockIndex)
  if (!block) return

  if (block.type === 'added') {
    decisions.value.set(blockIndex, true)
    // 如果有配对的 removed 块，也标记
    if (block.pairedIndex !== undefined) {
      decisions.value.set(block.pairedIndex, true)
    }
  } else if (block.type === 'removed') {
    decisions.value.set(blockIndex, true)
    if (block.pairedIndex !== undefined) {
      decisions.value.set(block.pairedIndex, true)
    }
  }

  decisions.value = new Map(decisions.value)
}

function rejectBlock(blockIndex: number): void {
  const block = blocks.value.find((b) => b.index === blockIndex)
  if (!block) return

  if (block.type === 'added') {
    decisions.value.set(blockIndex, false)
    if (block.pairedIndex !== undefined) {
      decisions.value.set(block.pairedIndex, false)
    }
  } else if (block.type === 'removed') {
    decisions.value.set(blockIndex, false)
    if (block.pairedIndex !== undefined) {
      decisions.value.set(block.pairedIndex, false)
    }
  }

  decisions.value = new Map(decisions.value)
}

function getDecision(blockIndex: number): boolean | null {
  return decisions.value.get(blockIndex) ?? null
}

const hasUndecided = computed((): boolean => {
  return blocks.value.some(
    (b) => b.type !== 'unchanged' && getDecision(b.index) === null
  )
})

function acceptAll(): void {
  for (const block of blocks.value) {
    if (block.type !== 'unchanged') {
      decisions.value.set(block.index, true)
    }
  }
  decisions.value = new Map(decisions.value)
}

function rejectAll(): void {
  for (const block of blocks.value) {
    if (block.type !== 'unchanged') {
      decisions.value.set(block.index, false)
    }
  }
  decisions.value = new Map(decisions.value)
}

function applyMerge(): void {
  const result: string[] = []

  for (const block of blocks.value) {
    if (block.type === 'unchanged') {
      result.push(block.lines.join('\n'))
      continue
    }

    const decided = getDecision(block.index)

    if (block.type === 'added') {
      // 如果接受新增，加入
      if (decided === true) {
        result.push(block.lines.join('\n'))
      }
      // 拒绝新增则不加入
    } else if (block.type === 'removed') {
      // 如果拒绝删除（保留原文），加入
      if (decided !== true) {
        result.push(block.lines.join('\n'))
      }
      // 接受删除则不加入
    }
  }

  emit('apply', result.join('\n'))
}
</script>

<template>
  <div class="diff-viewer">
    <div class="diff-toolbar">
      <span class="diff-title">内容差异对比</span>
      <div class="diff-toolbar-actions">
        <button class="btn btn-ghost btn-xs" @click="acceptAll">全部接受</button>
        <button class="btn btn-ghost btn-xs" @click="rejectAll">全部拒绝</button>
      </div>
    </div>

    <div class="diff-body">
      <template v-for="block in blocks" :key="block.index">
        <!-- 不变的块 -->
        <div v-if="block.type === 'unchanged'" class="diff-block diff-unchanged">
          <div class="diff-lines">
            <div v-for="(line, i) in block.lines" :key="i" class="diff-line">
              <span class="diff-line-content">{{ line }}</span>
            </div>
          </div>
        </div>

        <!-- 删除的块 -->
        <div
          v-else-if="block.type === 'removed'"
          class="diff-block diff-removed"
          :class="{
            'decided-accept': getDecision(block.index) === true,
            'decided-reject': getDecision(block.index) === false
          }"
        >
          <div class="diff-block-header">
            <span class="diff-badge diff-badge-removed">删除</span>
            <div class="diff-block-actions" v-if="getDecision(block.index) === null">
              <button class="btn-decision btn-accept" title="接受删除" @click="acceptBlock(block.index)">
                <span class="i-carbon-checkmark" />
              </button>
              <button class="btn-decision btn-reject" title="保留原文" @click="rejectBlock(block.index)">
                <span class="i-carbon-close" />
              </button>
            </div>
            <span v-else class="diff-decision-label">
              {{ getDecision(block.index) ? '已删除' : '已保留' }}
            </span>
          </div>
          <div class="diff-lines">
            <div v-for="(line, i) in block.lines" :key="i" class="diff-line">
              <span class="diff-line-marker">-</span>
              <span class="diff-line-content">{{ line }}</span>
            </div>
          </div>
        </div>

        <!-- 新增的块 -->
        <div
          v-else-if="block.type === 'added'"
          class="diff-block diff-added"
          :class="{
            'decided-accept': getDecision(block.index) === true,
            'decided-reject': getDecision(block.index) === false
          }"
        >
          <div class="diff-block-header">
            <span class="diff-badge diff-badge-added">新增</span>
            <div class="diff-block-actions" v-if="getDecision(block.index) === null">
              <button class="btn-decision btn-accept" title="接受新增" @click="acceptBlock(block.index)">
                <span class="i-carbon-checkmark" />
              </button>
              <button class="btn-decision btn-reject" title="拒绝新增" @click="rejectBlock(block.index)">
                <span class="i-carbon-close" />
              </button>
            </div>
            <span v-else class="diff-decision-label">
              {{ getDecision(block.index) ? '已接受' : '已拒绝' }}
            </span>
          </div>
          <div class="diff-lines">
            <div v-for="(line, i) in block.lines" :key="i" class="diff-line">
              <span class="diff-line-marker">+</span>
              <span class="diff-line-content">{{ line }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="diff-footer">
      <button class="btn btn-ghost" @click="emit('cancel')">取消</button>
      <button class="btn btn-primary" :disabled="hasUndecided" @click="applyMerge">
        {{ hasUndecided ? '请先处理所有差异' : '确认应用' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.diff-viewer {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  background: var(--surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.diff-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--divider);
  background: var(--surface-2);
}

.diff-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.diff-toolbar-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-xs {
  height: 28px;
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
}

.diff-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
}

.diff-block {
  border-radius: var(--radius-xs);
  margin-bottom: var(--space-2);
}

.diff-unchanged {
  color: var(--text-3);
}

.diff-removed {
  background: var(--danger-bg);
  border: 1px solid rgba(197, 48, 48, 0.15);
}

.diff-added {
  background: var(--success-bg);
  border: 1px solid rgba(46, 125, 50, 0.15);
}

.diff-block.decided-accept {
  opacity: 0.6;
}

.diff-block.decided-reject {
  opacity: 0.4;
  text-decoration: line-through;
}

.diff-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--divider);
}

.diff-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-family: var(--font-ui);
}

.diff-badge-removed {
  background: rgba(197, 48, 48, 0.15);
  color: var(--danger);
}

.diff-badge-added {
  background: rgba(46, 125, 50, 0.15);
  color: var(--success);
}

.diff-block-actions {
  display: flex;
  gap: var(--space-1);
}

.btn-decision {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-accept:hover {
  background: var(--success-bg);
  color: var(--success);
  border-color: var(--success);
}

.btn-reject:hover {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger);
}

.diff-decision-label {
  font-size: 11px;
  color: var(--text-3);
  font-family: var(--font-ui);
}

.diff-lines {
  padding: var(--space-1) var(--space-2);
}

.diff-line {
  display: flex;
  gap: var(--space-2);
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-line-marker {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  color: var(--text-3);
  user-select: none;
}

.diff-line-content {
  flex: 1;
}

.diff-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--divider);
  background: var(--surface-2);
}
</style>
